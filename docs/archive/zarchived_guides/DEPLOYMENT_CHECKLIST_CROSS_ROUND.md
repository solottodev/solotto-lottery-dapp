# Cross-Round Balance Tracking - Deployment Checklist

**Date:** October 23, 2025
**Feature:** Cross-Round Balance Tracking
**Status:** Ready for Deployment

---

## Pre-Deployment Checklist

### Database Preparation

- [ ] **Backup current database**
  ```bash
  # Via Supabase Dashboard → Database → Backups
  # OR via SQL:
  pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Clean existing data (APPROVED BY USER)**
  ```sql
  -- ⚠️ WARNING: This deletes ALL lottery data
  -- User requested clean slate for Oct 26 seed round

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

- [ ] **Verify schema is current**
  ```sql
  -- Check BalanceSnapshot table exists
  SELECT COUNT(*) FROM "BalanceSnapshot";
  -- Expected: 0 (after cleanup)

  -- Check Participant has trading fields
  SELECT column_name FROM information_schema.columns
  WHERE table_name = 'Participant'
    AND column_name LIKE 'tokenLotto%';
  -- Expected: tokenLottoBalanceStart, tokenLottoBalanceEnd
  ```

### Code Verification

- [ ] **Review modified files**
  - [x] `apps/backend/src/services/trading-activity.service.ts` - Added cross-round methods
  - [x] `apps/backend/src/routes/control.ts` - Updated round creation logic
  - [x] `apps/backend/src/services/snapshot.service.ts` - Updated comments

- [ ] **Verify no syntax errors**
  ```bash
  cd apps/backend
  npm run build
  ```

- [ ] **Check for TypeScript errors**
  ```bash
  npx tsc --noEmit
  ```

### Documentation Review

- [x] **CROSS_ROUND_BALANCE_TRACKING.md** - Complete guide created
- [x] **SCHEMA_AND_CSV_ALIGNMENT.md** - Updated with cross-round tracking
- [x] **TRADING_ACTIVITY_IMPLEMENTATION.md** - Updated with implementation status
- [ ] **README updates** - If applicable

---

## Deployment Steps

### Step 1: Deploy Code

- [ ] **Commit changes**
  ```bash
  git add .
  git commit -m "Implement cross-round balance tracking for trading activity

  - Add inheritPreviousEndBalances() and findPreviousRound() methods
  - Update control route to use cross-round inheritance
  - Add comprehensive documentation
  - Enables accurate week-over-week trading activity measurement"
  ```

- [ ] **Push to repository**
  ```bash
  git push origin main
  ```

- [ ] **Deploy to production**
  ```bash
  # Stop backend
  pm2 stop backend

  # Pull latest code
  git pull origin main

  # Install dependencies (if needed)
  npm install

  # Build
  npm run build

  # Start backend
  pm2 start backend

  # Check logs
  pm2 logs backend --lines 50
  ```

### Step 2: Verify Deployment

- [ ] **Check backend health**
  ```bash
  curl http://localhost:4000/health
  # Expected: 200 OK
  ```

- [ ] **Verify logs show no errors**
  ```bash
  pm2 logs backend --lines 100
  # Look for startup messages, no errors
  ```

- [ ] **Test API endpoint**
  ```bash
  # Test authentication
  curl -X POST http://localhost:4000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"operator@example.com","password":"your_password"}'
  ```

---

## Oct 26 - Seed Round Creation

### Prerequisites

- [ ] Backend deployed and running
- [ ] Database cleaned (all old data removed)
- [ ] Operator credentials ready
- [ ] Token mint address available

### Steps

- [ ] **Log in to Operator Dashboard**
  - Navigate to: http://localhost:3000 (or production URL)
  - Log in with operator credentials

- [ ] **Create Seed Round via Control Module**
  - Token Mint: `[YOUR_TOKEN_MINT_ADDRESS]`
  - Token Decimals: `6` (or appropriate value)
  - Snapshot Start: `2025-10-26T00:00:00Z`
  - Snapshot End: `2025-10-26T23:59:59Z`
  - Draw Time: `2025-10-27T00:00:00Z`
  - Trade Percentage: `50`
  - Min USD LOTTO Required: `50`
  - Prize Distribution %: `70`
  - Other fields as appropriate

- [ ] **Verify round creation in logs**
  ```bash
  pm2 logs backend --lines 50
  ```

  **Expected output:**
  ```
  📋 Setting up START balances for round [ROUND_ID]...
  🔍 Searching for previous round to inherit balances from...
     Token mint: [MINT_ADDRESS]
     Before: 2025-10-26T...
     Found 0 rounds to check
     ℹ️  No previous round found with END balances
     No previous round found - capturing fresh START balances
  📸 Capturing START balances...
     Found X token holders at START
     Captured X/X START balances...
  ✅ START balances captured successfully
  ```

- [ ] **Verify BalanceSnapshot records**
  ```sql
  SELECT
    COUNT(*) as start_count,
    COUNT(DISTINCT wallet) as unique_wallets
  FROM "BalanceSnapshot"
  WHERE "snapshotType" = 'START';

  -- Expected: start_count > 0, unique_wallets > 0
  ```

- [ ] **Run Snapshot**
  - Navigate to Snapshot Module
  - Click "Run Snapshot"
  - Wait for completion

- [ ] **Confirm Snapshot**
  - Click "Confirm Snapshot"
  - Wait for completion

- [ ] **Verify END balances captured**
  ```sql
  SELECT
    COUNT(*) as end_count,
    COUNT(DISTINCT wallet) as unique_wallets
  FROM "BalanceSnapshot"
  WHERE "snapshotType" = 'END';

  -- Expected: end_count > 0, unique_wallets > 0
  ```

- [ ] **Document Seed Round ID**
  ```sql
  SELECT id, "createdAt", "startDate", "endDate"
  FROM "Round"
  ORDER BY "createdAt" DESC
  LIMIT 1;
  ```

  **Seed Round ID:** `_____________________________`

---

## Nov 2 - First Production Round

### Steps

- [ ] **Create Round 1 via Control Module**
  - Snapshot Start: `2025-11-02T00:00:00Z`
  - Snapshot End: `2025-11-09T23:59:59Z`
  - Other fields as appropriate

- [ ] **Verify cross-round inheritance in logs**

  **Expected output:**
  ```
  📋 Setting up START balances for round [ROUND_ID]...
  🔍 Searching for previous round to inherit balances from...
     Token mint: [MINT_ADDRESS]
     Before: 2025-11-02T...
     Found 1 rounds to check
     ✅ Found previous round: [SEED_ROUND_ID]...
        Created: 2025-10-26T...
        Period: 2025-10-26 → 2025-10-26
        END balances: X
     Using cross-round inheritance from previous round
  📋 Inheriting END balances from previous round...
     Previous round: [SEED_ROUND_ID]...
     Current round: [ROUND_1_ID]...
     Found X END balances to inherit
     Inherited X/X START balances...
  ✅ Inherited X START balances from previous round
  ```

- [ ] **Verify START balances inherited**
  ```sql
  SELECT
    COUNT(*) as start_count,
    COUNT(DISTINCT wallet) as unique_wallets
  FROM "BalanceSnapshot"
  WHERE "roundId" = '[ROUND_1_ID]'
    AND "snapshotType" = 'START';

  -- Expected: start_count = END count from seed round
  ```

- [ ] **Verify START matches Seed END**
  ```sql
  -- Compare Round 1 START with Seed END
  SELECT
    bs_seed.wallet,
    bs_seed."tokenBalance" as seed_end_balance,
    bs_r1."tokenBalance" as r1_start_balance,
    CASE
      WHEN bs_seed."tokenBalance" = bs_r1."tokenBalance" THEN 'MATCH ✅'
      ELSE 'MISMATCH ❌'
    END as status
  FROM "BalanceSnapshot" bs_seed
  LEFT JOIN "BalanceSnapshot" bs_r1
    ON bs_seed.wallet = bs_r1.wallet
    AND bs_r1."roundId" = '[ROUND_1_ID]'
    AND bs_r1."snapshotType" = 'START'
  WHERE bs_seed."roundId" = '[SEED_ROUND_ID]'
    AND bs_seed."snapshotType" = 'END'
  LIMIT 10;

  -- Expected: All rows show 'MATCH ✅'
  ```

---

## Nov 9 - Round 1 Confirmation

- [ ] **Run Snapshot**
  - Navigate to Snapshot Module
  - Click "Run Snapshot"

- [ ] **Confirm Snapshot**
  - Click "Confirm Snapshot"

- [ ] **Verify trading activity calculated**
  ```sql
  SELECT
    wallet,
    "tokenLottoBalanceStart",
    "tokenLottoBalanceEnd",
    "eligibilityScore" as trading_activity_pct,
    "isEligible"
  FROM "Participant"
  WHERE "roundId" = '[ROUND_1_ID]'
  ORDER BY "eligibilityScore" DESC
  LIMIT 10;

  -- Expected: Trading activity % > 0 for active traders
  ```

- [ ] **Verify eligibility distribution**
  ```sql
  SELECT
    CASE
      WHEN "eligibilityScore" = 0 THEN '0% (Inactive)'
      WHEN "eligibilityScore" < 50 THEN '1-49% (Below threshold)'
      WHEN "eligibilityScore" >= 50 THEN '50%+ (Eligible)'
    END as activity_range,
    COUNT(*) as participant_count,
    COUNT(CASE WHEN "isEligible" = true THEN 1 END) as eligible_count
  FROM "Participant"
  WHERE "roundId" = '[ROUND_1_ID]'
  GROUP BY activity_range;

  -- Expected: Mix of activity levels, not all 0%
  ```

- [ ] **Export CSV and verify**
  - Navigate to Snapshot Module
  - Click "Export CSV"
  - Open CSV file
  - Verify columns: Token LOTTO Balance Start, Token LOTTO Balance End, Trading Activity %
  - Verify START != END for most participants

---

## Post-Deployment Monitoring

### Day 1 (Deployment Day)

- [ ] **Monitor logs every hour**
  ```bash
  pm2 logs backend --lines 100
  ```

- [ ] **Check for errors**
  ```sql
  -- Check for any data anomalies
  SELECT
    COUNT(*) as total_snapshots,
    COUNT(DISTINCT "roundId") as total_rounds,
    COUNT(CASE WHEN "snapshotType" = 'START' THEN 1 END) as start_count,
    COUNT(CASE WHEN "snapshotType" = 'END' THEN 1 END) as end_count
  FROM "BalanceSnapshot";
  ```

### Week 1

- [ ] **Complete full round lifecycle**
  - Seed round (Oct 26) ✓
  - Round 1 (Nov 2-9) ✓
  - Round 2 (Nov 9-16) - Test inheritance again

- [ ] **Validate CSV exports**
  - Download CSV for each round
  - Verify trading activity calculations
  - Check for data consistency

- [ ] **Monitor performance**
  ```sql
  -- Check table growth
  SELECT
    pg_size_pretty(pg_total_relation_size('BalanceSnapshot')) as table_size,
    COUNT(*) as row_count
  FROM "BalanceSnapshot";
  ```

### Month 1

- [ ] **Track weekly rounds**
  - Verify inheritance works consistently
  - Monitor for any data corruption
  - Collect operator feedback

- [ ] **Performance review**
  - Check query performance
  - Monitor RPC usage
  - Review error logs

---

## Rollback Procedures

### If Issues Detected

#### Level 1: Quick Rollback (Code Only)

```bash
git revert HEAD
git push origin main
pm2 restart backend
```

#### Level 2: Data Cleanup

```sql
-- Remove bad START balances
DELETE FROM "BalanceSnapshot"
WHERE "roundId" = '[PROBLEM_ROUND_ID]'
  AND "snapshotType" = 'START';
```

#### Level 3: Full Rollback

```bash
# Stop backend
pm2 stop backend

# Restore database
psql $DATABASE_URL < backup_[DATE].sql

# Revert code
git reset --hard [PREVIOUS_COMMIT_SHA]
git push origin main --force

# Restart backend
pm2 start backend
```

---

## Success Criteria

### Technical Metrics

- [x] Code deployed without errors
- [ ] Seed round created successfully
- [ ] START balances captured for seed round
- [ ] END balances captured for seed round
- [ ] Round 1 inherits from seed round
- [ ] Trading activity calculated correctly
- [ ] CSV exports show accurate data

### Business Metrics

- [ ] At least 10% of participants show >0% trading activity
- [ ] Eligibility rates align with expectations
- [ ] No data corruption observed
- [ ] Operator feedback is positive
- [ ] System performs within expected parameters

---

## Completion Sign-Off

**Deployment Completed:** ______________________ (Date/Time)

**Deployed By:** ______________________ (Name)

**Verified By:** ______________________ (Name)

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

**Status:** ⬜ Success  ⬜ Partial Success  ⬜ Rollback Required

---

**Last Updated:** October 23, 2025
