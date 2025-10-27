# Supabase Quick Start Checklist

Quick reference for setting up Supabase Pro for Solotto mainnet deployment.

## Prerequisites
- [ ] Supabase account with billing enabled
- [ ] Payment method added
- [ ] Node.js 20+ and npm installed
- [ ] PostgreSQL client installed (optional, for testing)

---

## 1. Create Supabase Project (5 minutes)

1. **Sign up / Log in**: https://supabase.com
2. **Create Organization**: `solotto-mainnet`
3. **Create Project**:
   - Name: `solotto-mainnet-db`
   - Password: **[Generate and SAVE in password manager]**
   - Region: `East US (North Virginia)`
   - Plan: `Pro ($25/month)`

**Save these immediately:**
- [ ] Project Reference (from URL): `[project-ref]`
- [ ] Database Password: `************`
- [ ] Host: `db.[project-ref].supabase.co`

---

## 2. Configure Environment (5 minutes)

```bash
cd apps/backend

# Copy example file
cp .env.supabase.example .env.supabase

# Edit .env.supabase and fill in:
# - YOUR_PROJECT_REF (from step 1)
# - YOUR_POSTGRES_PASSWORD (from step 1)
```

**Update these variables in `.env.supabase`:**
```env
DATABASE_URL="postgresql://solotto_app:CHANGE_ME@db.YOUR_PROJECT_REF.supabase.co:6543/postgres?pgbouncer=true&sslmode=require"
DATABASE_URL_RO="postgresql://solotto_ro:CHANGE_ME@db.YOUR_PROJECT_REF.supabase.co:6543/postgres?pgbouncer=true&sslmode=require"
DATABASE_URL_DIRECT="postgresql://postgres:YOUR_POSTGRES_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres?sslmode=require"
```

**Note:** Leave `CHANGE_ME` for now - we'll set these after creating roles.

---

## 3. Run Migrations (2 minutes)

**Option A: Windows**
```bash
cd apps/backend
scripts\migrate-to-supabase.bat
```

**Option B: Mac/Linux**
```bash
cd apps/backend
chmod +x scripts/migrate-to-supabase.sh
./scripts/migrate-to-supabase.sh
```

**Option C: Manual**
```bash
cd apps/backend
set DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres?sslmode=require
npx prisma migrate deploy
```

**Expected output:**
```
✅ Applying migration `20251007000824_init`
✅ Applying migration `20251008151652_add_is_eligible_to_participant`
✅ Applying migration `20251012084500_add_trading_activity_fields`
✅ Applying migration `20251012222131_add_network_to_rounds`
```

---

## 4. Create Database Roles (3 minutes)

1. **Go to Supabase Dashboard** → SQL Editor
2. **Click "New query"**
3. **Open file**: `apps/backend/prisma/supabase-init-roles.sql`
4. **Generate two strong passwords** (32+ chars each):
   ```bash
   # Generate password 1 (solotto_app)
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

   # Generate password 2 (solotto_ro)
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
5. **Save passwords in password manager**
6. **Replace placeholders** in SQL:
   - `REPLACE_WITH_STRONG_PASSWORD_1` → solotto_app password
   - `REPLACE_WITH_STRONG_PASSWORD_2` → solotto_ro password
7. **Click "Run"** in Supabase SQL Editor

**Expected output:**
```
✅ Created role: solotto_app
✅ Created role: solotto_ro
(3 rows showing postgres, solotto_app, solotto_ro)
```

8. **Update `.env.supabase`** with the generated passwords:
   ```env
   DATABASE_URL="postgresql://solotto_app:PASSWORD_1@db.PROJECT_REF.supabase.co:6543/postgres?pgbouncer=true&sslmode=require"
   DATABASE_URL_RO="postgresql://solotto_ro:PASSWORD_2@db.PROJECT_REF.supabase.co:6543/postgres?pgbouncer=true&sslmode=require"
   ```

---

## 5. Test Connection (2 minutes)

```bash
cd apps/backend

# Copy Supabase env to active .env for testing
cp .env.supabase .env

# Run connection test
npx ts-node scripts/test-supabase-connection.ts
```

**Expected output:**
```
✅ 1. Main Database Connection (solotto_app) (123ms)
   Connected successfully

✅ 2. Read-Only Connection (solotto_ro) (98ms)
   Connected successfully

✅ 3. Database Schema Verification (234ms)
   All 7 expected tables exist

✅ 4. Role Permissions (456ms)
   Write blocked on read-only connection (correct)

Total: 4 tests | Passed: 4 | Failed: 0
🎉 All tests passed! Your Supabase database is ready.
```

---

## 6. Verify in Supabase Dashboard (2 minutes)

### Check Tables
1. **Go to**: Table Editor
2. **Verify tables exist**:
   - [ ] User
   - [ ] LotteryConfig
   - [ ] Round
   - [ ] Participant
   - [ ] Snapshot
   - [ ] Drawing
   - [ ] _prisma_migrations

### Check Roles
1. **Go to**: Database → Roles
2. **Verify roles exist**:
   - [ ] postgres (superuser)
   - [ ] solotto_app (login)
   - [ ] solotto_ro (login)

### Check Indexes
1. **Go to**: Database → Indexes
2. **Verify indexes on Round table**:
   - [ ] `Round_network_idx`
   - [ ] `Round_drawingDate_idx`

---

## 7. Test Backend API (5 minutes)

```bash
cd apps/backend

# Start backend with Supabase connection
npm run dev
```

**Test 1: Health Check**
```bash
curl http://localhost:4000/api/v1/health
# Expected: {"ok": true, "database": "healthy"}
```

**Test 2: Create Operator User**
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator@solotto.test",
    "password": "StrongPassword123!"
  }'
# Expected: {"userId": "...", "message": "User registered"}
```

**Test 3: Login**
```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator@solotto.test",
    "password": "StrongPassword123!"
  }'
# Expected: {"token": "eyJhbGc...", "userId": "..."}
# SAVE THE TOKEN!
```

**Test 4: Create Round (requires token from Test 3)**
```bash
curl -X POST http://localhost:4000/api/v1/control \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "tokenMint": "So11111111111111111111111111111111111111112",
    "tokenDecimals": 9,
    "snapshotStart": "2025-01-20T00:00:00Z",
    "snapshotEnd": "2025-01-27T00:00:00Z",
    "tradePercentage": 5.0,
    "minUsdLottoRequired": 50.0,
    "prizeDistributionPercent": 70.0,
    "slippageTolerancePercent": 0.5,
    "blacklist": []
  }'
# Expected: 201 Created with round data
```

**Test 5: Verify Round in Database**
- Go to Supabase → Table Editor → Round
- Should see 1 row with network="devnet"

---

## 8. Security Configuration (Production Only)

### Enable IP Allowlist
1. **Go to**: Project Settings → Database → Network Restrictions
2. **Add your server IP(s)**:
   ```
   52.1.2.3/32    # Example: Backend server IP
   ```
3. **Save changes**

### Configure Monitoring
1. **Go to**: Project Settings → Integrations
2. **Enable**:
   - [ ] Email alerts for database issues
   - [ ] Slack notifications (optional)
   - [ ] Datadog integration (optional)

### Verify Backups
1. **Go to**: Database → Backups
2. **Verify**:
   - [ ] Daily backups enabled
   - [ ] 7-day retention (Pro default)
   - [ ] Last backup timestamp shows recent date

---

## 9. Mainnet Preparation (Before Launch)

### Update Environment Variables
```bash
# apps/backend/.env.production
SOLANA_NETWORK="mainnet-beta"
ALCHEMY_API_KEY="your_mainnet_alchemy_key"
ALCHEMY_RPC_URL="https://solana-mainnet.g.alchemy.com/v2/your_key"
LOTTO_MINT_ADDRESS="your_mainnet_token_mint"
OPERATOR_WALLET_PRIVATE_KEY="your_mainnet_wallet_key"
JWT_SECRET="64_char_random_string_for_production"
```

### Security Checklist
- [ ] All passwords are 32+ characters
- [ ] Passwords stored in secrets manager (not in .env files)
- [ ] JWT_SECRET is strong random string (64+ chars)
- [ ] IP allowlist configured for production server
- [ ] Operator wallet private keys secured (hardware wallet/KMS)
- [ ] Removed test data auto-copy feature (deployment_actions.md:37)

---

## Common Issues & Solutions

### Connection Refused
**Problem:** `Error: connect ECONNREFUSED`

**Solution:**
- Verify project is not paused (Supabase Dashboard → Home)
- Check connection string has correct project-ref
- Ensure password has no special chars causing parsing issues
- Try direct connection (port 5432) to isolate pooler issues

### Permission Denied
**Problem:** `Error: permission denied for table "Round"`

**Solution:**
- Re-run `supabase-init-roles.sql` in SQL Editor
- Verify roles exist: `SELECT * FROM pg_roles WHERE rolname LIKE 'solotto%'`
- Check default privileges were granted for future tables

### Migration Already Applied
**Problem:** `Migration "X" has already been applied`

**Solution:**
```bash
# Mark migrations as resolved
npx prisma migrate resolve --applied 20251007000824_init
# Repeat for each migration
```

### SSL Certificate Error
**Problem:** `Error: self signed certificate`

**Solution:**
- Add `?sslmode=require` to connection string
- Update Node.js to latest LTS version
- Verify using port 6543 (pooler) or 5432 (direct)

---

## Quick Reference

### Connection Strings Format
```
# Pooled (Application)
postgresql://USER:PASSWORD@db.PROJECT_REF.supabase.co:6543/postgres?pgbouncer=true&sslmode=require

# Direct (Migrations)
postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?sslmode=require
```

### Important Files
- `docs/SUPABASE_SETUP.md` - Full detailed guide
- `apps/backend/.env.supabase.example` - Environment template
- `apps/backend/prisma/supabase-init-roles.sql` - Role setup SQL
- `apps/backend/scripts/test-supabase-connection.ts` - Connection tester
- `deployment_actions.md` - Mainnet deployment checklist

### Useful Commands
```bash
# Test connection
npx ts-node scripts/test-supabase-connection.ts

# Run migrations
npx prisma migrate deploy

# Open Prisma Studio
npx prisma studio

# Generate Prisma Client
npx prisma generate

# Check migration status
npx prisma migrate status
```

---

## Support

- **Supabase Docs**: https://supabase.com/docs/guides/database
- **Supabase Discord**: https://discord.supabase.com
- **Prisma Docs**: https://www.prisma.io/docs
- **Full Setup Guide**: `docs/SUPABASE_SETUP.md`

---

**Last Updated**: 2025-01-13
**Estimated Time**: ~25 minutes total
