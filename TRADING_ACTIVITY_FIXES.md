# Trading Activity - Bug Fixes & CSV Updates

**Date:** October 23, 2025
**Status:** ✅ FIXED - Ready for Redeployment

---

## 🐛 Issues Identified

### Issue 1: START Balance Not Being Populated Correctly
**Problem:** The `tokenLottoBalanceStart` field in the Participant table was being set equal to `tokenLottoBalanceEnd` during snapshot `/run`, causing everyone to show 0% trading activity.

**Root Cause:** The snapshot service was setting both START and END balances to the current balance, instead of using the BalanceSnapshot table data.

**Impact:** All participants appeared to have 0% trading activity, making everyone ineligible.

### Issue 2: CSV Export Missing Trading Activity Fields
**Problem:** The CSV export was missing key trading activity data:
- No `Token LOTTO Balance Start` column
- Generic "Token LOTTO Balance" instead of separate START/END columns
- Missing `Is Winner` column

**Impact:** Exported CSV data couldn't be used to audit trading activity calculations.

---

## ✅ Fixes Applied

### Fix 1: Update Trading Activity Service to Populate START Balance

**File:** [trading-activity.service.ts:214-234](apps/backend/src/services/trading-activity.service.ts#L214-L234)

**Changes:**
- Added lookup of START balance from BalanceSnapshot table
- Update Participant record with actual START balance during confirmation
- Enhanced logging to show START → END balance changes

**Code:**
```typescript
// Get actual START balance from BalanceSnapshot table
const startSnapshot = await prisma.balanceSnapshot.findUnique({
  where: {
    roundId_wallet_snapshotType: {
      roundId,
      wallet: participant.wallet,
      snapshotType: 'START'
    }
  }
});

// Update participant with trading activity AND actual START balance
await prisma.participant.update({
  where: { id: participant.id },
  data: {
    eligibilityScore: tradePercent,
    tokenLottoBalanceStart: startSnapshot?.tokenBalance ?? participant.tokenLottoBalanceEnd,
  }
});
```

### Fix 2: Enhanced CSV Export

**File:** [snapshot.ts:278-317](apps/backend/src/routes/snapshot.ts#L278-L317)

**Changes:**
- Added `Token LOTTO Balance Start` column
- Added `Token LOTTO Balance End` column (renamed from generic "Token LOTTO Balance")
- Renamed `Eligibility Score` to `Trading Activity %` for clarity
- Added `Is Winner` column

**New CSV Headers:**
```
Round ID, Wallet Address, Participant ID, Round Start Date, Round End Date,
Snapshot ID, Snapshot Started At, Snapshot Completed At,
Token LOTTO Balance Start, Token LOTTO Balance End, Token USD Balance,
Tier, Trading Activity %, Is Eligible, Is Blacklisted, Is Winner
```

### Fix 3: Enhanced JSON API Response

**File:** [snapshot.ts:232-244](apps/backend/src/routes/snapshot.ts#L232-L244)

**Changes:**
- Added `tokenLottoBalanceStart` field to JSON response
- Split out `tokenLottoBalanceEnd` as separate field
- Better documentation of what each field represents

---

## 🔄 How It Works Now

### Complete Flow:

1. **Round Creation** (`POST /control`)
   - Captures START balances in BalanceSnapshot table
   - Creates Round and LotteryConfig records
   ```
   BalanceSnapshot: roundId, wallet, tokenBalance, snapshotType='START'
   ```

2. **Snapshot Run** (`POST /snapshot/run`)
   - Fetches current token holders from blockchain
   - Assigns tiers based on END balance
   - Stores participants with END balance
   ```
   Participant: wallet, tokenLottoBalanceEnd, tier, isEligible=false
   ```

3. **Snapshot Confirm** (`POST /snapshot/confirm`)
   - Captures END balances in BalanceSnapshot table
   - Calculates trading activity for each participant
   - **NEW:** Updates `tokenLottoBalanceStart` with actual START balance
   - Updates `eligibilityScore` with trading activity percentage
   - Sets `isEligible` based on USD balance AND trading activity
   ```
   BalanceSnapshot: roundId, wallet, tokenBalance, snapshotType='END'
   Participant: tokenLottoBalanceStart (updated), eligibilityScore, isEligible
   ```

4. **CSV Export** (`GET /snapshot/:id/participants/export`)
   - Exports all participant data including START/END balances
   - Shows trading activity percentage
   - Clearly indicates eligibility status

---

## 📊 Example Output

### Console Logs (During Confirm):

```
📋 Eligibility Requirements:
   - Minimum USD Balance: $50
   - Minimum Trade Activity: 50%

📸 Capturing END balances...
   Found 150 token holders at END
✅ Successfully captured 150 END balances

📊 Calculating trading activity for all participants...
   ✅ WalletABC... - Trade Activity: 65.23% (1000.00 → 1652.30)
   ❌ WalletXYZ... - Trade Activity: 12.45% (1000.00 → 1124.50)
   ✅ WalletDEF... - Trade Activity: 55.00% (2000.00 → 900.00)

🔍 Final Eligibility Check (USD Balance + Trade Activity):
   ✅ WalletABC... - Balance: $125.50 ✓, Trade: 65.2% ✓
   ❌ WalletXYZ... - Balance: $89.50 ✓, Trade: 12.5% ✗
   ✅ WalletDEF... - Balance: $95.00 ✓, Trade: 55.0% ✓
```

### CSV Export Sample:

| Wallet Address | Token LOTTO Balance Start | Token LOTTO Balance End | Trading Activity % | Is Eligible |
|----------------|---------------------------|------------------------|-------------------|-------------|
| WalletABC...   | 1000.00                   | 1652.30                | 65.23            | TRUE        |
| WalletXYZ...   | 1000.00                   | 1124.50                | 12.45            | FALSE       |
| WalletDEF...   | 2000.00                   | 900.00                 | 55.00            | TRUE        |

---

## 🚀 Deployment Instructions

### Step 1: Deploy Updated Code

```bash
# On your production server
cd /path/to/solotto-lottery-dapp/apps/backend
git pull origin main
npm install
pm2 restart backend  # or your process manager command
```

### Step 2: Verify Existing Round (If Applicable)

If you have an existing round that needs to be re-confirmed:

```bash
# Check if START balances exist for the round
psql $DATABASE_URL -c "
  SELECT COUNT(*) as start_count
  FROM \"BalanceSnapshot\"
  WHERE \"roundId\" = 'YOUR_ROUND_ID' AND \"snapshotType\" = 'START';
"

# If start_count is 0, you need to backfill START balances
# See BACKFILL section below
```

### Step 3: Re-run Snapshot Confirmation

For the existing round that showed incorrect eligibility:

1. Go to the Operator Dashboard
2. Navigate to the Snapshot module
3. Click "Confirm Snapshot" again
4. The system will:
   - Capture END balances (if not already done)
   - Calculate trading activity with correct START/END comparison
   - Update eligibility flags correctly
   - Export CSV will now show all fields

---

## 🔧 Backfilling START Balances (If Needed)

If you have an existing round where START balances weren't captured, you have two options:

### Option A: Accept Current Balances as START (Quick Fix)
This treats the current balance as the START balance, meaning everyone will show 0% activity:

```sql
-- Copy END balances to START
INSERT INTO "BalanceSnapshot" (id, "roundId", wallet, "tokenBalance", "snapshotType", "capturedAt")
SELECT
  gen_random_uuid(),
  "roundId",
  wallet,
  "tokenBalance",
  'START',
  NOW()
FROM "BalanceSnapshot"
WHERE "roundId" = 'YOUR_ROUND_ID' AND "snapshotType" = 'END'
ON CONFLICT DO NOTHING;
```

### Option B: Use Historical Balance Data (Accurate)
If you need accurate START balances from the actual round start date, you'll need to:

1. Query historical blockchain data at `round.startDate`
2. Manually populate BalanceSnapshot with START balances
3. This requires access to historical RPC endpoints or archived blockchain data

---

## ✅ Testing Checklist

Before considering this deployed:

- [ ] Backend code deployed
- [ ] Backend server restarted
- [ ] Test with a NEW round (not the existing one):
  - [ ] Create round via Control module
  - [ ] Verify START balances captured (check logs)
  - [ ] Run snapshot
  - [ ] Confirm snapshot
  - [ ] Check logs show trading activity % and START → END balances
  - [ ] Export CSV and verify all columns present
  - [ ] Verify eligibility is correctly applied

- [ ] For EXISTING round (if applicable):
  - [ ] Backfill START balances (if needed)
  - [ ] Re-run confirmation
  - [ ] Export CSV and verify data
  - [ ] Compare before/after eligibility counts

---

## 📁 Files Modified

1. **apps/backend/src/services/trading-activity.service.ts**
   - Lines 214-241: Added START balance lookup and update

2. **apps/backend/src/routes/snapshot.ts**
   - Lines 232-244: Updated JSON API response
   - Lines 278-317: Enhanced CSV export with all trading fields

3. **apps/backend/src/services/snapshot.service.ts**
   - Lines 173-182: Updated comments to clarify START/END balance handling

---

## 🎯 Expected Behavior After Fix

### For New Rounds:
- START balances captured at round creation ✅
- END balances captured at confirmation ✅
- Trading activity calculated correctly ✅
- CSV export includes all fields ✅
- Eligibility rules properly enforced ✅

### For the Test Round You Ran:
- You'll need to either:
  - **Option 1:** Backfill START balances and re-confirm
  - **Option 2:** Create a new test round and run through the full flow

---

## 📞 Support

If you encounter issues:

1. Check backend logs for error messages
2. Verify START balances exist in BalanceSnapshot table
3. Check that Prisma client was regenerated (`npx prisma generate`)
4. Ensure database migration was applied

---

**Last Updated:** October 23, 2025
**Status:** Ready for Production Deployment
