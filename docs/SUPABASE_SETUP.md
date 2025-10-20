# Supabase Pro Setup Guide - Solotto Lottery

This guide walks you through setting up Supabase Pro as the PostgreSQL hosting provider for the Solotto lottery dApp mainnet deployment.

## Phase 1: Supabase Account & Database Provisioning

### Step 1: Create Supabase Account
1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "Sign up"
3. Sign up with GitHub (recommended for better integration) or email
4. Verify your email address

### Step 2: Create New Organization (If Needed)
1. Click on your profile (top right) → "New organization"
2. Name it: `solotto-mainnet` or your preferred name
3. Select billing region: **US East (recommended)** - closest to Solana mainnet validators

### Step 3: Create New Project
1. Click "New project"
2. Fill in project details:
   ```
   Name: solotto-mainnet-db
   Database Password: [Generate strong password - SAVE THIS!]
   Region: East US (North Virginia)
   Pricing Plan: Pro ($25/month)
   ```
3. Click "Create new project"
4. Wait 2-3 minutes for provisioning

### Step 4: Upgrade to Pro Plan
1. Go to Project Settings → Billing
2. Click "Upgrade to Pro"
3. Add payment method
4. Confirm upgrade ($25/month + usage)

**Pro Plan Benefits:**
- ✅ 8 GB disk size (expandable)
- ✅ 100,000 monthly active users
- ✅ Daily backups stored for 7 days
- ✅ 7-day log retention
- ✅ Email support
- ✅ No connection limits (auto-scaling)

---

## Phase 2: Database Security Configuration

### Step 1: Get Connection Details
1. Go to Project Settings → Database
2. Note down these connection details:

**Connection Info:**
```
Host: db.<project-ref>.supabase.co
Database name: postgres
Port: 5432
User: postgres
Password: [your password from Step 3]
```

**Connection String (Pooler - Recommended):**
```
postgresql://postgres.CONNECTION-POOLING-ENABLED:[password]@[host]:6543/postgres?pgbouncer=true
```

**Direct Connection String:**
```
postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
```

### Step 2: Configure SSL/TLS
✅ **Supabase enforces SSL by default** - no action needed!

Verify SSL is required in connection strings:
```bash
# Connection strings should include sslmode parameter
?sslmode=require
```

### Step 3: Network Security

**Option A: Allow All (Development/Testing Only)**
- Default Supabase setting
- Uses SSL encryption
- ⚠️ Not recommended for production

**Option B: IP Allowlist (Recommended for Production)**
1. Go to Project Settings → Database → Connection Pooling
2. Scroll to "Network Restrictions"
3. Add your backend server's public IP address(es)
4. Format: `52.1.2.3/32` (single IP) or `52.1.2.0/24` (range)

**Option C: Private Network (Enterprise)**
- Requires AWS PrivateLink or similar
- Contact Supabase support for setup

### Step 4: Database Roles & Permissions

Supabase creates a `postgres` superuser by default. We need to create:
1. `solotto_app` - Read/write role for backend operations
2. `solotto_ro` - Read-only role for public endpoints

**Create these roles via Supabase SQL Editor:**

1. Go to SQL Editor in Supabase dashboard
2. Click "New query"
3. Paste and run this SQL:

```sql
-- ===============================================
-- Solotto Database Roles Setup
-- Run this in Supabase SQL Editor
-- ===============================================

-- 1. Create application role (read/write)
CREATE ROLE solotto_app LOGIN PASSWORD 'REPLACE_WITH_STRONG_PASSWORD_1';

-- 2. Create read-only role (for public endpoints)
CREATE ROLE solotto_ro LOGIN PASSWORD 'REPLACE_WITH_STRONG_PASSWORD_2';

-- 3. Grant connection privileges
GRANT CONNECT ON DATABASE postgres TO solotto_app, solotto_ro;
GRANT USAGE ON SCHEMA public TO solotto_app, solotto_ro;

-- 4. Grant read/write privileges to solotto_app
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO solotto_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO solotto_app;

-- 5. Make grants apply to future tables (important for migrations)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO solotto_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO solotto_app;

-- 6. Grant read-only privileges to solotto_ro
GRANT SELECT ON ALL TABLES IN SCHEMA public TO solotto_ro;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO solotto_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO solotto_ro;

-- 7. Verify roles were created
SELECT rolname, rolcanlogin, rolsuper FROM pg_roles
WHERE rolname IN ('solotto_app', 'solotto_ro');
```

**Expected Output:**
```
 rolname      | rolcanlogin | rolsuper
--------------+-------------+----------
 solotto_app  | t           | f
 solotto_ro   | t           | f
```

---

## Phase 3: Backup & Monitoring Configuration

### Step 1: Configure Automated Backups
1. Go to Project Settings → Database → Backups
2. **Verify daily backups are enabled** (Pro plan includes this)
3. Retention: 7 days (Pro plan default)
4. Consider upgrading to 14-day retention if needed

**Manual Backup Before Migration:**
```bash
# If you have existing data, create backup first
pg_dump -h db.<project-ref>.supabase.co -p 5432 -U postgres -d postgres > backup_pre_migration_$(date +%Y%m%d).sql
```

### Step 2: Set Up Monitoring & Alerts
1. Go to Project Settings → Database → Reports
2. Enable these alerts in your email settings:
   - ✅ Database size approaching limit (>6GB = 75%)
   - ✅ Unusual connection spikes
   - ✅ Query performance degradation

3. Install Supabase CLI for monitoring:
```bash
npm install -g supabase
supabase login
```

### Step 3: Configure Connection Pooling (PgBouncer)
✅ **Supabase includes PgBouncer by default on port 6543**

**Use pooler for application connections:**
```env
# Use port 6543 for pooled connections (recommended)
DATABASE_URL="postgresql://postgres:[password]@db.[project-ref].supabase.co:6543/postgres?pgbouncer=true&sslmode=require"

# Use port 5432 for migrations and admin tasks
DATABASE_URL_DIRECT="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?sslmode=require"
```

**Pooling Configuration:**
- Pool mode: Transaction (default)
- Max connections: Auto-scaled based on plan
- Idle timeout: 10 seconds

---

## Phase 4: Local Testing & Connection Verification

### Step 1: Update Local Environment
Create a new `.env.supabase` file for testing:

```bash
# apps/backend/.env.supabase
# DO NOT COMMIT THIS FILE

# Supabase Connection (Pooled - for application)
DATABASE_URL="postgresql://solotto_app:YOUR_APP_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:6543/postgres?pgbouncer=true&sslmode=require"

# Supabase Read-Only Connection
DATABASE_URL_RO="postgresql://solotto_ro:YOUR_RO_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:6543/postgres?pgbouncer=true&sslmode=require"

# Supabase Direct Connection (for migrations only)
DATABASE_URL_DIRECT="postgresql://postgres:YOUR_POSTGRES_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres?sslmode=require"

# Keep existing Solana config (devnet for testing)
SOLANA_NETWORK="devnet"
ALCHEMY_API_KEY="OdXuOSa1pQHZbiyFRjxF_"
ALCHEMY_RPC_URL="https://solana-devnet.g.alchemy.com/v2/OdXuOSa1pQHZbiyFRjxF_"
SOLANA_RPC_FALLBACK="https://api.devnet.solana.com"

LOTTO_MINT_ADDRESS="your_devnet_token_mint_address"
LOTTO_DECIMALS=6

JWT_SECRET="changeme"
PORT=4000

OPERATOR_WALLET_PRIVATE_KEY="your_base58_encoded_private_key"
HARD_BLACKLIST='["11111111111111111111111111111111"]'
```

### Step 2: Test Database Connection
```bash
cd apps/backend

# Test with Supabase config
cp .env.supabase .env

# Test connection using Prisma
npx prisma db pull

# Expected output: "Introspecting based on datasource defined in prisma/schema.prisma"
# Should succeed even with empty database
```

### Step 3: Verify Connection with PostgreSQL Client
```bash
# Install PostgreSQL client (if not already installed)
# Windows: https://www.postgresql.org/download/windows/

# Test direct connection
psql "postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres?sslmode=require"

# Once connected, run:
\l          # List databases
\du         # List users (should see solotto_app, solotto_ro)
\q          # Quit
```

---

## Phase 5: Run Prisma Migrations

### Step 1: Prepare Migration
```bash
cd apps/backend

# Ensure you're using the direct connection for migrations
# Update .env temporarily or use environment variable
export DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres?sslmode=require"
```

### Step 2: Run Migrations
```bash
# Deploy all migrations to Supabase
npx prisma migrate deploy

# Expected output:
# 4 migrations found in prisma/migrations
# Applying migration `20251007000824_init`
# Applying migration `20251008151652_add_is_eligible_to_participant`
# Applying migration `20251012084500_add_trading_activity_fields`
# Applying migration `20251012222131_add_network_to_rounds`
# The following migrations have been applied:
# migrations/
#   └─ 20251007000824_init/
#   └─ 20251008151652_add_is_eligible_to_participant/
#   └─ 20251012084500_add_trading_activity_fields/
#   └─ 20251012222131_add_network_to_rounds/
```

### Step 3: Verify Schema
```bash
# Open Prisma Studio to inspect tables
npx prisma studio

# Or use Supabase Table Editor
# Go to Supabase Dashboard → Table Editor
```

**Expected Tables:**
- User
- LotteryConfig
- Round
- Participant
- Snapshot
- Drawing
- _prisma_migrations (internal)

### Step 4: Re-run Role Grants (Important!)
After migrations, re-run the role permissions SQL:

```sql
-- Run this again in Supabase SQL Editor to ensure permissions on new tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO solotto_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO solotto_app;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO solotto_ro;
```

---

## Phase 6: Seed Test Data & Verification

### Step 1: Create Test Operator User
```bash
cd apps/backend

# Start your backend with Supabase connection
npm run dev

# In another terminal, create operator user via API
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator@solotto.test",
    "password": "TestPassword123!"
  }'

# Expected: {"userId": "...", "message": "User registered"}
```

### Step 2: Test Authentication
```bash
# Login to get JWT token
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator@solotto.test",
    "password": "TestPassword123!"
  }'

# Expected: {"token": "eyJhbGc...", "userId": "..."}
```

### Step 3: Test Database Operations
```bash
# Create a test round (requires JWT from login)
curl -X POST http://localhost:4000/api/v1/control \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "tokenMint": "So11111111111111111111111111111111111111112",
    "tokenDecimals": 9,
    "snapshotStart": "2025-01-15T00:00:00Z",
    "snapshotEnd": "2025-01-22T00:00:00Z",
    "tradePercentage": 5.0,
    "minUsdLottoRequired": 50.0,
    "prizeDistributionPercent": 70.0,
    "slippageTolerancePercent": 0.5,
    "blacklist": []
  }'

# Expected: 201 Created with round ID
```

### Step 4: Verify Read-Only Connection
```bash
# Test history endpoint (uses DATABASE_URL_RO)
curl http://localhost:4000/api/v1/history/rounds

# Expected: JSON array of rounds (may be empty initially)

# Verify solotto_ro cannot write
# Try to insert via SQL Editor using solotto_ro credentials
# Should fail with "permission denied"
```

---

## Phase 7: Connection String Reference

### Development Environment (.env.supabase)
```env
# Pooled connection for application
DATABASE_URL="postgresql://solotto_app:APP_PASSWORD@db.PROJECT_REF.supabase.co:6543/postgres?pgbouncer=true&sslmode=require"

# Read-only pooled connection
DATABASE_URL_RO="postgresql://solotto_ro:RO_PASSWORD@db.PROJECT_REF.supabase.co:6543/postgres?pgbouncer=true&sslmode=require"
```

### Migration/Admin Tasks
```env
# Direct connection (no pooler) for Prisma migrations
DATABASE_URL="postgresql://postgres:POSTGRES_PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require"
```

### Production Environment
```env
# Same as development, but:
# 1. Use strong passwords (64+ chars recommended)
# 2. Store in secrets manager (AWS Secrets Manager, Doppler, etc.)
# 3. Enable IP allowlist in Supabase settings
# 4. Rotate passwords quarterly
```

---

## Phase 8: Performance Optimization

### Step 1: Enable Connection Pooling
✅ Already enabled via port 6543 with `?pgbouncer=true`

### Step 2: Configure Prisma Connection Pool
Update `apps/backend/src/prisma.ts`:

```typescript
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production'
      ? ['error', 'warn']
      : ['query', 'error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Prisma connection pool settings
    // Note: With Supabase PgBouncer, keep pool small (5-10)
    // PgBouncer handles connection pooling at infrastructure level
  });
```

### Step 3: Create Indexes for Performance
Run this SQL in Supabase SQL Editor:

```sql
-- Verify indexes were created by migrations
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Expected indexes:
-- Round: network, drawingDate
-- Participant: wallet, createdAt

-- Add additional indexes if needed for your queries
CREATE INDEX IF NOT EXISTS idx_round_status ON "Round"(network, "drawingDate")
  WHERE "drawingDate" IS NOT NULL;
```

---

## Phase 9: Monitoring & Maintenance

### Daily Checks
1. **Supabase Dashboard** → Database Health
   - Connection count (<100 normal)
   - Disk usage (<6GB = 75% of 8GB)
   - Query performance (p95 <200ms)

2. **Backup Status**
   - Verify daily backups are completing
   - Test restore monthly

3. **Error Logs**
   - Check Supabase Logs → Postgres Logs
   - Look for connection errors, slow queries

### Weekly Tasks
1. Review top slow queries (Dashboard → Database → Query Performance)
2. Check disk growth rate (Dashboard → Database → Usage)
3. Verify read replica lag (if using replicas in future)

### Monthly Tasks
1. Test backup restore procedure
2. Review and rotate credentials if needed
3. Audit user permissions
4. Review database statistics and optimize

---

## Troubleshooting

### Connection Refused
```
Error: connect ECONNREFUSED
```
**Solution:**
- Verify project is not paused (free tier auto-pauses)
- Check IP allowlist settings
- Verify password is correct (no special chars causing issues)

### SSL Certificate Error
```
Error: self signed certificate
```
**Solution:**
- Add `?sslmode=require` to connection string
- Update Node.js to latest LTS version

### Migration Fails
```
Error: relation "table_name" already exists
```
**Solution:**
```bash
# Reset migration state
npx prisma migrate resolve --applied 20251007000824_init
npx prisma migrate resolve --applied 20251008151652_add_is_eligible_to_participant
# etc...
```

### Role Permission Denied
```
Error: permission denied for table "Round"
```
**Solution:**
- Re-run role grants SQL from Phase 2, Step 4
- Ensure default privileges are set for future tables

### Connection Pool Exhausted
```
Error: remaining connection slots are reserved
```
**Solution:**
- Use pooled connection (port 6543) instead of direct (port 5432)
- Verify `?pgbouncer=true` in connection string
- Consider upgrading plan if consistently hitting limits

---

## Security Checklist

- [ ] Strong passwords for all database users (20+ characters)
- [ ] SSL/TLS enabled (verify `sslmode=require`)
- [ ] IP allowlist configured (production only)
- [ ] Read-only role configured and tested
- [ ] Credentials stored in secrets manager (not in code)
- [ ] Automated backups enabled and tested
- [ ] Monitoring alerts configured
- [ ] Access logs reviewed monthly
- [ ] Password rotation schedule (quarterly recommended)

---

## Next Steps

1. ✅ Complete Supabase setup following this guide
2. ✅ Test all endpoints with Supabase connection
3. ✅ Create mainnet environment variables (separate from devnet)
4. ✅ Set up secrets management (AWS Secrets Manager, Doppler, etc.)
5. ✅ Deploy backend to production with Supabase DATABASE_URL
6. ✅ Monitor first 48 hours of production usage

---

## Support Resources

- **Supabase Documentation**: https://supabase.com/docs/guides/database
- **Supabase Discord**: https://discord.supabase.com
- **Prisma + Supabase Guide**: https://www.prisma.io/docs/guides/deployment/supabase
- **Solotto Project Issues**: Document any blockers for team review

---

**Last Updated**: 2025-01-13
**Maintained By**: Solotto DevOps Team
