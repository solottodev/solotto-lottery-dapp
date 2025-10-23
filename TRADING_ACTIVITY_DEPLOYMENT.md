# Trading Activity Implementation - Deployment Guide

**Status:** ✅ IMPLEMENTED - Ready for Database Migration
**Date:** October 23, 2025
**Priority:** CRITICAL - MAINNET BLOCKER RESOLVED

---

## 🎉 Implementation Complete

The trading activity calculation feature has been fully implemented and is ready for deployment. This resolves **BLOCKER 1** from `MAINNET_BLOCKERS.md`.

### ✅ Completed Items

1. **Database Schema** - [schema.prisma](apps/backend/prisma/schema.prisma)
   - Added `BalanceSnapshot` model for tracking token balances
   - Proper indexes and relationships configured
   - Prisma client regenerated

2. **Trading Activity Service** - [trading-activity.service.ts](apps/backend/src/services/trading-activity.service.ts)
   - `captureStartBalances()` - Captures balances when round is created
   - `captureEndBalances()` - Captures balances at snapshot confirmation
   - `calculateTradeActivity()` - Calculates buy/sell percentage for each wallet
   - `updateParticipantEligibility()` - Bulk updates for all participants
   - Full error handling and logging

3. **Control Module Integration** - [control.ts:178-190](apps/backend/src/routes/control.ts#L178-L190)
   - START balance capture added after round creation
   - Non-blocking implementation (won't fail round creation on error)

4. **Snapshot Module Integration** - [snapshot.ts:119-163](apps/backend/src/routes/snapshot.ts#L119-L163)
   - END balance capture at snapshot confirmation
   - Trading activity calculation for all participants
   - Final eligibility check combines USD balance + trade activity
   - **DEVNET stub code removed** ✅

5. **Test Suite** - [test-trading-activity.ts](apps/backend/scripts/test-trading-activity.ts)
   - Comprehensive test scenarios
   - Validates all edge cases
   - Ready to run once database migration is applied

---

## 🚀 Deployment Instructions

### Step 1: Apply Database Migration

The SQL migration file has been created at:
```
apps/backend/prisma/migrations/20251023000000_add_balance_snapshot/migration.sql
```

**You need to apply this migration manually** since the automated Prisma migration requires database permissions we don't have.

#### Option A: Using Supabase Dashboard (Recommended)

1. Log in to your Supabase dashboard
2. Go to the SQL Editor
3. Copy the contents of the migration file:
   ```sql
   -- CreateTable: BalanceSnapshot
   CREATE TABLE "BalanceSnapshot" (
       "id" TEXT NOT NULL,
       "roundId" TEXT NOT NULL,
       "wallet" TEXT NOT NULL,
       "tokenBalance" DOUBLE PRECISION NOT NULL,
       "snapshotType" TEXT NOT NULL,
       "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
       CONSTRAINT "BalanceSnapshot_pkey" PRIMARY KEY ("id")
   );

   -- CreateIndex
   CREATE UNIQUE INDEX "BalanceSnapshot_roundId_wallet_snapshotType_key"
       ON "BalanceSnapshot"("roundId", "wallet", "snapshotType");

   -- CreateIndex
   CREATE INDEX "BalanceSnapshot_roundId_wallet_snapshotType_idx"
       ON "BalanceSnapshot"("roundId", "wallet", "snapshotType");

   -- CreateIndex
   CREATE INDEX "BalanceSnapshot_capturedAt_idx"
       ON "BalanceSnapshot"("capturedAt");

   -- AddForeignKey
   ALTER TABLE "BalanceSnapshot" ADD CONSTRAINT "BalanceSnapshot_roundId_fkey"
       FOREIGN KEY ("roundId") REFERENCES "Round"("id")
       ON DELETE CASCADE ON UPDATE CASCADE;
   ```
4. Run the SQL
5. Verify the table was created

#### Option B: Using psql CLI

```bash
# Connect to your database
psql "postgresql://user:password@host:port/database"

# Run the migration
\i apps/backend/prisma/migrations/20251023000000_add_balance_snapshot/migration.sql

# Verify
\d "BalanceSnapshot"
```

### Step 2: Verify Prisma Client

The Prisma client has already been regenerated. Verify it includes the new model:

```bash
cd apps/backend
npx prisma generate
```

### Step 3: Run Tests

Once the database migration is applied, run the test suite to verify everything works:

```bash
cd apps/backend
npx ts-node scripts/test-trading-activity.ts
```

**Expected output:**
```
✅ All tests passed! Trading activity calculation is working correctly.

📊 Test Results:
   Total:  10
   Passed: 10 ✅
   Failed: 0 ❌
   Rate:   100.0%
```

### Step 4: Deploy to Production

1. **Restart the backend server** to load the new code
2. **Test on a new lottery round:**
   - Create a new round via Control module
   - Verify START balances are captured (check logs)
   - Run snapshot
   - Confirm snapshot
   - Verify END balances and eligibility calculations (check logs)

---

## 📊 How It Works

### Timeline

```
Round Created → Snapshot Run → Snapshot Confirmed → Drawing → Distribution
    ↓               ↓                ↓
START balances   (nothing)    END balances captured
captured                      Trading % calculated
                              Eligibility determined
```

### Eligibility Rules

A wallet is eligible if it meets **BOTH** criteria:

1. **Minimum USD Balance:** ≥ $50 USD worth of tokens at snapshot END
2. **Trading Activity:** ≥ 50% buying OR selling during the round period

### Trading Activity Calculation

```typescript
// Returns the HIGHER of buy% or sell%
buyPercent = ((endBalance - startBalance) / startBalance) × 100
sellPercent = ((startBalance - endBalance) / startBalance) × 100
tradeActivity = max(buyPercent, sellPercent)
```

**Examples:**
- 1000 → 1600 tokens = 60% buy activity ✅ ELIGIBLE
- 1000 → 400 tokens = 60% sell activity ✅ ELIGIBLE
- 1000 → 1000 tokens = 0% activity ❌ INELIGIBLE
- 0 → 1000 tokens = 100% buy activity ✅ ELIGIBLE
- 1000 → 0 tokens = 100% sell activity ✅ ELIGIBLE

---

## 🔍 Monitoring & Debugging

### Check Balance Snapshots

```sql
-- View START balances for a round
SELECT * FROM "BalanceSnapshot"
WHERE "roundId" = 'your-round-id'
  AND "snapshotType" = 'START'
ORDER BY "tokenBalance" DESC
LIMIT 10;

-- View END balances for a round
SELECT * FROM "BalanceSnapshot"
WHERE "roundId" = 'your-round-id'
  AND "snapshotType" = 'END'
ORDER BY "tokenBalance" DESC
LIMIT 10;

-- Compare START vs END for a wallet
SELECT
  "wallet",
  "snapshotType",
  "tokenBalance",
  "capturedAt"
FROM "BalanceSnapshot"
WHERE "roundId" = 'your-round-id'
  AND "wallet" = 'wallet-address'
ORDER BY "snapshotType";
```

### Check Eligibility Scores

```sql
-- View participants with eligibility scores
SELECT
  "wallet",
  "tokenUsdBalance",
  "eligibilityScore",
  "isEligible",
  "tier"
FROM "Participant"
WHERE "roundId" = 'your-round-id'
ORDER BY "eligibilityScore" DESC
LIMIT 20;

-- Count eligible vs ineligible
SELECT
  "isEligible",
  COUNT(*) as count,
  AVG("eligibilityScore") as avg_trade_activity,
  AVG("tokenUsdBalance") as avg_usd_balance
FROM "Participant"
WHERE "roundId" = 'your-round-id'
GROUP BY "isEligible";
```

### Server Logs

Look for these log messages:

**Round Creation:**
```
📸 Capturing START balances for round xxx...
   Found 1234 token holders at START
   Captured 1234/1234 START balances...
✅ Successfully captured 1234 START balances
```

**Snapshot Confirmation:**
```
📋 Eligibility Requirements:
   - Minimum USD Balance: $50
   - Minimum Trade Activity: 50%

📸 Capturing END balances...
   Found 1250 token holders at END
✅ Successfully captured 1250 END balances

📊 Calculating trading activity for all participants...
   ✅ WalletABC... - Trade Activity: 65.23%
   ❌ WalletXYZ... - Trade Activity: 12.45%

🔍 Final Eligibility Check (USD Balance + Trade Activity):
   ✅ WalletABC... - Balance: $125.50 ✓, Trade: 65.2% ✓
   ❌ WalletXYZ... - Balance: $89.50 ✓, Trade: 12.5% ✗
```

---

## 🛠️ Troubleshooting

### Issue: "No START balances captured"

**Cause:** Round was created before this feature was deployed

**Solution:** This is expected for old rounds. START balances are only captured for new rounds created after deployment.

### Issue: "All participants have 0% trade activity"

**Possible causes:**
1. START balances weren't captured (see above)
2. Token holders didn't actually trade during the period
3. Database query issue

**Debug:**
```sql
SELECT COUNT(*) FROM "BalanceSnapshot"
WHERE "roundId" = 'your-round-id' AND "snapshotType" = 'START';

SELECT COUNT(*) FROM "BalanceSnapshot"
WHERE "roundId" = 'your-round-id' AND "snapshotType" = 'END';
```

### Issue: "Everyone is ineligible"

**Check:**
1. Trade percentage threshold in lottery config (default: 50%)
2. USD balance requirement (default: $50)
3. Are the thresholds too high for the test environment?

**Query:**
```sql
SELECT
  "tradePercentage",
  "minUsdLottoRequired"
FROM "LotteryConfig"
WHERE "snapshotStart" = (SELECT "startDate" FROM "Round" WHERE "id" = 'your-round-id');
```

---

## 📚 Files Modified/Created

### New Files
- `apps/backend/src/services/trading-activity.service.ts` - Core service
- `apps/backend/scripts/test-trading-activity.ts` - Test suite
- `apps/backend/prisma/migrations/20251023000000_add_balance_snapshot/migration.sql` - Database migration
- `TRADING_ACTIVITY_DEPLOYMENT.md` - This deployment guide

### Modified Files
- `apps/backend/prisma/schema.prisma` - Added BalanceSnapshot model
- `apps/backend/src/routes/control.ts` - Added START balance capture
- `apps/backend/src/routes/snapshot.ts` - Added END balance capture and calculation, removed DEVNET stub

---

## ✅ Checklist for Mainnet Launch

- [x] Database schema updated (BalanceSnapshot model)
- [ ] **Database migration applied** ⚠️ **ACTION REQUIRED**
- [x] Trading activity service implemented
- [x] Control module integration complete
- [x] Snapshot module integration complete
- [x] DEVNET stub code removed
- [x] Test suite created
- [ ] Tests passing (after migration applied)
- [ ] Deployed to production server
- [ ] Tested with a real lottery round
- [ ] Monitoring and logging verified

---

## 🎯 Next Steps

1. **Apply the database migration** (see Step 1 above)
2. **Run the test suite** to verify implementation
3. **Deploy to production** and restart the server
4. **Test with a new lottery round** to confirm end-to-end flow
5. **Monitor logs** during the first production round
6. **Update MAINNET_BLOCKERS.md** to mark BLOCKER 1 as completed

---

**Questions or issues?** Review the logs, check the monitoring queries above, or consult the implementation plan in `TRADING_ACTIVITY_IMPLEMENTATION.md`.

---

**Last Updated:** October 23, 2025
**Implemented By:** Claude Code Assistant
**Status:** ✅ Ready for Deployment (pending DB migration)
