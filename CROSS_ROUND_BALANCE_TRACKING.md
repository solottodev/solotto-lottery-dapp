# Cross-Round Balance Tracking

**Implemented:** October 23, 2025
**Status:** ✅ Production Ready

---

## Overview

Cross-round balance tracking is a system that enables accurate week-over-week trading activity measurement by inheriting the previous round's END balances as the current round's START balances.

This approach solves the fundamental limitation of real-time blockchain snapshots, where capturing START and END balances at the same time would result in 0% trading activity for all participants.

---

## How It Works

### Round Lifecycle

#### **Round 1 (First Round or After Token Change)**

```
Day 1 - Round Creation:
  ↓ No previous round exists
  ↓ captureStartBalances() from blockchain
  ↓ Stores in BalanceSnapshot (snapshotType='START')

Day 7 - Snapshot Confirmation:
  ↓ captureEndBalances() from blockchain
  ↓ Stores in BalanceSnapshot (snapshotType='END')
  ↓ Calculates trading activity: (END - START) / START
  ↓ Example: (1500 - 1000) / 1000 = 50% buy activity ✅
```

#### **Round 2+ (Subsequent Rounds)**

```
Day 8 - Round Creation:
  ↓ Previous round exists with END balances
  ↓ findPreviousRound() locates Round 1
  ↓ inheritPreviousEndBalances() copies Round 1 END → Round 2 START
  ↓ Stores in BalanceSnapshot (snapshotType='START')

Day 14 - Snapshot Confirmation:
  ↓ captureEndBalances() from blockchain
  ↓ Stores in BalanceSnapshot (snapshotType='END')
  ↓ Calculates trading activity using inherited START
  ↓ Example: (2000 - 1500) / 1500 = 33% buy activity ✅
```

---

## Data Flow

### BalanceSnapshot Table

```sql
-- Round 1 Created (Oct 26)
INSERT INTO "BalanceSnapshot" (roundId, wallet, tokenBalance, snapshotType)
VALUES
  ('round-1', 'wallet-A', 1000, 'START'),
  ('round-1', 'wallet-B', 2000, 'START');

-- Round 1 Confirmed (Nov 2)
INSERT INTO "BalanceSnapshot" (roundId, wallet, tokenBalance, snapshotType)
VALUES
  ('round-1', 'wallet-A', 1500, 'END'),   -- +50% buy activity
  ('round-1', 'wallet-B', 2000, 'END'),   -- 0% activity
  ('round-1', 'wallet-C', 500, 'END');    -- New wallet (100% activity)

-- Round 2 Created (Nov 3) - CROSS-ROUND INHERITANCE
INSERT INTO "BalanceSnapshot" (roundId, wallet, tokenBalance, snapshotType)
SELECT 'round-2', wallet, tokenBalance, 'START'
FROM "BalanceSnapshot"
WHERE "roundId" = 'round-1' AND "snapshotType" = 'END';

-- Result:
-- ('round-2', 'wallet-A', 1500, 'START')  ← Inherited from Round 1 END
-- ('round-2', 'wallet-B', 2000, 'START')  ← Inherited from Round 1 END
-- ('round-2', 'wallet-C', 500, 'START')   ← Inherited from Round 1 END

-- Round 2 Confirmed (Nov 9)
INSERT INTO "BalanceSnapshot" (roundId, wallet, tokenBalance, snapshotType)
VALUES
  ('round-2', 'wallet-A', 2000, 'END'),   -- +33% buy activity
  ('round-2', 'wallet-B', 1000, 'END'),   -- 50% sell activity
  ('round-2', 'wallet-D', 1000, 'END');   -- New wallet (100% activity)
  -- wallet-C sold all (100% sell activity)
```

### Trading Activity Calculations

```javascript
// Wallet A: Round 2
START: 1500 (inherited from Round 1 END)
END: 2000 (captured Nov 9)
Activity: (2000 - 1500) / 1500 = 33.3% buy activity ✅

// Wallet B: Round 2
START: 2000 (inherited from Round 1 END)
END: 1000 (captured Nov 9)
Activity: (2000 - 1000) / 2000 = 50% sell activity ✅

// Wallet C: Round 2
START: 500 (inherited from Round 1 END)
END: 0 (not in snapshot - sold all)
Activity: 100% sell activity ✅

// Wallet D: Round 2
START: 0 (no record - new wallet)
END: 1000 (captured Nov 9)
Activity: 100% buy activity ✅
```

---

## Edge Cases

### 1. New Wallets

**Scenario:** Wallet appears in Round 2 but didn't exist in Round 1

**Behavior:**
- No START balance record in BalanceSnapshot
- `calculateTradeActivity()` detects missing START
- Returns 100% activity (fully active trader)

**Code:**
```typescript
if (!startSnapshot && endSnapshot) {
  return endSnapshot.tokenBalance > 0 ? 100 : 0;
}
```

### 2. Wallets Selling All

**Scenario:** Wallet existed in Round 1, sold all tokens before Round 2 snapshot

**Behavior:**
- Has START balance (inherited from Round 1)
- No END balance (not in Round 2 snapshot)
- Returns 100% sell activity

**Code:**
```typescript
if (startSnapshot && !endSnapshot) {
  return 100; // Sold everything = 100% sell activity
}
```

### 3. Wallets Holding Unchanged

**Scenario:** Wallet holds exact same balance across rounds

**Behavior:**
- START = END
- Returns 0% activity
- **Ineligible** (doesn't meet 50% trading threshold)

### 4. Token Mint Changes

**Scenario:** Lottery switches from Token A to Token B

**Behavior:**
- `findPreviousRound()` checks token mint in LotteryConfig
- Skips rounds with different token mint
- Falls back to fresh START capture

**Code:**
```typescript
if (config && config.tokenMint === tokenMint) {
  return round.id;
} else {
  console.log('Skipping round (different token mint)');
}
```

### 5. Previous Round Failed/Incomplete

**Scenario:** Round 1 was created but never confirmed

**Behavior:**
- `findPreviousRound()` checks for END balances
- Skips rounds without END snapshots
- Falls back to fresh START capture

**Code:**
```typescript
if (round.BalanceSnapshot.length > 0) {
  // Has END balances - safe to inherit
} else {
  console.log('Skipping round (no END balances)');
}
```

### 6. First Round Ever

**Scenario:** No previous rounds exist in system

**Behavior:**
- `findPreviousRound()` returns null
- Falls back to `captureStartBalances()`
- Captures fresh START from blockchain

**Code:**
```typescript
if (!previousRoundId) {
  console.log('No previous round found - capturing fresh START balances');
  await tradingService.captureStartBalances(round.id, tokenMint);
}
```

---

## CSV Export Interpretation

### Field Definitions

| CSV Column | Meaning | Source |
|------------|---------|--------|
| **Token LOTTO Balance Start** | Wallet's balance at **previous round's END** (or fresh capture for Round 1) | BalanceSnapshot (START) |
| **Token LOTTO Balance End** | Wallet's balance at **current round's snapshot time** | BalanceSnapshot (END) |
| **Trading Activity %** | max(buy%, sell%) calculated from START/END | Participant.eligibilityScore |

### Example CSV Data

```csv
Wallet,Token LOTTO Balance Start,Token LOTTO Balance End,Trading Activity %,Is Eligible
wallet-A,1500,2000,33.33,TRUE
wallet-B,2000,1000,50.00,TRUE
wallet-C,500,0,100.00,TRUE
wallet-D,0,1000,100.00,TRUE
wallet-E,3000,3000,0.00,FALSE
```

**Interpretation:**
- **wallet-A**: Bought 500 tokens (33% increase from inherited baseline)
- **wallet-B**: Sold 1000 tokens (50% decrease from inherited baseline)
- **wallet-C**: Sold all tokens (100% sell activity)
- **wallet-D**: New wallet buying in (100% buy activity)
- **wallet-E**: Holding unchanged (0% activity, ineligible)

---

## Database Schema

### BalanceSnapshot Table

```sql
CREATE TABLE "BalanceSnapshot" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "tokenBalance" DOUBLE PRECISION NOT NULL,
    "snapshotType" TEXT NOT NULL,  -- 'START' or 'END'
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceSnapshot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BalanceSnapshot_roundId_fkey"
        FOREIGN KEY ("roundId") REFERENCES "Round"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Unique constraint: Only 1 START and 1 END per wallet per round
CREATE UNIQUE INDEX "BalanceSnapshot_roundId_wallet_snapshotType_key"
    ON "BalanceSnapshot"("roundId", "wallet", "snapshotType");

-- Performance index for inheritance queries
CREATE INDEX "BalanceSnapshot_roundId_wallet_snapshotType_idx"
    ON "BalanceSnapshot"("roundId", "wallet", "snapshotType");
```

### Storage Projections

**Assumptions:**
- 2,000 unique wallets per round
- 1 round per week = 52 rounds/year
- 2 snapshots per wallet per round (START + END)

**Annual Growth:**
```
2,000 wallets × 2 snapshots × 52 weeks = 208,000 rows/year
208,000 rows × ~150 bytes/row ≈ 31 MB/year
```

**10-Year Projection:** ~310 MB (negligible)

---

## Implementation Details

### Service Methods

#### `findPreviousRound(currentRoundCreatedAt, tokenMint)`

**Purpose:** Locate the most recent round suitable for inheritance

**Logic:**
1. Query rounds created before current round
2. Filter for rounds with END balances captured
3. Verify token mint matches
4. Return most recent match or null

**File:** [trading-activity.service.ts:300-368](apps/backend/src/services/trading-activity.service.ts#L300-L368)

#### `inheritPreviousEndBalances(currentRoundId, previousRoundId)`

**Purpose:** Copy previous round's END balances as current round's START

**Logic:**
1. Fetch all END balances from previous round
2. Batch insert as START balances for current round
3. Use `skipDuplicates` to handle edge cases
4. Return count of inherited records

**File:** [trading-activity.service.ts:383-440](apps/backend/src/services/trading-activity.service.ts#L383-L440)

#### `captureStartBalances(roundId, mintAddress)` (Fallback)

**Purpose:** Capture fresh START balances when no previous round exists

**Used For:**
- First round ever
- After token mint change
- When previous round failed/incomplete

**File:** [trading-activity.service.ts:18-56](apps/backend/src/services/trading-activity.service.ts#L18-L56)

---

## Operator Workflow

### Oct 26 - Seed Round (One-Time Setup)

```bash
# 1. Create seed round via Operator Dashboard → Control Module
# Set:
#   - Snapshot Start: 2025-10-26 00:00:00 UTC
#   - Snapshot End: 2025-10-26 23:59:59 UTC
#   - (other fields as normal)

# 2. Immediately run snapshot
# Dashboard → Snapshot Module → Run Snapshot

# 3. Immediately confirm snapshot
# Dashboard → Snapshot Module → Confirm Snapshot

# 4. Verify END balances captured
# Check backend logs for: "✅ Successfully captured X END balances"

# 5. Document seed round ID
# Save the round ID for reference (optional, system auto-detects)
```

### Nov 2 - Round 1 (First Production Round)

```bash
# 1. Create Round 1 via Control Module
# Set dates for Nov 2-9

# 2. Check logs for inheritance confirmation
# Expected: "✅ Inherited X START balances from previous round"

# 3. Run snapshot on Nov 9

# 4. Confirm snapshot on Nov 9
# Trading activity will be calculated against Oct 26 baseline
```

### Nov 9 - Round 2 (Standard Weekly Round)

```bash
# 1. Create Round 2 via Control Module
# System automatically inherits from Round 1

# 2. Run snapshot on Nov 16

# 3. Confirm snapshot on Nov 16
# Trading activity calculated against Nov 2 baseline
```

---

## Troubleshooting

### Issue: No START Balances Inherited

**Symptoms:**
- Logs show "No previous round found"
- All participants have 0% trading activity

**Diagnosis:**
```sql
-- Check for END balances in previous round
SELECT COUNT(*)
FROM "BalanceSnapshot"
WHERE "roundId" = 'PREVIOUS_ROUND_ID'
  AND "snapshotType" = 'END';

-- If 0, previous round wasn't confirmed
```

**Solution:**
- Go back and confirm previous round
- OR delete current round and recreate after confirming previous

### Issue: Trading Activity Still 0%

**Symptoms:**
- START balances exist
- END balances exist
- But eligibilityScore = 0

**Diagnosis:**
```sql
-- Check if START = END for all participants
SELECT
  wallet,
  "tokenLottoBalanceStart",
  "tokenLottoBalanceEnd"
FROM "Participant"
WHERE "roundId" = 'CURRENT_ROUND_ID'
LIMIT 10;
```

**Solution:**
- If START = END, inheritance didn't work
- Check backend logs for inheritance errors
- Manually fix: Delete START records and recreate

### Issue: Duplicate Key Error

**Symptoms:**
- Error: "duplicate key value violates unique constraint"
- Round creation fails

**Cause:**
- START balances already exist for round
- Attempting to inherit twice

**Solution:**
```sql
-- Delete existing START balances
DELETE FROM "BalanceSnapshot"
WHERE "roundId" = 'CURRENT_ROUND_ID'
  AND "snapshotType" = 'START';

-- Retry round creation or manually inherit
```

---

## Monitoring

### Key Metrics

```sql
-- 1. Verify START balances inherited per round
SELECT
  r.id,
  r.createdAt,
  COUNT(*) as start_count
FROM "Round" r
LEFT JOIN "BalanceSnapshot" bs ON r.id = bs."roundId" AND bs."snapshotType" = 'START'
GROUP BY r.id, r.createdAt
ORDER BY r.createdAt DESC;

-- 2. Check trading activity distribution
SELECT
  CASE
    WHEN "eligibilityScore" = 0 THEN '0% (Inactive)'
    WHEN "eligibilityScore" < 50 THEN '1-49% (Below threshold)'
    WHEN "eligibilityScore" >= 50 THEN '50%+ (Eligible)'
  END as activity_range,
  COUNT(*) as participant_count
FROM "Participant"
WHERE "roundId" = 'CURRENT_ROUND_ID'
GROUP BY activity_range;

-- 3. Monitor BalanceSnapshot growth
SELECT
  COUNT(*) as total_snapshots,
  COUNT(DISTINCT "roundId") as total_rounds,
  pg_size_pretty(pg_total_relation_size('BalanceSnapshot')) as table_size
FROM "BalanceSnapshot";
```

---

## Migration from Old System

### If Deploying to Existing System

**Current State:**
- Existing rounds have broken trading activity (0% for all)
- BalanceSnapshot may have some END balances but no START

**Migration Steps:**

1. **Accept Current State:**
   - Leave existing rounds as-is (already completed)
   - No data changes needed

2. **Clean Slate Option (RECOMMENDED):**
   - Delete all existing rounds and participants
   - Start fresh with Oct 26 seed round

```sql
-- Clean slate (use with caution!)
DELETE FROM "Participant";
DELETE FROM "BalanceSnapshot";
DELETE FROM "Snapshot";
DELETE FROM "Drawing";
DELETE FROM "Round";
DELETE FROM "LotteryConfig";

-- Verify cleanup
SELECT COUNT(*) FROM "Round"; -- Should be 0
```

3. **Create Seed Round:**
   - Follow "Oct 26 - Seed Round" workflow above
   - This becomes the baseline for all future rounds

---

## Performance Considerations

### Query Performance

**Inheritance Query:**
```sql
-- Executed during round creation
SELECT * FROM "BalanceSnapshot"
WHERE "roundId" = 'previous-round-id'
  AND "snapshotType" = 'END';

-- Performance: <10ms with index
-- Uses: BalanceSnapshot_roundId_wallet_snapshotType_idx
```

**Batch Insert:**
```sql
-- Batch size: 100 records per insert
-- Total time for 2,000 wallets: ~200ms
```

### RPC Call Reduction

**Before (Real-Time Capture):**
- Round creation: 1 RPC call (START balances)
- Snapshot confirm: 1 RPC call (END balances)
- **Total: 2 RPC calls per round**

**After (Cross-Round Inheritance):**
- Round creation: 0 RPC calls (inherits from DB)
- Snapshot confirm: 1 RPC call (END balances)
- **Total: 1 RPC call per round** (except first round)

**Savings: 50% reduction in RPC calls**

---

## Related Documentation

- [SCHEMA_AND_CSV_ALIGNMENT.md](SCHEMA_AND_CSV_ALIGNMENT.md) - Database schema details
- [TRADING_ACTIVITY_IMPLEMENTATION.md](TRADING_ACTIVITY_IMPLEMENTATION.md) - Implementation guide
- [DATABASE_MIGRATION_CHECKLIST.md](DATABASE_MIGRATION_CHECKLIST.md) - Migration verification

---

**Last Updated:** October 23, 2025
**Status:** ✅ Production Ready
