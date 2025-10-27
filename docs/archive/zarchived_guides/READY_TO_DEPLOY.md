# 🚀 Solotto Mainnet - Ready to Deploy

**Status:** ✅ All prerequisites completed
**Date:** October 22, 2025
**Next Step:** Production deployment to Render + Vercel

---

## What's Been Completed ✅

### Development & Testing
- ✅ **E2E Test Suite** - Full lifecycle testing implemented
- ✅ **2FA Authentication** - TOTP-based operator authentication
- ✅ **Jupiter Integration** - SOL→LOTTO swaps with fallback
- ✅ **Staging Deployment** - Successfully deployed and tested
- ✅ **Core Modules** - Control, Snapshot, Drawing, Harvest, Distribution
- ✅ **Network Separation** - Devnet/mainnet database filtering
- ✅ **Security Hardening** - Rate limiting, CORS, input validation

### Configuration Files Created
- ✅ `apps/backend/.env.production` - Backend mainnet config
- ✅ `apps/frontend/.env.production` - Frontend mainnet config
- ✅ Deployment guide and checklist documents

### Deployment Tools
- ✅ `scripts/generate-jwt-secret.js` - Generate secure JWT secret
- ✅ `scripts/verify-production-config.js` - Verify config before deploy
- ✅ `scripts/smoke-test.sh` - Post-deployment verification

---

## What You Need to Do Next

### Step 1: Configure Production Secrets (15 minutes)

**1.1 Generate JWT Secret**
```bash
node scripts/generate-jwt-secret.js
```
Copy output to `apps/backend/.env.production` → `JWT_SECRET`

**1.2 Get Mainnet Alchemy API Key**
1. Visit [https://dashboard.alchemy.com](https://dashboard.alchemy.com)
2. Create app: "Solotto Production - Mainnet"
3. Select **Solana Mainnet**
4. Copy API key
5. Update in both `.env.production` files

**1.3 Configure Operator Wallet**
> **NOTE:** Your architecture uses **frontend signing** via Phantom!
> You DON'T need to configure a backend private key.

- Operator should have a mainnet Phantom wallet
- Fund with 0.1-1 SOL for transaction fees
- Operator will connect wallet in dashboard and sign distributions there
- Update `apps/backend/.env.production` → `OPERATOR_WALLET_PRIVATE_KEY="NOT_USED_FRONTEND_SIGNING"`

**1.4 Set Up Sentry**
1. Create project at [https://sentry.io](https://sentry.io)
2. Copy DSN
3. Update `apps/backend/.env.production` → `SENTRY_DSN`

**1.5 Verify Configuration**
```bash
node scripts/verify-production-config.js
```
Fix any errors or warnings before proceeding.

---

### Step 2: Deploy to Render.com (20 minutes)

**2.1 Create Render Service**
1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect GitHub: `solotto-lottery-dapp`

**2.2 Configure Service**
- **Root Directory:** `apps/backend`
- **Build Command:** `npm ci && npx prisma generate && npm run build`
- **Start Command:** `npm run start`
- **Instance Type:** Starter ($7/month)
- **Node Version:** 20.x (in Environment variables: `NODE_VERSION=20`)

**2.3 Add Environment Variables**
Copy all variables from `apps/backend/.env.production` to Render environment tab.

**⚠️ CRITICAL: Database Connection Strings**

Render requires **Session Pooler** connection strings (IPv4 compatible):

```env
# Get from Supabase: Database Settings → Connection String → Session pooler
DATABASE_URL=postgresql://postgres.nkiezfkiasqgefzgyuwb:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres
DATABASE_URL_RO=postgresql://postgres.nkiezfkiasqgefzgyuwb:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres
DATABASE_URL_DIRECT=postgresql://postgres:[PASSWORD]@db.nkiezfkiasqgefzgyuwb.supabase.co:5432/postgres?sslmode=require
```

**Important:**
- Use `pooler.supabase.com` (NOT `db.supabase.co`)
- URL-encode password special characters: `!` → `%21`, `$` → `%24`, `@` → `%40`
- Remove `?pgbouncer=true` from the URL

**Other Critical Variables:**
- `NODE_ENV=production`
- `SOLANA_NETWORK=mainnet-beta`
- `LOTTO_MINT_ADDRESS=HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump`
- `NPM_CONFIG_PRODUCTION=false` ← **REQUIRED for build to succeed**
- Your JWT_SECRET, Alchemy key

**2.4 Deploy**
1. Click "Create Web Service"
2. Build will take ~3-5 minutes
3. If build fails with TypeScript errors, ensure `NPM_CONFIG_PRODUCTION=false` is set
4. Wait for "Your service is live 🎉" message

**2.5 Test Backend**
```bash
curl https://[your-app].onrender.com/api/v1/health
```
Expected: `{"ok": true, "database": "healthy"}`

---

### Step 3: Deploy to Vercel (15 minutes)

**3.1 Create Vercel Project**
1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import from GitHub: `solotto-lottery-dapp`

**3.2 Configure Project**
- **Framework:** Next.js
- **Root Directory:** `apps/frontend`
- **Build Command:** `npm run build`

**3.3 Add Environment Variables**
Copy all variables from `apps/frontend/.env.production` to Vercel.

**Important:** Update `NEXT_PUBLIC_BACKEND_URL` to your Render backend URL.

**3.4 Deploy**
Click "Deploy" and wait (~2-3 minutes).

**3.5 Test Frontend**
Visit your Vercel URL and verify:
- Homepage loads
- Transparency portal works
- Operator login page accessible

---

### Step 4: Post-Deployment Verification (15 minutes)

**4.1 Run Smoke Tests**
```bash
bash scripts/smoke-test.sh https://[your-render-app].onrender.com
```

**4.2 Test Operator Login**
1. Visit `https://[your-vercel-url]/operator`
2. Login with operator credentials
3. Verify 2FA works
4. Check dashboard shows "mainnet-beta"

**4.3 Monitor Logs**
- Check Render logs for errors
- Verify database connection successful
- Verify RPC connection to mainnet

---

### Step 5: Set Up Monitoring (20 minutes)

**5.1 Configure Sentry Alerts**
- Error rate > 5% → Email
- New issues → Email

**5.2 Set Up UptimeRobot**
Create monitors for:
- Backend: `https://api.solotto.live/api/v1/health` (every 5 min)
- Frontend: `https://solotto.live` (every 5 min)

**5.3 Check Supabase Monitoring**
Enable alerts in Supabase dashboard:
- Disk usage > 70%
- Active connections > 80%

---

### Step 6: First Production Round (1-2 days after deployment)

**Wait 24-48 hours** to ensure everything is stable, then:

**6.1 Configure First Round (Low Stakes)**
- Prize pool: 2-5 SOL
- Minimum LOTTO: 5-10 USD worth
- Snapshot window: 24 hours
- Standard tier distribution: 50/30/15/5

**6.2 Execute Round**
1. Create round in operator dashboard
2. Announce to community
3. Wait for snapshot window
4. Execute snapshot → drawing → harvest → distribution
5. Verify winners receive prizes

**6.3 Verify Transparency**
Check transparency portal shows all correct data.

---

## Timeline Estimate

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Configure Secrets | 15 min | 15 min |
| Deploy Backend | 20 min | 35 min |
| Deploy Frontend | 15 min | 50 min |
| Verification | 15 min | 65 min |
| Set Up Monitoring | 20 min | 85 min |
| **Total Deployment** | **~1.5 hours** | |
| Monitor (24-48h) | 2 days | |
| First Round | 24-48h | |

**Total time to first production round: 3-5 days**

---

## Documentation Reference

| Document | Purpose |
|----------|---------|
| [MAINNET_DEPLOYMENT_GUIDE.md](MAINNET_DEPLOYMENT_GUIDE.md) | Detailed step-by-step deployment guide |
| [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) | Quick checklist for deployment tasks |
| [MAINNET_DEPLOYMENT_PLAN.md](MAINNET_DEPLOYMENT_PLAN.md) | Comprehensive deployment plan (updated) |
| `apps/backend/.env.production` | Backend production configuration |
| `apps/frontend/.env.production` | Frontend production configuration |

---

## Scripts Available

```bash
# Generate secure JWT secret
node scripts/generate-jwt-secret.js

# Verify production configuration
node scripts/verify-production-config.js

# Run post-deployment smoke tests
bash scripts/smoke-test.sh https://api.solotto.live
```

---

## Success Criteria

Your mainnet deployment is successful when:

- ✅ Backend deployed and health check returns 200
- ✅ Frontend deployed and accessible
- ✅ Operator can login with 2FA
- ✅ Dashboard shows "mainnet-beta" network
- ✅ All smoke tests pass
- ✅ Monitoring alerts configured
- ✅ 24+ hours of stable operation
- ✅ First round completes successfully
- ✅ Winners receive prizes correctly

---

## Emergency Contacts

**If something goes wrong:**

- **Backend Issues:** Check Render logs, rollback if needed
- **Frontend Issues:** Check Vercel logs, rollback if needed
- **Database Issues:** Check Supabase dashboard
- **RPC Issues:** Check Alchemy dashboard

**Support:**
- Render: support@render.com
- Vercel: https://vercel.com/support
- Supabase: support@supabase.io
- Alchemy: https://www.alchemy.com/support

---

## Security Reminders

- 🔒 Never commit `.env.production` files to Git
- 🔒 Store operator wallet backup securely
- 🔒 Rotate JWT secret monthly
- 🔒 Monitor Sentry for security issues
- 🔒 Keep all dependencies updated
- 🔒 Review access logs regularly

---

## What's Different from Staging?

**Environment:**
- Network: devnet → **mainnet-beta**
- Token: Test token → **HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump**
- RPC: Devnet Alchemy → **Mainnet Alchemy**
- Database: Same Supabase (filtered by network field)

**Real Money:**
- Prize pools use real SOL
- Jupiter swaps use real LOTTO liquidity
- Transaction fees from production wallet
- Winners receive real tokens

**Monitoring:**
- Sentry error tracking enabled
- UptimeRobot monitoring enabled
- Alerts configured for issues

---

## Ready to Go! 🚀

You've completed all the hard work:
- ✅ Built and tested all features
- ✅ Implemented security (2FA, rate limiting)
- ✅ Tested on staging
- ✅ Created deployment configurations
- ✅ Prepared monitoring and tools

**Next action:** Follow the steps above to deploy to production!

**Estimated time commitment:**
- Initial deployment: 1.5-2 hours
- Monitoring period: 24-48 hours (passive)
- First round: 1 hour setup + 24-48 hours execution

---

**Questions or Issues?**
- Review the detailed [MAINNET_DEPLOYMENT_GUIDE.md](MAINNET_DEPLOYMENT_GUIDE.md)
- Check the [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)
- Verify configuration with `node scripts/verify-production-config.js`

**Good luck with your mainnet launch!** 🎰🚀
