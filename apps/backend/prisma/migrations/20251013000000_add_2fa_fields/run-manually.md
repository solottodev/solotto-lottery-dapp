# Manual Migration Instructions

If the automatic migration fails, run this SQL directly in the Supabase SQL Editor:

## Step 1: Open Supabase SQL Editor
1. Go to https://app.supabase.com
2. Select your project (nkiezfkiasqgefzgyuwb)
3. Click on "SQL Editor" in the left sidebar

## Step 2: Run this SQL
```sql
-- Add 2FA fields to User table
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "totpSecret" TEXT,
ADD COLUMN IF NOT EXISTS "totpEnabled" BOOLEAN NOT NULL DEFAULT false;
```

## Step 3: Verify
Run this query to verify the columns were added:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'User'
  AND column_name IN ('totpSecret', 'totpEnabled');
```

Expected result:
- totpSecret | text | YES
- totpEnabled | boolean | NO

## Step 4: Update Prisma Migration Status
After running the SQL manually, mark the migration as applied:
```bash
cd apps/backend
DATABASE_URL="postgresql://postgres:2Solanasbesta99%21@db.nkiezfkiasqgefzgyuwb.supabase.co:5432/postgres?sslmode=require" npx prisma migrate resolve --applied 20251013000000_add_2fa_fields
```
