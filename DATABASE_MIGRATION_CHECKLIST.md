# Database Migration Checklist - Trading Activity Implementation

**Date:** October 23, 2025
**Status:** ⚠️ ACTION REQUIRED - Migrations Need to be Applied

---

## ⚠️ IMPORTANT: Two Migrations Required

The trading activity implementation requires **TWO** database migrations to be applied:

1. ✅ **ALREADY APPLIED** (per your earlier work): `20251012084500_add_trading_activity_fields`
2. ❌ **NOT YET APPLIED**: `20251023000000_add_balance_snapshot`

---

## Migration 1: Trading Activity Fields (SHOULD BE APPLIED)

### Migration: `20251012084500_add_trading_activity_fields`
**Status:** ✅ Should already be applied (from October 12)

**Changes to Participant Table:**
- Added `tokenLottoBalanceStart` (DOUBLE PRECISION)
- Added `tokenLottoBalanceEnd` (DOUBLE PRECISION)
- Added `tokenUsdBalance` (DOUBLE PRECISION)
- Removed old `tokenBalance` field

**Verification Query:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Participant'
  AND column_name IN ('tokenLottoBalanceStart', 'tokenLottoBalanceEnd', 'tokenUsdBalance')
ORDER BY column_name;
```

**Expected Result:**
```
column_name              | data_type
-------------------------|-----------
tokenLottoBalanceStart   | double precision
tokenLottoBalanceEnd     | double precision
tokenUsdBalance          | double precision
```

**If Missing:** This migration MUST be applied before the trading activity feature can work.

---

## Migration 2: Balance Snapshot Table (NOT YET APPLIED)

### Migration: `20251023000000_add_balance_snapshot`
**Status:** ❌ **NOT APPLIED** - Needs to be applied NOW

**Location:** `apps/backend/prisma/migrations/20251023000000_add_balance_snapshot/migration.sql`

**Creates New Table:**
```sql
CREATE TABLE "BalanceSnapshot" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "tokenBalance" DOUBLE PRECISION NOT NULL,
    "snapshotType" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BalanceSnapshot_roundId_wallet_snapshotType_key"
    ON "BalanceSnapshot"("roundId", "wallet", "snapshotType");

CREATE INDEX "BalanceSnapshot_roundId_wallet_snapshotType_idx"
    ON "BalanceSnapshot"("roundId", "wallet", "snapshotType");

CREATE INDEX "BalanceSnapshot_capturedAt_idx"
    ON "BalanceSnapshot"("capturedAt");

ALTER TABLE "BalanceSnapshot" ADD CONSTRAINT "BalanceSnapshot_roundId_fkey"
    FOREIGN KEY ("roundId") REFERENCES "Round"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
```

**Verification Query:**
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'BalanceSnapshot';
```

**Expected Result:**
```
table_name
-----------------
BalanceSnapshot
```

---

## 🚀 How to Apply Migrations

### Option 1: Using Supabase Dashboard (RECOMMENDED for production)

Since you're using Supabase and encountered permission issues with Prisma migrate, use the Supabase SQL Editor:

1. **Log in to Supabase Dashboard**
2. **Go to SQL Editor**
3. **Run this SQL:**

```sql
-- Check if BalanceSnapshot table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'BalanceSnapshot'
);

-- If false, run the migration:
CREATE TABLE "BalanceSnapshot" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "wallet" TEXT NOT NULL,
    "tokenBalance" DOUBLE PRECISION NOT NULL,
    "snapshotType" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BalanceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BalanceSnapshot_roundId_wallet_snapshotType_key"
    ON "BalanceSnapshot"("roundId", "wallet", "snapshotType");

CREATE INDEX "BalanceSnapshot_roundId_wallet_snapshotType_idx"
    ON "BalanceSnapshot"("roundId", "wallet", "snapshotType");

CREATE INDEX "BalanceSnapshot_capturedAt_idx"
    ON "BalanceSnapshot"("capturedAt");

ALTER TABLE "BalanceSnapshot" ADD CONSTRAINT "BalanceSnapshot_roundId_fkey"
    FOREIGN KEY ("roundId") REFERENCES "Round"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
```

4. **Verify it worked:**
```sql
SELECT COUNT(*) FROM "BalanceSnapshot";
-- Should return 0 (empty table, ready to use)
```

### Option 2: Mark Migration as Applied (if you ran SQL manually)

If you applied the SQL manually via Supabase, tell Prisma it's done:

```bash
cd apps/backend

# Mark the migration as applied without running it
npx prisma migrate resolve --applied 20251023000000_add_balance_snapshot
```

---

## ✅ Complete Verification Checklist

Run these queries to verify BOTH migrations are properly applied:

### 1. Check Participant Table Fields
```sql
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Participant'
  AND column_name IN (
    'tokenLottoBalanceStart',
    'tokenLottoBalanceEnd',
    'tokenUsdBalance',
    'eligibilityScore',
    'isEligible'
  )
ORDER BY column_name;
```

**Expected Result:**
```
column_name              | data_type        | is_nullable
-------------------------|------------------|-----------
eligibilityScore         | double precision | YES
isEligible               | boolean          | NO
tokenLottoBalanceStart   | double precision | YES
tokenLottoBalanceEnd     | double precision | YES
tokenUsdBalance          | double precision | YES
```

### 2. Check BalanceSnapshot Table Exists
```sql
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns
     WHERE table_name = 'BalanceSnapshot') as column_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'BalanceSnapshot';
```

**Expected Result:**
```
table_name        | column_count
------------------|-------------
BalanceSnapshot   | 6
```

### 3. Check BalanceSnapshot Indexes
```sql
SELECT indexname
FROM pg_indexes
WHERE tablename = 'BalanceSnapshot'
ORDER BY indexname;
```

**Expected Result:**
```
indexname
--------------------------------------------------------
BalanceSnapshot_capturedAt_idx
BalanceSnapshot_pkey
BalanceSnapshot_roundId_wallet_snapshotType_idx
BalanceSnapshot_roundId_wallet_snapshotType_key
```

### 4. Check Foreign Key Constraint
```sql
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'BalanceSnapshot';
```

**Expected Result:**
```
constraint_name              | table_name       | column_name | foreign_table_name | foreign_column_name
-----------------------------|------------------|-------------|--------------------|-----------------
BalanceSnapshot_roundId_fkey | BalanceSnapshot  | roundId     | Round              | id
```

---

## 🧪 Test the Implementation

After applying the migration, test the complete flow:

### 1. Create a Test Round
```bash
# Via Operator Dashboard -> Control Module
# Or via API:
curl -X POST http://localhost:4000/control \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "tokenMint": "YOUR_TOKEN_MINT",
    "tokenDecimals": 6,
    "snapshotStart": "2025-10-24T00:00:00Z",
    "snapshotEnd": "2025-10-31T00:00:00Z",
    ...
  }'
```

**Check START balances captured:**
```sql
SELECT COUNT(*) as start_count
FROM "BalanceSnapshot"
WHERE "snapshotType" = 'START'
  AND "roundId" = 'YOUR_ROUND_ID';
```

### 2. Run Snapshot
Via Operator Dashboard → Snapshot Module

**Check participants created:**
```sql
SELECT
    COUNT(*) as total,
    COUNT(CASE WHEN "tokenLottoBalanceStart" IS NOT NULL THEN 1 END) as has_start_balance
FROM "Participant"
WHERE "roundId" = 'YOUR_ROUND_ID';
```

### 3. Confirm Snapshot
Via Operator Dashboard → Snapshot Module

**Check END balances captured:**
```sql
SELECT COUNT(*) as end_count
FROM "BalanceSnapshot"
WHERE "snapshotType" = 'END'
  AND "roundId" = 'YOUR_ROUND_ID';
```

**Check eligibility calculated:**
```sql
SELECT
    wallet,
    "tokenLottoBalanceStart",
    "tokenLottoBalanceEnd",
    "eligibilityScore" as trading_activity_percent,
    "isEligible"
FROM "Participant"
WHERE "roundId" = 'YOUR_ROUND_ID'
ORDER BY "eligibilityScore" DESC
LIMIT 10;
```

### 4. Export CSV
Via Operator Dashboard → Snapshot Module → Export CSV

**Verify columns:**
- Token LOTTO Balance Start
- Token LOTTO Balance End
- Trading Activity %

---

## 🐛 Troubleshooting

### Issue: Prisma says migration not applied

**Check Prisma migration table:**
```sql
SELECT * FROM "_prisma_migrations"
WHERE migration_name LIKE '%balance_snapshot%';
```

**If not listed, manually insert:**
```sql
INSERT INTO "_prisma_migrations" (
    id,
    checksum,
    finished_at,
    migration_name,
    logs,
    rolled_back_at,
    started_at,
    applied_steps_count
)
VALUES (
    gen_random_uuid(),
    'CHECKSUM_HERE',  -- Get from migration file or use arbitrary value
    NOW(),
    '20251023000000_add_balance_snapshot',
    NULL,
    NULL,
    NOW(),
    1
);
```

### Issue: Foreign key constraint fails

**Cause:** BalanceSnapshot references Round table, but Round doesn't have foreign key field

**Solution:** Already handled in schema - Round model has `BalanceSnapshot BalanceSnapshot[]` relation

**Verify Round relation:**
```bash
cd apps/backend
npx prisma generate  # Regenerate Prisma client
```

### Issue: Old rounds don't have START balances

**This is expected!** Only NEW rounds created after deploying the trading activity code will have START balances.

**For old rounds:** See TRADING_ACTIVITY_FIXES.md for backfill options

---

## 📋 Pre-Deployment Checklist

Before deploying to production:

- [ ] Verify Participant table has all trading activity fields
  - [ ] `tokenLottoBalanceStart`
  - [ ] `tokenLottoBalanceEnd`
  - [ ] `tokenUsdBalance`
  - [ ] `eligibilityScore`
  - [ ] `isEligible`

- [ ] Verify BalanceSnapshot table exists
  - [ ] Table created
  - [ ] All 6 columns present
  - [ ] Primary key on `id`
  - [ ] Unique constraint on `[roundId, wallet, snapshotType]`
  - [ ] 3 indexes created
  - [ ] Foreign key to Round table

- [ ] Verify Prisma client regenerated
  ```bash
  cd apps/backend
  npx prisma generate
  ```

- [ ] Test with a complete round
  - [ ] START balances captured at round creation
  - [ ] Snapshot runs successfully
  - [ ] END balances captured at confirmation
  - [ ] Trading activity % calculated
  - [ ] CSV export shows all new fields

---

## 📞 Need Help?

If you encounter issues:

1. **Check migration status:**
   ```bash
   cd apps/backend
   npx prisma migrate status
   ```

2. **View migration history:**
   ```sql
   SELECT migration_name, finished_at, applied_steps_count
   FROM "_prisma_migrations"
   ORDER BY finished_at DESC
   LIMIT 10;
   ```

3. **Check error logs:**
   - Backend console output
   - Supabase logs (if using Supabase)
   - Database error logs

---

**Last Updated:** October 23, 2025
**Critical:** Apply BalanceSnapshot migration before deploying trading activity code!
