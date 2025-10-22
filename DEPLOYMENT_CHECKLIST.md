# Mainnet Deployment Checklist

**Quick reference for mainnet deployment**

---

## Pre-Deployment (Before Starting)

### Configuration Files
- [ ] Created [apps/backend/.env.production](apps/backend/.env.production)
- [ ] Created [apps/frontend/.env.production](apps/frontend/.env.production)
- [ ] Run `node scripts/verify-production-config.js` - all checks pass

### Secrets & API Keys
- [ ] Generated strong JWT secret (64+ chars)
  ```bash
  node scripts/generate-jwt-secret.js
  ```
- [ ] Obtained mainnet Alchemy API key from [dashboard.alchemy.com](https://dashboard.alchemy.com)
- [ ] Configured production operator wallet (funded with 1+ SOL)
- [ ] Created Sentry project and obtained DSN
- [ ] All secrets updated in `.env.production` files

### Database
- [ ] Supabase database accessible from Render
- [ ] Database roles configured (solotto_app, solotto_ro)
- [ ] Network field in database supports 'mainnet-beta'
- [ ] Manual backup created (optional but recommended)

---

## Render.com Backend Deployment

### Account Setup
- [ ] Render account created/logged in
- [ ] GitHub repository connected

### Service Configuration
- [ ] Web Service created
- [ ] Repository: `solotto-lottery-dapp` connected
- [ ] Branch: `main`
- [ ] Root Directory: `apps/backend`
- [ ] Build Command: `npm install && npx prisma generate && npm run build`
- [ ] Start Command: `npm run start`
- [ ] Instance Type: Starter ($7/month) or higher

### Environment Variables
- [ ] All variables from `.env.production` added to Render
- [ ] **CRITICAL:** Database uses Session Pooler connection string:
  - [ ] Format: `postgresql://postgres.PROJECT:[PASSWORD]@aws-1-us-east-1.pooler.supabase.com:5432/postgres`
  - [ ] Password is URL-encoded (`!` → `%21`, `$` → `%24`, `@` → `%40`)
  - [ ] No `?pgbouncer=true` in URL
- [ ] **CRITICAL:** `NPM_CONFIG_PRODUCTION=false` added (required for TypeScript build)
- [ ] Verified mainnet configuration:
  - [ ] `SOLANA_NETWORK="mainnet-beta"`
  - [ ] `LOTTO_MINT_ADDRESS="HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump"`
  - [ ] Mainnet Alchemy RPC URL
  - [ ] Production JWT secret
  - [ ] ~~Operator wallet private key~~ (NOT NEEDED - uses frontend Phantom signing)

### Deployment
- [ ] Clicked "Create Web Service"
- [ ] Build completed successfully (check logs)
- [ ] Service status shows "Live"
- [ ] Health endpoint returns 200:
  ```bash
  curl https://[your-app].onrender.com/api/v1/health
  ```

### Custom Domain (Optional)
- [ ] Added custom domain: `api.solotto.live`
- [ ] DNS records updated
- [ ] SSL certificate issued (automatic)

---

## Vercel Frontend Deployment

### Account Setup
- [ ] Vercel account created/logged in
- [ ] Vercel CLI installed: `npm install -g vercel`

### Project Configuration
- [ ] Project imported from GitHub
- [ ] Framework Preset: Next.js
- [ ] Root Directory: `apps/frontend`
- [ ] Build Command: `npm run build`

### Environment Variables
- [ ] All variables from frontend `.env.production` added
- [ ] Verified:
  - [ ] `NEXT_PUBLIC_SOLANA_NETWORK="mainnet-beta"`
  - [ ] `NEXT_PUBLIC_LOTTO_MINT="HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump"`
  - [ ] `NEXT_PUBLIC_BACKEND_URL` points to Render backend
  - [ ] Mainnet Alchemy RPC URL

### Deployment
- [ ] Deployed via dashboard or CLI: `vercel --prod`
- [ ] Build completed successfully
- [ ] Site accessible at Vercel URL
- [ ] Homepage loads correctly

### Custom Domain (Optional)
- [ ] Added custom domain: `solotto.live`
- [ ] DNS records updated
- [ ] SSL certificate issued (automatic)

---

## Post-Deployment Verification

### Smoke Tests
- [ ] Run smoke test script:
  ```bash
  bash scripts/smoke-test.sh https://api.solotto.live
  ```
- [ ] All endpoints return 200 OK
- [ ] Health check shows database healthy

### Frontend Tests
- [ ] Homepage loads: `https://solotto.live`
- [ ] Transparency portal works: `https://solotto.live/transparency`
- [ ] Operator login page loads: `https://solotto.live/operator`

### Operator Dashboard
- [ ] Login with email + password
- [ ] 2FA TOTP verification works
- [ ] Dashboard shows network: **mainnet-beta**
- [ ] Can access all operator pages (don't create round yet)

### Connectivity
- [ ] Backend connects to Supabase (check Render logs)
- [ ] Backend connects to Alchemy mainnet RPC (check logs)
- [ ] Frontend connects to backend API
- [ ] Wallet adapter connects to mainnet

---

## Monitoring Setup

### Sentry
- [ ] Sentry project created for production
- [ ] DSN configured in backend environment
- [ ] Test error logged and appears in Sentry dashboard
- [ ] Alert rules configured:
  - [ ] Error rate > 5% → Email
  - [ ] New issue → Email

### UptimeRobot
- [ ] Account created at [uptimerobot.com](https://uptimerobot.com)
- [ ] Monitor 1: Backend health (`/api/v1/health`) - every 5 min
- [ ] Monitor 2: Frontend homepage - every 5 min
- [ ] Email alerts configured

### Supabase
- [ ] Monitoring tab checked in Supabase dashboard
- [ ] Alerts enabled:
  - [ ] Disk usage > 70%
  - [ ] Active connections > 80%

---

## Security Verification

- [ ] All passwords rotated from defaults
- [ ] JWT secret is strong (64+ characters)
- [ ] Operator wallet private key secured
- [ ] Wallet backup stored in safe location
- [ ] CORS restricted to production domain
- [ ] Environment variables encrypted on Render/Vercel
- [ ] No secrets committed to Git (check with `git log -p | grep -i "password\|secret\|key"`)
- [ ] 2FA enabled for operator account

---

## Pre-Launch (24 Hours Before First Round)

- [ ] All systems running smoothly for 24+ hours
- [ ] No errors in Sentry
- [ ] Uptime monitors showing 100% uptime
- [ ] Database performance normal (check Supabase dashboard)
- [ ] Operator wallet funded with 1+ SOL
- [ ] Infrastructure wallet has prize pool funds ready

---

## First Production Round

### Configuration
- [ ] Prize pool: 2-5 SOL (small test)
- [ ] Minimum LOTTO: 5-10 USD worth
- [ ] Snapshot window: 24 hours
- [ ] Prize distribution: 50/30/15/5 (standard)

### Execution
- [ ] Created round via operator dashboard
- [ ] Announced to community (Discord/Twitter)
- [ ] Snapshot window opened (users can participate)
- [ ] Snapshot executed after window closes
- [ ] Verified participant count looks correct
- [ ] Drawing executed
- [ ] Winners verified in dashboard
- [ ] Harvest calculated correctly
- [ ] Distribution prepared (Jupiter swaps tested)
- [ ] Distribution broadcast successful
- [ ] Winners received prizes (verified on Solscan)

### Transparency
- [ ] Round visible on transparency portal
- [ ] All data correct (participants, winners, prizes)
- [ ] Audit trail complete (seed, blockhash, slot)
- [ ] Community can verify results

---

## Post-Launch (48 Hours)

### Monitoring
- [ ] Check Sentry for errors (every 6 hours)
- [ ] Review Render logs (daily)
- [ ] Monitor database performance (daily)
- [ ] Check response times (target: p95 <500ms)
- [ ] Verify uptime (target: 99.9%+)

### Community
- [ ] Gather feedback from first round participants
- [ ] Answer questions on Discord/social media
- [ ] Document any issues or bugs
- [ ] Plan improvements for next round

### Documentation
- [ ] Update deployment plan with lessons learned
- [ ] Create operator runbook (if not already done)
- [ ] Document any configuration changes
- [ ] Archive old/outdated documentation

---

## Success Metrics

**Deployment is considered successful if:**
- ✅ 99.9%+ uptime in first 48 hours
- ✅ Error rate <0.1%
- ✅ First round completes successfully
- ✅ Winners receive prizes correctly
- ✅ No critical security issues
- ✅ Community feedback positive
- ✅ All monitoring alerts working

---

## Rollback Plan (If Needed)

### Backend Rollback
1. Go to Render Dashboard → Deploys
2. Find previous working deploy
3. Click "Rollback to this deploy"
4. Wait 2-3 minutes, verify health check

### Frontend Rollback
```bash
vercel rollback [previous-url]
```
Or via Vercel dashboard → Deployments → Promote previous

### Database Rollback (LAST RESORT)
1. Supabase Dashboard → Database → Backups
2. Select backup timestamp
3. Click "Restore" (WARNING: data loss!)

---

## Emergency Contacts

- **Render Support:** support@render.com
- **Vercel Support:** https://vercel.com/support
- **Supabase Support:** support@supabase.io
- **Alchemy Support:** https://www.alchemy.com/support

---

## Status Pages

- Render: https://status.render.com
- Vercel: https://www.vercel-status.com
- Supabase: https://status.supabase.com
- Solana: https://status.solana.com

---

**Last Updated:** October 22, 2025
**Status:** Ready for mainnet deployment
**Next Review:** After first production round

---

## Quick Commands Reference

```bash
# Generate JWT secret
node scripts/generate-jwt-secret.js

# Verify configuration
node scripts/verify-production-config.js

# Run smoke tests
bash scripts/smoke-test.sh https://api.solotto.live

# Deploy frontend
cd apps/frontend && vercel --prod

# Check backend logs
# Visit: https://dashboard.render.com/[your-app]/logs

# Test health endpoint
curl https://api.solotto.live/api/v1/health

# Test frontend
curl -I https://solotto.live
```

---

Good luck with your deployment! 🚀
