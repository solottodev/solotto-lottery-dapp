# Mainnet Deployment Guide - Step by Step

**Status:** Ready for Production Deployment
**Date:** October 22, 2025
**Deployment Target:** Mainnet-Beta

---

## Prerequisites Completed ✅
- Testing: E2E tests implemented and passing
- 2FA: Operator authentication with TOTP
- Jupiter Integration: SOL→LOTTO swaps with fallback
- Staging Deployment: Successfully deployed and tested

---

## Phase 1: Pre-Deployment Configuration (30-45 minutes)

### 1.1 Generate Production Secrets

```bash
# Generate strong JWT secret (64 characters)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Action:** Copy output and update `apps/backend/.env.production` → `JWT_SECRET`

### 1.2 Set Up Mainnet Alchemy API

1. Go to [https://dashboard.alchemy.com](https://dashboard.alchemy.com)
2. Create new app: "Solotto Production - Mainnet"
3. Select **Solana Mainnet**
4. Copy API key

**Action:** Update both environment files:
- `apps/backend/.env.production` → `ALCHEMY_API_KEY` and `ALCHEMY_RPC_URL`
- `apps/frontend/.env.production` → `NEXT_PUBLIC_RPC_URL`

### 1.3 Configure Production Operator Wallet

**Option A: Create New Mainnet Wallet**
```bash
solana-keygen new --outfile operator-mainnet.json
solana-keygen pubkey operator-mainnet.json
```

**Option B: Use Existing Wallet**
```bash
# Convert to base58 format
solana-keygen export operator-mainnet.json
```

**Action:** Update `apps/backend/.env.production` → `OPERATOR_WALLET_PRIVATE_KEY`

**Important:**
- Fund this wallet with SOL for transaction fees (minimum 1 SOL recommended)
- Store backup of keypair in secure location (encrypted USB, password manager)

### 1.4 Set Up Sentry Error Monitoring

1. Go to [https://sentry.io](https://sentry.io)
2. Create new project: "Solotto Backend Production"
3. Select **Node.js** as platform
4. Copy DSN

**Action:** Update `apps/backend/.env.production` → `SENTRY_DSN`

### 1.5 Verify Database Configuration

Your Supabase database is already configured with network separation. Verify:

```sql
-- Connect to database and check configuration
SELECT network, COUNT(*) FROM "Round" GROUP BY network;
```

**Expected:** Devnet rounds exist, ready to add mainnet rounds.

---

## Phase 2: Render.com Backend Deployment (20-30 minutes)

### 2.1 Create Render Account & Service

1. Go to [https://dashboard.render.com](https://dashboard.render.com)
2. Sign up or log in
3. Click **New +** → **Web Service**
4. Connect GitHub repository: `solotto-lottery-dapp`

### 2.2 Configure Render Service

**Basic Settings:**
- Name: `solotto-backend-production`
- Region: `Oregon (US West)` (closest to Solana validators)
- Branch: `main`
- Root Directory: `apps/backend`
- Runtime: `Node`
- Build Command: `npm install && npx prisma generate && npm run build`
- Start Command: `npm run start`
- Instance Type: `Starter` ($7/month)

### 2.3 Environment Variables on Render

Go to **Environment** tab and add ALL variables from `apps/backend/.env.production`:

| Key | Value | Notes |
|-----|-------|-------|
| NODE_ENV | `production` | |
| PORT | `3000` | Render default |
| DATABASE_URL | `postgresql://solotto_app:...` | Copy from .env.production |
| DATABASE_URL_RO | `postgresql://solotto_ro:...` | Copy from .env.production |
| DATABASE_URL_DIRECT | `postgresql://postgres:...` | For migrations only |
| JWT_SECRET | `[YOUR_64_CHAR_SECRET]` | Generated in 1.1 |
| SOLANA_NETWORK | `mainnet-beta` | |
| ALCHEMY_API_KEY | `[YOUR_API_KEY]` | From 1.2 |
| ALCHEMY_RPC_URL | `https://solana-mainnet.g.alchemy.com/v2/[KEY]` | From 1.2 |
| SOLANA_RPC_FALLBACK | `https://api.mainnet-beta.solana.com` | |
| LOTTO_MINT_ADDRESS | `HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump` | Mainnet token |
| LOTTO_DECIMALS | `6` | |
| OPERATOR_WALLET_PRIVATE_KEY | `[YOUR_BASE58_KEY]` | From 1.3 |
| HARD_BLACKLIST | `["11111111111111111111111111111111","2CqSCmGSa3V7mdbHSFftSVJJ9qpLyPK5TSSNSRCQWJte"]` | |
| SENTRY_DSN | `[YOUR_SENTRY_DSN]` | From 1.4 |
| ALLOWED_ORIGINS | `https://solotto.live` | Your domain |

### 2.4 Deploy Backend

1. Click **Create Web Service**
2. Render will automatically deploy from GitHub
3. Monitor build logs (takes 3-5 minutes)
4. Wait for **Live** status

### 2.5 Configure Custom Domain (Optional)

1. Go to **Settings** → **Custom Domain**
2. Add domain: `api.solotto.live`
3. Update DNS records (A or CNAME) as shown
4. Wait for SSL certificate (automatic, 5-10 minutes)

### 2.6 Test Backend Deployment

```bash
# Test health endpoint
curl https://solotto-backend-production.onrender.com/api/v1/health

# Expected response:
{"ok": true, "database": "healthy"}
```

---

## Phase 3: Vercel Frontend Deployment (15-20 minutes)

### 3.1 Install Vercel CLI (if not already installed)

```bash
npm install -g vercel
vercel login
```

### 3.2 Configure Frontend Environment

1. Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import GitHub repository: `solotto-lottery-dapp`

### 3.3 Vercel Project Settings

**Framework Preset:** Next.js
**Root Directory:** `apps/frontend`
**Build Command:** `npm run build`
**Output Directory:** `.next`

### 3.4 Environment Variables on Vercel

Go to **Settings** → **Environment Variables** and add:

| Key | Value | Environment |
|-----|-------|-------------|
| NEXT_PUBLIC_SOLANA_NETWORK | `mainnet-beta` | Production |
| NEXT_PUBLIC_NETWORK | `mainnet-beta` | Production |
| NEXT_PUBLIC_RPC_URL | `https://solana-mainnet.g.alchemy.com/v2/[KEY]` | Production |
| NEXT_PUBLIC_LOTTO_MINT | `HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump` | Production |
| NEXT_PUBLIC_BACKEND_URL | `https://api.solotto.live` | Production |

**Note:** Use your Render backend URL (either custom domain or `.onrender.com`)

### 3.5 Deploy Frontend

**Option A: Via Vercel Dashboard**
1. Click **Deploy**
2. Wait for build to complete (2-3 minutes)

**Option B: Via CLI**
```bash
cd apps/frontend
vercel --prod
```

### 3.6 Configure Custom Domain (Optional)

1. Go to **Settings** → **Domains**
2. Add domain: `solotto.live`
3. Update DNS records as shown
4. Wait for SSL certificate (automatic)

### 3.7 Test Frontend Deployment

```bash
# Test homepage
curl -I https://solotto.live

# Expected: HTTP 200 OK
```

Visit in browser: `https://solotto.live`

---

## Phase 4: Post-Deployment Verification (20-30 minutes)

### 4.1 Smoke Tests

**Backend API Tests:**
```bash
# Health check
curl https://api.solotto.live/api/v1/health

# Status check (requires auth)
# First, login to get JWT token via frontend operator dashboard

# History endpoint
curl https://api.solotto.live/api/v1/history/rounds?limit=1

# Stats endpoint
curl https://api.solotto.live/api/v1/history/stats
```

**Frontend Tests:**
1. Visit `https://solotto.live` - homepage loads
2. Visit `https://solotto.live/transparency` - portal works
3. Visit `https://solotto.live/operator` - login page loads
4. Test operator login with 2FA
5. Verify dashboard shows network: `mainnet-beta`
6. Check wallet adapter connects to mainnet

### 4.2 Operator Dashboard Verification

1. Login as operator with email + password
2. Enter 2FA TOTP code
3. Verify you see operator dashboard
4. Check that network shows **mainnet-beta**
5. Do NOT create a round yet - just verify access

### 4.3 Database Connection Test

Check Render logs for successful database connection:
```
✅ Database connection successful
✅ Network: mainnet-beta
✅ Connected to Supabase
```

### 4.4 RPC Connection Test

Check that backend connects to mainnet:
```bash
# View Render logs
# Look for: "Connected to Solana mainnet-beta via Alchemy"
```

---

## Phase 5: Monitoring Setup (20-30 minutes)

### 5.1 Configure Sentry Alerts

1. Go to Sentry project settings
2. Enable alerts:
   - Error rate > 5% in 5 minutes → Email
   - New issue created → Email
   - Response time p95 > 1 second → Email

### 5.2 Set Up UptimeRobot

1. Go to [https://uptimerobot.com](https://uptimerobot.com)
2. Create monitors:

**Monitor 1: Backend Health**
- Name: Solotto API Health
- Type: HTTP(s)
- URL: `https://api.solotto.live/api/v1/health`
- Interval: 5 minutes
- Alert: Email if down 2x

**Monitor 2: Frontend**
- Name: Solotto Frontend
- Type: HTTP(s)
- URL: `https://solotto.live`
- Interval: 5 minutes
- Alert: Email if down 2x

### 5.3 Configure Supabase Alerts

1. Go to Supabase Dashboard
2. Project Settings → Monitoring
3. Enable alerts:
   - Disk usage > 70%
   - Active connections > 80%

---

## Phase 6: First Production Round (1-2 days)

### 6.1 Pre-Round Checklist

- [ ] Backend deployed and healthy (24+ hours)
- [ ] Frontend deployed and accessible
- [ ] Operator can login with 2FA
- [ ] Database showing mainnet-beta network
- [ ] Monitoring alerts configured
- [ ] Operator wallet funded with SOL (minimum 1 SOL)
- [ ] Team briefed on launch plan

### 6.2 Create First Test Round (Low Stakes)

**Recommended Configuration:**
```json
{
  "snapshotStart": "[TODAY + 1 hour]",
  "snapshotEnd": "[TODAY + 25 hours]",
  "drawTime": "[TODAY + 26 hours]",
  "tradePercentage": 100,
  "minUsdLottoRequired": 5,
  "prizeDistributionPercent": 80,
  "slippageTolerancePercent": 0.5,
  "prizeSourceWallet": "[YOUR_INFRASTRUCTURE_WALLET]",
  "blacklistWallets": []
}
```

**Prize Pool:** 2-5 SOL (small test)

**Tier Distribution:**
- Tier 1 (50%): 1-2.5 SOL
- Tier 2 (30%): 0.6-1.5 SOL
- Tier 3 (15%): 0.3-0.75 SOL
- Tier 4 (5%): 0.1-0.25 SOL

### 6.3 Monitor Round Execution

1. Create round via operator dashboard
2. Wait for snapshot window to close
3. Execute snapshot (verify participant count)
4. Execute drawing (verify winners selected)
5. Execute harvest (verify prize calculations)
6. Execute distribution (monitor Jupiter swaps)
7. Verify winners receive prizes on-chain

### 6.4 Community Announcement

After successful first round:

**Template:**
```
🎰 Solotto is LIVE on Mainnet! 🚀

We've successfully completed our first production lottery round on Solana mainnet.

✅ Total Prize Pool: [X SOL / Y LOTTO]
✅ Total Participants: [N wallets]
✅ Winners Paid: [W winners]
✅ Transparency: https://solotto.live/transparency

Next round starts [DATE/TIME]. Hold LOTTO tokens to participate!

Token: HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump
```

---

## Phase 7: Post-Launch Monitoring (48 hours)

### 7.1 Monitor Error Rates

- Check Sentry dashboard every 6 hours
- Review Render logs daily
- Watch for RPC connection issues
- Monitor database performance

### 7.2 Performance Metrics

Track these metrics:
- Response times (p50, p95, p99)
- Error rate (target: <0.1%)
- Uptime (target: 99.9%)
- Database query times
- RPC latency

### 7.3 Community Feedback

- Monitor Discord/Twitter for issues
- Respond to questions quickly
- Document any bugs reported
- Plan improvements for next rounds

---

## Rollback Procedure (Emergency)

### If Critical Issue Detected:

**Backend Rollback:**
1. Go to Render Dashboard → Deploys
2. Find previous working deploy
3. Click "Rollback to this deploy"
4. Wait 2-3 minutes

**Frontend Rollback:**
```bash
vercel rollback [previous-deployment-url]
```

**Database Rollback (LAST RESORT):**
1. Supabase Dashboard → Database → Backups
2. Select backup timestamp
3. Click "Restore" (WARNING: loses all data after backup)

---

## Security Checklist

- [ ] All environment variables encrypted on Render
- [ ] JWT secret is strong (64+ characters)
- [ ] Operator wallet backed up securely
- [ ] Database passwords rotated
- [ ] CORS restricted to production domain
- [ ] Rate limiting enabled on API
- [ ] 2FA enabled for operator account
- [ ] Sentry error tracking active
- [ ] Uptime monitoring active
- [ ] Supabase IP allowlist configured (optional)

---

## Support & Resources

**Documentation:**
- Deployment Plan: `MAINNET_DEPLOYMENT_PLAN.md`
- Operator Runbook: Create after first successful round
- API Documentation: In codebase

**Service Dashboards:**
- Backend: https://dashboard.render.com
- Frontend: https://vercel.com/dashboard
- Database: https://supabase.com/dashboard
- Monitoring: https://sentry.io
- Uptime: https://uptimerobot.com

**Emergency Contacts:**
- Render Support: support@render.com
- Vercel Support: https://vercel.com/support
- Supabase Support: support@supabase.io

---

## Next Steps After Launch

1. **Week 1:** Monitor closely, gather feedback, fix any bugs
2. **Week 2:** Run second round with larger prize pool
3. **Week 3:** Implement community requested features
4. **Week 4:** Scale up operations, regular weekly rounds

---

**Deployment Status:** Ready to Execute
**Estimated Total Time:** 2-3 hours for deployment + 24-48 hours monitoring
**Risk Level:** Medium (mitigated with staging testing)

Good luck with your mainnet launch! 🚀
