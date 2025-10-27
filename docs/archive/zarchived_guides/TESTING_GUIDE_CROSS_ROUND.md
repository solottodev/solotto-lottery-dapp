# Cross-Round Testing Guide

**Purpose:** Test cross-round balance tracking with live data before Oct 26 production launch

---

## Testing Strategy

Instead of waiting for Oct 26, we'll test the cross-round tracking NOW using:
1. Existing wallet data (real token holders)
2. Injected dummy START balances (simulates previous round)
3. Live snapshot to capture END balances
4. Verify trading activity calculations work correctly

Then after successful testing, we'll do a full database cleanup for the Oct 26 seed round.

---

## Prerequisites

- [x] Code deployed to production
- [x] Backend running and healthy
- [ ] Operator Dashboard accessible
- [ ] Test data injection script ready

---

## Step 1: Deploy Code

```bash
# On production server
pm2 stop backend
git pull origin main
npm install
cd apps/backend && npm run build
pm2 start backend
pm2 logs backend --lines 50
```

**Verify:**
- No errors in logs
- Backend responds to health check
- Operator Dashboard loads

---

## Step 2: Create Test Round

**Via Operator Dashboard → Control Module:**

1. **Token Configuration:**
   - Token Mint: `[YOUR_TOKEN_MINT]`
   - Token Decimals: `6` (or appropriate)

2. **Timing:**
   - Snapshot Start: Today's date (e.g., `2025-10-23T00:00:00Z`)
   - Snapshot End: Tomorrow's date (e.g., `2025-10-24T23:59:59Z`)
   - Draw Time: Day after tomorrow (e.g., `2025-10-25T00:00:00Z`)

3. **Parameters:**
   - Trade Percentage: `50`
   - Min USD LOTTO Required: `100` (or appropriate)
   - Max Tier 1 USD Value: `1000`
   - Max Tier 2 USD Value: `5000`
   - Tier 1 Prize: `0.5`
   - Tier 2 Prize: `0.2`
   - Tier 3 Prize: `0.1`

4. **Click "Create Round"**

**Expected Logs:**
```
📋 Setting up START balances for round abc123...
   No previous round found - capturing fresh START balances
   Found 1500 token holders at START
✅ START balances captured successfully
```

**Save the Round ID** for the next step!

---

## Step 3: Inject Dummy START Balances

This simulates having a previous round with different balances.

```bash
cd apps/backend

# Replace ROUND_ID with the actual ID from Step 2
npx ts-node scripts/inject-test-start-balances.ts ROUND_ID
```

**What it does:**
1. Fetches current token holder balances
2. Generates random START balances (80-120% of current)
3. Injects START records into BalanceSnapshot
4. Shows sample variance examples

**Expected Output:**
```
🧪 Test Data Injection Script
============================

Round ID: abc123

✅ Round found
   Token Mint: 4o5Z...
   Created At: 2025-10-23T15:30:00.000Z

📊 Fetching current token holders...
   Found 165 token accounts
   Found 150 wallets with positive balances

📊 Sample variance (first 5 wallets):
   8mJkT...WpQ3
      START: 1200.00 → END: 1000.00
      Activity: bought 16.7%
   ...

💉 Injecting dummy START balances...
   ✅ Inserted 150 START balance records

🔍 Verifying injection...
   START balances: 150

✅ Test data injection complete!
```

---

## Step 4: Run Snapshot

**Via Operator Dashboard → Snapshot Module:**

1. Click **"Run Snapshot"**
2. Wait for completion (watch backend logs)

**Expected Behavior:**
- Fetches current token balances (END)
- Creates Participant records
- Populates `tokenLottoBalanceEnd` field
- **Does NOT yet populate `tokenLottoBalanceStart`** (happens on confirm)

**Verify:**
- Snapshot status shows "PENDING"
- Participant count matches expected wallets

---

## Step 5: Confirm Snapshot

**Via Operator Dashboard → Snapshot Module:**

1. Click **"Confirm Snapshot"**
2. Watch backend logs carefully

**Expected Logs:**
```
📸 Capturing END balances for round abc123...
   Found 145 participants with END balances
✅ Successfully captured END balances

📊 Calculating trading activity for 145 participants...
   Wallet xyz123:
      START: 1000 → END: 1500 (+50.0% buy activity)
   Wallet abc456:
      START: 2000 → END: 1500 (-25.0% sell activity)
   ...
✅ Trading activity calculated for 145 participants

📊 Eligibility Summary:
   Total participants: 145
   Eligible (≥50% activity): 78 (53.8%)
   Ineligible (<50% activity): 67 (46.2%)
```

**Verify:**
- Snapshot status changes to "CONFIRMED"
- Trading activity percentages are NOT all 0%
- Some participants are eligible (isEligible = true)
- Some participants are ineligible (isEligible = false)

---

## Step 6: Verify Database

```sql
-- Check START balances exist
SELECT COUNT(*) as start_count
FROM "BalanceSnapshot"
WHERE "roundId" = 'YOUR_ROUND_ID'
  AND "snapshotType" = 'START';
-- Expected: ~150

-- Check END balances exist
SELECT COUNT(*) as end_count
FROM "BalanceSnapshot"
WHERE "roundId" = 'YOUR_ROUND_ID'
  AND "snapshotType" = 'END';
-- Expected: ~145 (some wallets may have sold)

-- Check trading activity distribution
SELECT
  CASE
    WHEN "eligibilityScore" = 0 THEN '0% (Inactive)'
    WHEN "eligibilityScore" < 50 THEN '1-49% (Below threshold)'
    WHEN "eligibilityScore" >= 50 THEN '50%+ (Eligible)'
  END as activity_range,
  COUNT(*) as participant_count,
  ROUND(AVG("eligibilityScore"), 2) as avg_score
FROM "Participant"
WHERE "roundId" = 'YOUR_ROUND_ID'
GROUP BY activity_range;

-- Expected result:
-- 0% (Inactive)          | 10-20  | 0.00
-- 1-49% (Below)          | 50-70  | 25.00
-- 50%+ (Eligible)        | 60-80  | 75.00

-- Check sample participants
SELECT
  wallet,
  "tokenLottoBalanceStart",
  "tokenLottoBalanceEnd",
  "eligibilityScore",
  "isEligible"
FROM "Participant"
WHERE "roundId" = 'YOUR_ROUND_ID'
ORDER BY "eligibilityScore" DESC
LIMIT 10;

-- Expected: Varying balances and scores
```

---

## Step 7: Export and Verify CSV

**Via Operator Dashboard → Snapshot Module:**

1. Click **"Export Participants CSV"**
2. Download the CSV file
3. Open in Excel/Google Sheets

**Verify CSV Contains:**
- `Token LOTTO Balance Start` column has values (not all 0)
- `Token LOTTO Balance End` column has values
- `Trading Activity %` column has various percentages (not all 0%)
- `Is Eligible` column has mix of TRUE/FALSE

**Sample CSV Data:**
```csv
Wallet Address,Token LOTTO Balance Start,Token LOTTO Balance End,Trading Activity %,Is Eligible
8mJkT...WpQ3,1200.00,1000.00,16.67,FALSE
5xPqR...LmN2,800.00,1600.00,100.00,TRUE
9zKpT...WvX4,5000.00,5000.00,0.00,FALSE
```

---

## Step 8: Test Cross-Round Inheritance (Optional)

To fully test cross-round inheritance, create a second test round:

1. **Create Round 2** via Control Module
2. **Check Logs:**
   ```
   📋 Setting up START balances for round def456...
      Found previous round: abc123 (2025-10-23)
      Using cross-round inheritance from previous round
      Found 145 END balances to inherit
      Inherited 145/145 START balances...
   ✅ Inherited 145 START balances from previous round
   ```

3. **Verify Round 2 START = Round 1 END:**
   ```sql
   -- Compare Round 1 END to Round 2 START
   SELECT
     r1.wallet,
     r1."tokenBalance" as round1_end,
     r2."tokenBalance" as round2_start,
     CASE
       WHEN r1."tokenBalance" = r2."tokenBalance" THEN 'MATCH ✅'
       ELSE 'MISMATCH ❌'
     END as status
   FROM "BalanceSnapshot" r1
   JOIN "BalanceSnapshot" r2
     ON r1.wallet = r2.wallet
   WHERE r1."roundId" = 'ROUND_1_ID'
     AND r1."snapshotType" = 'END'
     AND r2."roundId" = 'ROUND_2_ID'
     AND r2."snapshotType" = 'START'
   LIMIT 10;

   -- All rows should show 'MATCH ✅'
   ```

4. **Run and confirm Round 2 snapshot**
5. **Verify trading activity uses inherited baselines**

---

## Success Criteria

### ✅ Test PASSED if:

1. **START Balances Injected:**
   - BalanceSnapshot table has START records
   - Counts match expected wallet count

2. **END Balances Captured:**
   - BalanceSnapshot table has END records
   - Counts match snapshot participant count

3. **Trading Activity Calculated:**
   - Participant.eligibilityScore is NOT all 0%
   - Values range from 0% to 100%
   - Distribution looks realistic

4. **Eligibility Determined:**
   - Some participants have isEligible = TRUE
   - Some participants have isEligible = FALSE
   - Split is roughly proportional to activity

5. **CSV Export Accurate:**
   - All columns populated
   - START and END balances differ
   - Trading activity percentages match database

6. **Cross-Round Inheritance (if tested):**
   - Round 2 START = Round 1 END
   - Logs show inheritance message
   - No duplicate key errors

### ❌ Test FAILED if:

- All eligibilityScore values are 0%
- All isEligible values are FALSE
- START balances are missing
- END balances are missing
- CSV export shows 0% activity for all
- Duplicate key errors during injection
- Cross-round inheritance doesn't work

---

## After Testing Passes

Once you've verified everything works:

### 1. Document Results

Save the following:
- Test round ID
- CSV export file
- Database query results
- Screenshots of Operator Dashboard

### 2. Full Database Cleanup

```sql
-- ⚠️ WARNING: This deletes ALL lottery data
-- Only run after confirming test success

DELETE FROM "Participant";
DELETE FROM "BalanceSnapshot";
DELETE FROM "Snapshot";
DELETE FROM "Drawing";
DELETE FROM "Round";
DELETE FROM "LotteryConfig";

-- Verify cleanup
SELECT COUNT(*) FROM "Round"; -- Should be 0
SELECT COUNT(*) FROM "BalanceSnapshot"; -- Should be 0
```

### 3. Prepare for Oct 26 Seed Round

Follow the production deployment plan:

**Oct 26 (Saturday):**
1. Create "seed" round via Control Module
2. Immediately run snapshot
3. Immediately confirm snapshot
4. Verify END balances captured
5. Document seed round ID

**Nov 2 (Saturday):**
1. Create Round 1 (will inherit from seed)
2. Verify logs show inheritance
3. Run snapshot on schedule
4. Confirm snapshot to complete round

---

## Troubleshooting

### Issue: Script fails to inject START balances

**Check:**
- Is `RPC_ENDPOINT_SNAPSHOT` set in `.env`?
- Does the round ID exist?
- Is the token mint address correct?

### Issue: Trading activity still 0% after confirm

**Check:**
- Do START balances exist in BalanceSnapshot?
  ```sql
  SELECT COUNT(*) FROM "BalanceSnapshot"
  WHERE "roundId" = 'YOUR_ROUND_ID' AND "snapshotType" = 'START';
  ```
- Do END balances exist?
  ```sql
  SELECT COUNT(*) FROM "BalanceSnapshot"
  WHERE "roundId" = 'YOUR_ROUND_ID' AND "snapshotType" = 'END';
  ```
- Check backend logs for errors during `updateParticipantEligibility`

### Issue: Cross-round inheritance not working

**Check:**
- Was previous round confirmed?
- Does previous round have END balances?
- Are token mints the same between rounds?
- Check logs for "No previous round found" message

---

## Support

If you encounter issues:
1. Check backend logs: `pm2 logs backend --lines 200`
2. Review database queries above
3. Check [CROSS_ROUND_BALANCE_TRACKING.md](CROSS_ROUND_BALANCE_TRACKING.md) for detailed documentation
4. Verify environment variables in `.env`

---

**Ready to proceed with testing!** 🚀
