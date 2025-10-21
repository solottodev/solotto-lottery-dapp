# Staging Deployment Guide
## Render (Backend) + Vercel (Frontend) Setup

**Environment:** Devnet Testing
**Duration:** 2-3 hours
**Prerequisites:** GitHub repository, Render account, Vercel account

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Render Backend Setup](#render-backend-setup)
3. [Vercel Frontend Setup](#vercel-frontend-setup)
4. [Database Configuration](#database-configuration)
5. [Testing Deployment](#testing-deployment)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Accounts
- ✅ GitHub account (repository access)
- ✅ Render account ([render.com](https://render.com)) - Free tier OK for staging
- ✅ Vercel account ([vercel.com](https://vercel.com)) - Free tier OK for staging
- ✅ Supabase account (already set up)
- ✅ Alchemy account (upgrade to Pay-As-You-Go recommended)

### Required Information
- Supabase connection strings (from existing `.env`)
- Alchemy API key (devnet)
- Operator wallet private key (devnet test wallet)
- JWT secret (generate new for staging)

---

## Render Backend Setup

### Step 1: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended for easy repo connection)
3. Verify email address

### Step 2: Create New Web Service

1. Click "New +" → "Web Service"
2. Connect GitHub repository:
   - Click "Connect account" if first time
   - Select `solotto-lottery-dapp` repository
   - Grant Render access

3. Configure service:
   ```
   Name: solotto-backend-staging
   Region: Oregon (us-west) or nearest
   Branch: main
   Root Directory: apps/backend
   Runtime: Node
   Build Command: npm install && npx prisma generate && npm run build
   Start Command: npm start
   ```

   **Note:** The build command explicitly runs `prisma generate` to ensure the Prisma client is available during build.

4. Select Instance Type:
   - **Free** - Good for staging testing
   - **Starter** ($7/mo) - Better performance, recommended

### Step 3: Configure Environment Variables

Click "Environment" tab and add these variables:

```env
# Server
NODE_ENV=staging
PORT=3000

# Database (Supabase) - IMPORTANT: Use POOLER connection for Render!
# Render requires the pooler endpoint (port 6543), NOT direct connection (port 5432)
# URL-encode special characters in password: $ → %24, @ → %40, # → %23
DATABASE_URL=postgresql://postgres.nkiezfkiasqgefzgyuwb:REPLACE_WITH_URL_ENCODED_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
DATABASE_URL_RO=postgresql://postgres.nkiezfkiasqgefzgyuwb:REPLACE_WITH_URL_ENCODED_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# JWT Secret (generate new)
JWT_SECRET=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# Solana (DEVNET)
SOLANA_NETWORK=devnet
ALCHEMY_API_KEY=<YOUR_ALCHEMY_API_KEY>
ALCHEMY_RPC_URL=https://solana-devnet.g.alchemy.com/v2/<YOUR_ALCHEMY_API_KEY>
SOLANA_RPC_FALLBACK=https://api.devnet.solana.com

# Token (DEVNET)
LOTTO_MINT_ADDRESS=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
LOTTO_DECIMALS=6

# Hard Blacklist
HARD_BLACKLIST=["11111111111111111111111111111111"]
```

**⚠️ IMPORTANT:**
- **URL-encode special characters** in database password (`$` → `%24`, `@` → `%40`, `#` → `%23`)
- Generate a NEW JWT_SECRET for staging (don't reuse production)
- **Use YOUR Alchemy API key** - Get it from: [Alchemy Dashboard](https://dashboard.alchemy.com/) → Your App → API Key
  - Copy the same key you're using in your local `apps/backend/.env` file
  - The key should work with `https://solana-devnet.g.alchemy.com/v2/<YOUR_KEY>`
- **NO operator wallet private key needed** - operator connects via Phantom wallet in frontend
- Never commit secrets to Git
- Do NOT add `?pgbouncer=true` to connection strings - it causes authentication issues

### Step 4: Verify Build Scripts

Ensure `apps/backend/package.json` has these scripts:

```json
{
  "scripts": {
    "build": "prisma generate && tsc",
    "start": "node dist/index.js",
    "postinstall": "prisma generate",
    "dev": "ts-node src/index.ts"
  }
}
```

**Important:** The `postinstall` script ensures Prisma client is generated after `npm install`.

### Step 5: Deploy

1. Click "Create Web Service"
2. Wait for build to complete (~3-5 minutes)
3. Check logs for errors
4. Note the deployment URL: `https://solotto-backend-staging.onrender.com`

### Step 6: Verify Deployment

Test root endpoint (doesn't require database):

```bash
curl https://solotto-backend-staging.onrender.com/

# Expected response:
{
  "status": "ok",
  "service": "Solotto Backend API",
  "version": "1.0.0",
  "timestamp": "2025-10-21T...",
  "docs": "/api/v1/docs"
}
```

Then test database health:

```bash
curl https://solotto-backend-staging.onrender.com/api/v1/health

# Expected response:
{
  "ok": true,
  "database": "healthy"
}
```

---

## Vercel Frontend Setup

### Step 1: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Verify email

### Step 2: Import Project

1. Click "Add New..." → "Project"
2. Select "Import Git Repository"
3. Choose `solotto-lottery-dapp` repository
4. Configure:
   ```
   Framework Preset: Next.js
   Root Directory: apps/frontend
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

### Step 3: Configure Environment Variables

Add these variables in "Environment Variables" section:

```env
# Solana (DEVNET)
NEXT_PUBLIC_SOLANA_NETWORK=devnet
NEXT_PUBLIC_RPC_URL=https://solana-devnet.g.alchemy.com/v2/<YOUR_ALCHEMY_API_KEY>

# Token (DEVNET)
NEXT_PUBLIC_LOTTO_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
NEXT_PUBLIC_NETWORK=devnet

# Backend API (Render staging URL)
NEXT_PUBLIC_BACKEND_URL=https://solotto-backend-staging.onrender.com
```

**⚠️ Important Notes:**
- Use the actual Render URL from the backend deployment
- **Use YOUR Alchemy API key** - same key from your local `apps/frontend/.env` file
- The frontend and backend can use the same Alchemy API key or different ones

### Step 4: Deploy

1. Click "Deploy"
2. Wait for build (~2-3 minutes)
3. Note the deployment URL: `https://solotto-frontend-staging.vercel.app`

### Step 5: Set Up Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add custom domain (e.g., `staging.solotto.live`)
3. Update DNS records as instructed
4. Wait for SSL certificate (automatic)

### Step 6: Enable Preview Deployments

Vercel automatically creates preview deployments for:
- Every Git push to branches
- Every pull request

Preview URLs: `https://solotto-frontend-<branch>-<hash>.vercel.app`

---

## Database Configuration

### Supabase Setup (Already Done)

Your Supabase is already configured with:
- ✅ Database: `postgres` on `nkiezfkiasqgefzgyuwb.supabase.co`
- ✅ Roles: `postgres` (admin), `solotto_app` (read/write), `solotto_ro` (read-only)
- ✅ Connection pooling: Port 6543 (pooled), Port 5432 (direct)

### Network Filtering

Data is filtered by `network` field:
- **Devnet:** `network='devnet'` (staging data)
- **Mainnet:** `network='mainnet-beta'` (production data)

This allows using the same database for both environments safely.

### Run Migrations and Fix Permissions

**Step 1: Deploy Prisma migrations**

```bash
# From apps/backend directory (local machine)
npx prisma migrate deploy
```

**Note:** Run this from your local machine with your `.env` file configured. If a migration fails partially, you can resolve it:
```bash
# If migration fields already exist in database, mark as applied:
npx prisma migrate resolve --applied "migration_name"

# Then retry deploy:
npx prisma migrate deploy
```

**Step 2: Fix Supabase Permissions (CRITICAL)**

After running migrations, you must fix table permissions for the `postgres` user:

1. Go to Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `apps/backend/prisma/migrations/fix_supabase_permissions.sql`
4. Click **Run**
5. Verify success - you should see "Success. No rows returned"

**What this does:**
- Grants full permissions to the `postgres` role on all tables
- Disables Row Level Security (RLS) - not needed for backend-only apps
- Fixes the "RLS Disabled in Public" warnings you see in Supabase dashboard
- Resolves "Tenant or user not found" connection errors

**Why this is needed:**
- Prisma migrations create tables but don't set up Supabase-specific permissions
- Without proper grants, the connection pooler can't access tables
- RLS is designed for Supabase Auth, which we're not using (we use JWT auth in backend)

---

## Testing Deployment

### 1. Test Backend Health

```bash
# Health check
curl https://solotto-backend-staging.onrender.com/api/v1/health

# RPC health
curl https://solotto-backend-staging.onrender.com/api/v1/health/rpc

# Database stats (public endpoint)
curl https://solotto-backend-staging.onrender.com/api/v1/history/stats
```

### 2. Test Frontend

1. Open `https://solotto-frontend-staging.vercel.app`
2. Check:
   - ✅ Page loads without errors
   - ✅ Solana network shows "devnet"
   - ✅ Wallet connection works
   - ✅ API calls to backend succeed

### 3. Create and Test Operator Login

**Note:** The frontend does not have a registration UI. You must create operator accounts via API.

#### Option A: Register New Operator via API

```bash
# Create new operator account for staging
curl -X POST https://solotto-backend-staging.onrender.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "operator-staging@solotto.io",
    "password": "YourStrongPassword123!"
  }'

# Response will include a JWT token:
# {"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."}
```

#### Option B: Use Existing Local Development Account

If you've been developing locally, your operator account already exists in the shared Supabase database and can be used on staging.

#### Test Operator Login

1. Open your staging frontend
2. Click "Authenticate as Operator" button (top-right)
3. Enter your credentials:
   ```
   Email: operator-staging@solotto.io (or your local account email)
   Password: <your-password>
   ```
4. Click "Sign in"
5. If successful, you'll see "Logged in • Logout"

#### Set up 2FA (Optional but Recommended)

After logging in, set up 2FA via API:

```bash
# Get JWT token from login response, then:
curl -X POST https://solotto-backend-staging.onrender.com/auth/setup-2fa \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Response includes QR code data URL - scan with Google Authenticator
# Then verify with:
curl -X POST https://solotto-backend-staging.onrender.com/auth/verify-2fa \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"totpCode":"123456"}'

# Logout and login again - you'll now be prompted for 2FA code
```

### 4. Test Full Lifecycle

Run through complete lottery flow:

#### A. Create Round Configuration
```
Token: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU (devnet)
Snapshot Start: Now
Snapshot End: +24 hours
Prize Distribution: 50%
Min LOTTO: 10,000
Prize Source: <your-funded-devnet-wallet>
```

#### B. Run Snapshot
- Click "Run Snapshot"
- Wait for completion (~30 seconds with RPC fallback)
- Verify participants fetched

#### C. Confirm Snapshot
- Review participant list
- Click "Confirm Snapshot"
- Verify eligibility calculated

#### D. Run Drawing
- Click "Run Drawing"
- Verify winners selected
- Check audit trail (seed, blockhash, slot)

#### E. Confirm Drawing
- Review winners
- Click "Confirm Drawing"
- Verify round updated

#### F. Prepare Harvest
- Connect wallet (funded devnet wallet)
- Click "Prepare Harvest"
- Verify prize pool calculated

#### G. Prepare Distribution
- Choose "Send SOL" (easier for testing)
- Click "Prepare Distribution"
- Review transaction

#### H. Broadcast Distribution
- Sign transaction with wallet
- Broadcast to devnet
- Verify winners receive prizes

### 5. Test Transparency Portal

1. Go to `/transparency` page
2. Check:
   - ✅ Devnet rounds displayed
   - ✅ Winner addresses shown
   - ✅ Audit trails visible
   - ✅ Transaction signatures linked

---

## Monitoring & Logs

### Render Logs

1. Go to Render Dashboard → solotto-backend-staging
2. Click "Logs" tab
3. View real-time logs
4. Filter by level (Info, Warn, Error)

**Useful Log Searches:**
```
❌  - Find errors
🚀  - Find startup events
✅  - Find success events
🎰  - Find drawing events
```

### Vercel Logs

1. Go to Vercel Dashboard → Project
2. Click "Functions" → "Logs"
3. View deployment logs and runtime logs

### Database Monitoring

1. Go to Supabase Dashboard
2. Navigate to "Database" → "Logs"
3. Monitor slow queries and errors

---

## Troubleshooting

### Backend Won't Start

**Symptom:** Build fails or service crashes

**Common Causes:**
1. Missing environment variables
   - Check all required vars are set
   - Verify DATABASE_URL format

2. Database connection errors
   - Test connection string locally
   - Check Supabase IP allowlist (if enabled)
   - Verify password is URL-encoded if it contains special characters

3. Build errors
   - Check build logs in Render
   - Verify `package.json` scripts
   - Try building locally first

**Debug Steps:**
```bash
# Local build test
cd apps/backend
npm install
npm run build
npm start
```

### Database Connection Error: "Tenant or user not found"

**Symptom:** Error in logs: `FATAL: Tenant or user not found`

**Root Cause:** This Supabase error means one of:
1. Password contains special characters that need URL encoding
2. Incorrect connection pooler endpoint
3. Database user doesn't exist or wrong credentials

**Solution:**

1. **URL-encode your password** if it contains special characters:
   - `$` should be `%24`
   - `@` should be `%40`
   - `#` should be `%23`
   - Example: `Beanie22$` becomes `Beanie22%24`

2. **Get correct connection string from Supabase:**
   - Go to Supabase Dashboard → Project Settings → Database
   - Use "Connection Pooling" section (Session mode)
   - Copy the full connection string
   - Port should be 6543 for pooling

3. **Correct format:**
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```

4. **Update Render environment variables:**
   - Remove `?pgbouncer=true` from the end (causes issues)
   - Ensure password is URL-encoded
   - Test with direct connection first (port 5432) if pooling fails

**Example Fix:**
```env
# BEFORE (might fail)
DATABASE_URL=postgresql://postgres.nkiezfkiasqgefzgyuwb:Beanie22$@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# AFTER (should work)
DATABASE_URL=postgresql://postgres.nkiezfkiasqgefzgyuwb:Beanie22%24@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### Supabase RLS Warnings: "RLS Disabled in Public"

**Symptom:** Supabase dashboard shows RLS warnings on all tables

**Root Cause:** This is actually **two separate issues**:

1. **Missing table permissions** - Prisma migrations don't grant access to the `postgres` role
2. **RLS not configured** - Not a problem for backend-only apps

**Impact:**
- The warnings themselves are harmless (RLS isn't needed for backend-only apps)
- BUT the missing permissions cause database connection failures
- Backend can't query tables without proper grants

**Solution:**

Run the permissions fix script:

```bash
# 1. Go to Supabase Dashboard → SQL Editor
# 2. Click "New Query"
# 3. Copy contents of: apps/backend/prisma/migrations/fix_supabase_permissions.sql
# 4. Paste and click "Run"
```

This will:
- Grant full permissions to `postgres` role
- Explicitly disable RLS (removes warnings)
- Allow backend to access all tables

**After running the script:**
- RLS warnings will disappear
- Database connection errors will be resolved
- Health check should return `{"ok":true,"database":"healthy"}`

### Frontend API Errors

**Symptom:** 404 or CORS errors when calling backend

**Solution:**
1. Verify `NEXT_PUBLIC_BACKEND_URL` is correct
2. Check Render backend is running
3. Test backend health endpoint directly
4. Check CORS configuration in backend:

```typescript
// apps/backend/src/index.ts
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://solotto.live', 'https://solotto-frontend-staging.vercel.app']
    : '*',
  credentials: true,
}));
```

### Database Connection Pool Errors

**Symptom:** "Too many connections" or "Connection pool exhausted"

**Solution:**
1. Use pooled connection (port 6543)
2. Reduce connection pool size in Prisma:

```typescript
// apps/backend/src/prisma.ts
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Add connection pool config
  __internal: {
    engine: {
      connectionLimit: 5, // Reduce for free tier
    },
  },
});
```

### RPC Rate Limiting

**Symptom:** "429 Too Many Requests" from Alchemy

**Solution:**
1. Upgrade Alchemy to Pay-As-You-Go tier
2. Implement request caching
3. Use fallback RPC for non-critical requests

### Slow Deployments

**Render:**
- Free tier has slower builds
- Upgrade to Starter tier ($7/mo) for faster deploys

**Vercel:**
- Usually fast (~2-3 minutes)
- Check build logs for dependency issues

---

## Automatic Deployments

### Render (Backend)

Configure auto-deploy on Git push:
1. Go to Settings → Build & Deploy
2. Enable "Auto-Deploy"
3. Branch: `main`
4. Deploy on push: ✅ Enabled

### Vercel (Frontend)

Vercel automatically deploys:
- **Production:** Pushes to `main` branch
- **Preview:** Pushes to any branch
- **PR Preview:** Every pull request

### Disable Auto-Deploy (Optional)

For manual control:
- Render: Settings → Disable "Auto-Deploy"
- Vercel: Settings → Git → Disable "Automatic Deployments"

---

## Security Checklist

Before going live on staging:

- [ ] All environment variables set correctly
- [ ] No secrets committed to Git
- [ ] JWT_SECRET is unique and strong (64+ chars)
- [ ] Operator wallet is devnet only (no real funds)
- [ ] Database uses connection pooling (port 6543)
- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] 2FA working for operator login
- [ ] HTTPS enabled (automatic on Render/Vercel)
- [ ] Logs don't expose sensitive data

---

## Cost Estimate (Staging)

### Free Tier (Testing)
```
Render: $0/month (Free tier)
Vercel: $0/month (Hobby tier)
Supabase: $0/month (Free tier)
Alchemy: ~$0/month (Pay-As-You-Go, low usage)
TOTAL: $0/month
```

### Recommended Tier (Better Performance)
```
Render: $7/month (Starter)
Vercel: $0/month (Hobby tier sufficient)
Supabase: $25/month (Pro tier)
Alchemy: ~$5/month (Pay-As-You-Go)
TOTAL: ~$37/month
```

---

## Next Steps After Deployment

1. ✅ Verify all services healthy
2. ✅ Run E2E tests against staging
3. ✅ Test complete lifecycle with funded wallets
4. ✅ Load test with 100+ participants
5. ✅ Document any issues
6. ✅ Fix bugs discovered
7. ✅ Prepare for mainnet deployment (Phase 3)

---

## Support & Resources

### Render
- [Docs](https://render.com/docs)
- [Status](https://status.render.com/)
- [Community](https://community.render.com/)

### Vercel
- [Docs](https://vercel.com/docs)
- [Status](https://www.vercel-status.com/)
- [Support](https://vercel.com/support)

### Supabase
- [Docs](https://supabase.com/docs)
- [Status](https://status.supabase.com/)
- [Support](https://supabase.com/support)

---

**Guide Version:** 1.0
**Last Updated:** October 20, 2025
**Maintainer:** Solotto Development Team
