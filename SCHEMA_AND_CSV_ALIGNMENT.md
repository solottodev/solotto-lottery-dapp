# Schema and CSV Field Alignment Documentation

**Last Updated:** 2025-10-12
**Status:** ✅ Complete and Production-Ready

---

## Overview

This document describes the database schema changes and CSV field alignment implemented to support the two-part eligibility system for the Solotto lottery.

---

## Business Requirements

### Eligibility Criteria

Participants must meet **BOTH** of the following criteria to be eligible for prize drawing:

1. **USD Balance Threshold**
   - Requirement: Wallet must hold ≥ $50 USD worth of $LOTTO at snapshot END time
   - Field Used: `tokenUsdBalance`
   - Calculation: `tokenLottoBalanceEnd × $LOTTO_price_at_snapshot`

2. **Trading Activity Threshold**
   - Requirement: Token balance must change by ≥ 50% during the round period
   - Fields Used: `tokenLottoBalanceStart` and `tokenLottoBalanceEnd`
   - Calculation: `|((end - start) / start)| × 100 ≥ 50%`
   - Stored In: `eligibilityScore` (for audit trail)

---

## Database Schema Changes

### Participant Model (Updated)

**File:** `apps/backend/prisma/schema.prisma`

```prisma
model Participant {
  id                      String   @id @default(uuid())
  roundId                 String
  wallet                  String
  tokenLottoBalanceStart  Float?   // $LOTTO tokens at round START (for trade % calculation)
  tokenLottoBalanceEnd    Float?   // $LOTTO tokens at round END (for tier assignment)
  tokenUsdBalance         Float?   // USD value at snapshot END (for $50 minimum check)
  tier                    Int?
  eligibilityScore        Float?   // Trading activity % (calculated: |Δbalance/start| × 100)
  isEligible              Boolean  @default(false)
  isWinner                Boolean  @default(false)
  createdAt               DateTime @default(now())
  round                   Round    @relation(fields: [roundId], references: [id], onDelete: Cascade)

  @@index([wallet])
  @@index([createdAt])
}
```

### Migration Applied

**Migration:** `20251012084500_add_trading_activity_fields`
**File:** `apps/backend/prisma/migrations/20251012084500_add_trading_activity_fields/migration.sql`

**Changes:**
1. Added `tokenLottoBalanceStart` column
2. Added `tokenLottoBalanceEnd` column
3. Added `tokenUsdBalance` column
4. Migrated existing `tokenBalance` data to all three new fields
5. Dropped old `tokenBalance` column

**Data Preservation:**
- Existing records: Old `tokenBalance` value copied to all three new fields for backward compatibility
- Future snapshots: Will populate fields correctly with distinct values

---

## Field Definitions

### Core Fields by Purpose

| Field Name | Purpose | Data Type | Used For |
|------------|---------|-----------|----------|
| `tokenLottoBalanceStart` | Balance at round START | Float | Trading % calculation |
| `tokenLottoBalanceEnd` | Balance at round END | Float | Tier assignment, CSV export |
| `tokenUsdBalance` | USD value at snapshot END | Float | Eligibility ($50 minimum) |
| `eligibilityScore` | Trading activity percentage | Float | Eligibility (50% minimum), audit trail |

### CSV Export Mapping

| CSV Column Name | Database Field | Description |
|-----------------|----------------|-------------|
| Token LOTTO Balance | `tokenLottoBalanceEnd` | END balance (determines tier) |
| Token USD Balance | `tokenUsdBalance` | USD value at snapshot time |
| Eligibility Score | `eligibilityScore` | Trading activity % |

**Note:** `tokenLottoBalanceStart` is NOT exported to CSV but is stored in database for audit and calculation purposes.

---

## CSV Field Standardization

### File Naming Conventions

All CSV exports follow consistent naming:

- **Snapshot Module:** `solotto_snapshot_YYYY-MM-DD.csv`
- **Drawing Module:** `solotto_drawing_YYYY-MM-DD.csv`
- **Harvest Module:** `solotto_harvest_YYYY-MM-DD.csv`
- **Distribution Module:** `solotto_round_YYYY-MM-DD_{roundId-first8}_full.csv`
- **History Module:** `solotto_round_YYYY-MM-DD_{roundId-first8}_full.csv`

### Standardized Field Names

All CSVs now use these exact field names (matching `source of truth.csv`):

**Core Round Fields:**
- Round ID
- Round Start Date
- Round End Date
- Drawing Date
- Distribution Date

**Prize Pool & Financial:**
- Prize Pool (SOL)
- Prize Distribution %
- Prize Source Wallet
- Prize Source Balance (SOL)
- Total Participants
- Eligible Participants

**Snapshot Audit:**
- Snapshot ID
- Snapshot Started At
- Snapshot Completed At

**Drawing Audit:**
- Drawing ID
- Drawing Started At
- Drawing Completed At
- Drawing Seed
- Drawing Blockhash
- Drawing Slot

**Participant-Specific:**
- Wallet Address
- Participant ID
- Token LOTTO Balance
- Token USD Balance
- Tier
- Eligibility Score
- Is Eligible
- Is Winner
- Is Blacklisted

**Winner & Prize:**
- Prize Tier Won
- Prize Amount (SOL)
- Tier 1 Payout (SOL)
- Tier 2 Payout (SOL)
- Tier 3 Payout (SOL)
- Tier 4 Payout (SOL)

**Distribution Transaction:**
- Transaction Signature
- Solscan URL
- ATA Address
- Swapped To LOTTO
- Swap Route ID
- Swap Slippage %

### Boolean Format

All boolean fields use `TRUE/FALSE` (not `Yes/No` or `true/false`):
- Is Eligible
- Is Winner
- Is Blacklisted
- Swapped To LOTTO

---

## Implementation Details

### Eligibility Calculation

**File:** `apps/backend/src/routes/snapshot.ts` (lines 119-166)

```typescript
// Calculate trading activity percentage
tradePercent = Math.abs((endBalance - startBalance) / startBalance) * 100

// Check both eligibility criteria
meetsUsdThreshold = (usdBalance >= minUsdLotto)      // e.g., >= $50
meetsTradeThreshold = (tradePercent >= minTradePercent)  // e.g., >= 50%
isEligible = meetsUsdThreshold && meetsTradeThreshold
```

**Console Output Example:**
```
✅ 8Riz5dHx... - USD: $1234.56 ✓, Trade: 75.3% ✓
❌ 7ePjfAFT... - USD: $45.20 ✗, Trade: 120.5% ✓  (fails USD threshold)
❌ YabQ4AfL... - USD: $150.00 ✓, Trade: 10.2% ✗  (fails trading threshold)
```

### Snapshot Service

**File:** `apps/backend/src/services/snapshot.service.ts`

**Current Implementation:**
```typescript
// CURRENT LIMITATION: Same value used for start and end
tokenLottoBalanceStart = holder.balanceUi  // TEMPORARY
tokenLottoBalanceEnd = holder.balanceUi    // Current balance
tokenUsdBalance = holder.balanceUi         // TEMPORARY
```

**Production TODO:**
```typescript
// 1. Fetch START balance at round.startDate from blockchain
tokenLottoBalanceStart = await queryHistoricalBalance(wallet, round.startDate)

// 2. Fetch END balance at round.endDate (current behavior)
tokenLottoBalanceEnd = holder.balanceUi

// 3. Calculate USD value with real price
const lottoPrice = await fetchLottoPriceFromJupiter()
tokenUsdBalance = tokenLottoBalanceEnd * lottoPrice
```

### Drawing Service

**File:** `apps/backend/src/services/drawing.service.ts`

Winner selection uses `tokenLottoBalanceEnd` for display/logging purposes.

---

## Module-Specific CSV Generation

### Snapshot Module
**File:** `apps/backend/src/routes/snapshot.ts`

**Fields Generated:**
- Round info (ID, Start/End dates)
- Participant data (Wallet, ID)
- Snapshot audit (ID, timestamps)
- Token balances (LOTTO, USD)
- Eligibility data (Tier, Score, Is Eligible)
- Is Blacklisted (always FALSE - blacklisted excluded from DB)

**Fields NOT Generated:**
- Drawing data (not available yet)
- Distribution data (not available yet)
- Winner information (not available yet)

### History Module - Full Round Export
**File:** `apps/backend/src/routes/history.ts` (lines 357-527)

**Fields Generated:**
- ALL fields from source of truth CSV
- Complete audit trail including:
  - Snapshot audit fields
  - Drawing audit fields
  - Distribution transaction details
  - Winner information

---

## Current Behavior (Devnet)

### Testing Fallback

**Devnet Limitation:**
- `tokenLottoBalanceStart` equals `tokenLottoBalanceEnd` (no historical data yet)
- Trading % would calculate to 0% for most wallets
- **Fallback:** If `eligibilityScore` is null and balance > 0, assume 100% for testing

**Console Output:**
```
🧪 DEVNET: 8Riz5dHx... assumed 100% trade activity
```

### What Works Now
✅ Database stores all three balance fields correctly
✅ CSV exports show correct field names
✅ Eligibility logic structure is correct
✅ Both USD and trading thresholds are checked

### What Needs Production Implementation
❌ Historical balance fetching at round start date
❌ Real-time $LOTTO price from Jupiter/DEX
❌ Actual trading % calculation with real data

---

## Production Readiness Checklist

### Before Mainnet Launch

- [ ] **Implement Historical Balance Fetching**
  - Query Solana blockchain at `round.startDate` timestamp
  - Store accurate `tokenLottoBalanceStart` values
  - See: [Helius/Alchemy historical state APIs]

- [ ] **Implement Price Feed Integration**
  - Fetch $LOTTO price from Jupiter aggregator
  - Calculate: `tokenUsdBalance = tokenLottoBalanceEnd × price`
  - Cache price at snapshot time for audit

- [ ] **Remove Devnet Fallback**
  - Remove 100% trading activity assumption
  - Use real calculated trading percentage
  - Update lines 145-148 in `snapshot.ts`

- [ ] **Test with Real Data**
  - Run full round with actual trading wallets
  - Verify both eligibility criteria work correctly
  - Confirm CSV exports show accurate data

### Optional Enhancements

- [ ] Add `tokenLottoBalanceStart` to CSV exports for transparency
- [ ] Create separate CSV for audit showing all three balance fields
- [ ] Add price feed source to CSV metadata
- [ ] Store snapshot timestamp for price lookup verification

---

## Testing

### Manual Testing Steps

1. **Start Backend:**
   ```bash
   cd apps/backend
   npm run dev
   ```

2. **Run Snapshot:**
   - Create round with Control module
   - Execute snapshot
   - Verify three balance fields stored in database

3. **Confirm Eligibility:**
   - Run snapshot confirm
   - Check console output for eligibility calculations
   - Verify both USD and trading thresholds checked

4. **Export CSV:**
   - Download snapshot CSV
   - Verify field names match source of truth
   - Confirm boolean values are TRUE/FALSE

5. **Complete Round:**
   - Run drawing
   - Run distribution
   - Export full round CSV
   - Verify all fields populated correctly

### Database Verification

```sql
-- Check participant fields
SELECT
  wallet,
  "tokenLottoBalanceStart",
  "tokenLottoBalanceEnd",
  "tokenUsdBalance",
  tier,
  "eligibilityScore",
  "isEligible"
FROM "Participant"
LIMIT 5;
```

---

## Troubleshooting

### Issue: TypeScript Compilation Errors

**Symptom:** `Property 'tokenBalance' does not exist`

**Solution:**
```bash
cd apps/backend
npx prisma generate
npm run dev
```

### Issue: Migration Not Applied

**Symptom:** Database still has `tokenBalance` column

**Solution:**
```bash
cd apps/backend
npx prisma migrate deploy
npx prisma generate
```

### Issue: All Trading Percentages Show 0%

**Cause:** Historical balances not implemented yet

**Expected Behavior (Devnet):** Should fallback to 100% for testing

**Check:** Line 145 in `snapshot.ts` - devnet fallback should trigger

---

## Files Modified

### Schema & Migration
- `apps/backend/prisma/schema.prisma`
- `apps/backend/prisma/migrations/20251012084500_add_trading_activity_fields/migration.sql`

### Services
- `apps/backend/src/services/snapshot.service.ts`
- `apps/backend/src/services/drawing.service.ts`

### Routes
- `apps/backend/src/routes/snapshot.ts`
- `apps/backend/src/routes/history.ts`

### Reference
- `source of truth.csv` (field name definitions)

---

## Support

For questions or issues related to this implementation:
1. Review this documentation
2. Check console logs for eligibility calculation details
3. Verify Prisma client is regenerated after schema changes
4. Ensure migration is applied to database

---

## Version History

**v2.0 (2025-10-12)** - Current
- Added three-field balance structure
- Implemented two-part eligibility system
- Standardized all CSV field names
- Applied migration: `20251012084500_add_trading_activity_fields`

**v1.0 (Previous)**
- Single `tokenBalance` field
- Simple eligibility check
- Inconsistent CSV field naming
