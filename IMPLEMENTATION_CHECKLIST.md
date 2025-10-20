# Mainnet Implementation Checklist

**Status:** 🟡 In Progress
**Target Launch:** 4-6 weeks from October 13, 2025
**Last Updated:** October 13, 2025

This is a working checklist for tracking implementation progress toward mainnet deployment.
See [MAINNET_DEPLOYMENT_PLAN.md](./MAINNET_DEPLOYMENT_PLAN.md) for detailed specifications.

---

## Phase 1: Implementation (2-3 Weeks)

### Week 1: Core Features

#### Priority 1: 2FA Implementation
- [ ] Install dependencies: `npm install speakeasy qrcode @types/speakeasy @types/qrcode`
- [ ] Add `totpSecret` and `totpEnabled` fields to User model (Prisma migration)
- [ ] Create `/auth/setup-2fa` endpoint (generate TOTP secret, return QR code)
- [ ] Create `/auth/verify-2fa` endpoint (verify TOTP code)
- [ ] Update `/auth/login` to check for 2FA requirement
- [ ] Create frontend 2FA setup page (`/operator/setup-2fa`)
- [ ] Create frontend 2FA verification component
- [ ] Test with Google Authenticator
- [ ] Test with Authy
- [ ] Document 2FA setup process for operators

#### Priority 2: Jupiter Swap Integration
- [ ] Install Jupiter SDK: `npm install @jup-ag/api`
- [ ] Create `apps/backend/src/services/swap.service.ts`
- [ ] Implement `SwapService` class with methods:
  - [ ] `getQuote(fromMint, toMint, amount, slippage)` - Get swap quote from Jupiter
  - [ ] `swapSolToLotto(amountSol, slippageBps)` - Execute SOL → LOTTO swap
  - [ ] `checkLiquidity(amountSol)` - Verify sufficient liquidity exists
- [ ] Add fallback logic: if swap fails → send SOL directly
- [ ] Add logging for all swap attempts (success/failure)
- [ ] Update Distribution module to use SwapService:
  - [ ] Replace placeholder swap logic in `apps/backend/src/routes/distribution.ts`
  - [ ] Handle swap failures gracefully
- [ ] Test swaps on devnet (0.1 SOL → devnet LOTTO)
- [ ] Test fallback (force swap failure, verify SOL sent)
- [ ] Document swap configuration and troubleshooting

#### Priority 3: E2E Test Suite
- [ ] Install testing dependencies: `npm install --save-dev jest supertest @types/jest @types/supertest ts-jest`
- [ ] Create `apps/backend/jest.config.js`
- [ ] Create `apps/backend/tests/setup.ts` (test database, env config)
- [ ] Create `apps/backend/tests/helpers/` directory:
  - [ ] `auth.helper.ts` - Login, get JWT token
  - [ ] `wallet.helper.ts` - Generate test wallets
  - [ ] `wait.helper.ts` - Wait utilities
- [ ] Create E2E test files:
  - [ ] `tests/e2e/1-auth.test.ts` - Register, login, 2FA flow
  - [ ] `tests/e2e/2-control.test.ts` - Create config, validate fields, blacklist
  - [ ] `tests/e2e/3-snapshot.test.ts` - Fetch holders, assign tiers
  - [ ] `tests/e2e/4-drawing.test.ts` - Select winners, verify audit trail
  - [ ] `tests/e2e/5-harvest.test.ts` - Calculate prize pool, tier allocations
  - [ ] `tests/e2e/6-distribution.test.ts` - Prepare txs, swap, broadcast
  - [ ] `tests/e2e/7-full-lifecycle.test.ts` - Complete round (all modules)
- [ ] Add `"test": "jest"` script to `package.json`
- [ ] Add `"test:e2e": "jest tests/e2e"` script
- [ ] Add `"test:coverage": "jest --coverage"` script
- [ ] Run tests locally, verify all pass
- [ ] Achieve 60-70% coverage of critical paths
- [ ] Document test suite usage

### Week 2: Configuration & Documentation

#### Priority 4: Environment Configuration
- [ ] Create `apps/backend/.env.production.example` with all required vars
- [ ] Create `apps/frontend/.env.production.example` with all required vars
- [ ] Generate production JWT secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Document JWT secret in secure location (1Password)
- [ ] Identify production operator wallet (generate or use existing)
- [ ] Document operator wallet private key securely
- [ ] Set up Render.com account
- [ ] Create new Render app for Solotto backend
- [ ] Configure Render environment variables (all from .env.production)
- [ ] Test Render app deployment (preview branch)
- [ ] Set up Vercel production project
- [ ] Configure Vercel environment variables
- [ ] Test Vercel deployment (preview branch)
- [ ] Verify Supabase connection from Render
- [ ] Test full stack: Render backend + Vercel frontend + Supabase

#### Priority 5: Documentation Updates
- [ ] Create `docs/archive/` folder (DONE ✅)
- [ ] Move outdated docs to archive (DONE ✅)
- [ ] Create `OPERATOR_RUNBOOK.md` - Day-to-day operations guide
- [ ] Create `INCIDENT_RESPONSE.md` - Emergency procedures
- [ ] Update root `README.md` with:
  - [ ] Link to MAINNET_DEPLOYMENT_PLAN.md
  - [ ] Mainnet token address
  - [ ] Production URLs
  - [ ] Deployment status
- [ ] Document 2FA setup process (with screenshots)
- [ ] Document Jupiter swap configuration
- [ ] Document E2E test suite usage
- [ ] Create operator training materials

### Week 3: Security & Polish

#### Priority 6: Security Hardening
- [ ] Generate new Supabase passwords (all 3 roles):
  - [ ] `postgres` (superuser)
  - [ ] `solotto_app` (read/write)
  - [ ] `solotto_ro` (read-only)
- [ ] Update `apps/backend/.env` with new passwords
- [ ] Test database connections with new passwords
- [ ] Enable Supabase IP allowlist:
  - [ ] Find Render IP ranges
  - [ ] Add to Supabase Network Restrictions
  - [ ] Test connection from Render
- [ ] Update CORS configuration in backend:
  - [ ] Restrict to `https://solotto.live` in production
  - [ ] Keep `http://localhost:3000` for development
- [ ] Install rate limiting: `npm install express-rate-limit`
- [ ] Add rate limiters:
  - [ ] Public endpoints: 100 req/15min
  - [ ] Auth endpoints: 5 req/15min
  - [ ] Operator endpoints: 50 req/15min
- [ ] Install Zod: `npm install zod` (if not already)
- [ ] Create Zod schemas for all request bodies
- [ ] Add validation middleware to all POST/PUT endpoints
- [ ] Review all error messages (ensure no sensitive data leaked)
- [ ] Install security headers: `npm install helmet`
- [ ] Configure helmet with CSP, HSTS, etc.
- [ ] Manual penetration testing:
  - [ ] Test unauthorized access to protected endpoints
  - [ ] Test SQL injection (Prisma should prevent)
  - [ ] Test XSS attacks
  - [ ] Test CSRF attacks
  - [ ] Test rate limit bypass
- [ ] Verify blacklist enforcement (test with known blacklisted wallet)
- [ ] Check all logs for exposed secrets

#### Priority 7: Monitoring Setup
- [ ] Create Sentry account (if not exists)
- [ ] Create Sentry project: "solotto-backend-prod"
- [ ] Install Sentry: `npm install @sentry/node`
- [ ] Configure Sentry in backend:
  - [ ] Add DSN to environment variables
  - [ ] Initialize Sentry in `index.ts`
  - [ ] Add error handler middleware
  - [ ] Test error capture
- [ ] Configure Sentry alerts:
  - [ ] Error rate > 5% in 5 minutes
  - [ ] Response time p95 > 1 second
  - [ ] Database connection failures
  - [ ] Set notification channel (email)
- [ ] Create UptimeRobot account (free tier)
- [ ] Create monitors:
  - [ ] API health check (`/api/v1/health`) - every 5 min
  - [ ] Frontend (`https://solotto.live`) - every 5 min
  - [ ] Set alert email
- [ ] Set up Supabase alerts:
  - [ ] Disk usage > 70%
  - [ ] Active connections > 80%
  - [ ] Slow queries > 1 second
- [ ] Set up Render alerts:
  - [ ] CPU > 80%
  - [ ] Memory > 85%
  - [ ] Deploy failures
- [ ] Test all alert notifications (trigger test alerts)

---

## Phase 2: Testing & Validation (1 Week)

### Week 4: Devnet Testing

#### Full E2E Test on Devnet
- [ ] Deploy backend to Render staging/preview
- [ ] Deploy frontend to Vercel preview
- [ ] Verify both point to Supabase with `network='devnet'`
- [ ] Create or identify devnet LOTTO token mint
- [ ] Fund 100 test wallets with varying LOTTO amounts:
  - [ ] 10 wallets with 10K LOTTO (tier 4)
  - [ ] 30 wallets with 50K LOTTO (tier 3)
  - [ ] 40 wallets with 100K LOTTO (tier 2)
  - [ ] 20 wallets with 500K+ LOTTO (tier 1)
- [ ] Test complete lifecycle:
  - [ ] Operator login with 2FA
  - [ ] Create control configuration
  - [ ] Run snapshot (verify 100 participants captured)
  - [ ] Verify tier assignments correct
  - [ ] Execute drawing
  - [ ] Verify winners selected (one per tier)
  - [ ] Check audit trail (seed, blockhash, slot)
  - [ ] Calculate harvest
  - [ ] Verify prize calculations correct
  - [ ] Test Jupiter swap (0.1 SOL → devnet LOTTO)
  - [ ] Execute distribution
  - [ ] Verify winners received prizes on devnet
  - [ ] Check transparency portal displays round
  - [ ] Verify history endpoints return correct data
- [ ] Test edge cases:
  - [ ] No eligible participants in tier 4 (verify no winner selected)
  - [ ] All tier 1 participants blacklisted (verify no winner)
  - [ ] Jupiter swap fails (verify fallback to SOL)
  - [ ] RPC connection drops (verify fallback RPC used)
  - [ ] Database connection timeout (verify retry logic)
- [ ] Load test with 500+ participants:
  - [ ] Generate 500 wallets with LOTTO
  - [ ] Run snapshot (measure time)
  - [ ] Run drawing (measure time)
  - [ ] Verify performance acceptable
- [ ] Run all E2E tests against staging:
  - [ ] `npm test`
  - [ ] Verify all tests pass
  - [ ] Check coverage report
- [ ] Document any issues found and fixes applied

---

## Phase 3: Deployment Preparation (2-3 Days)

### Infrastructure Setup

#### Day 1-2: Production Deployment
- [ ] Create production Render app
- [ ] Configure production environment variables in Render:
  - [ ] Copy all from `.env.production.example`
  - [ ] Use production database connection strings
  - [ ] Use production RPC endpoints (mainnet)
  - [ ] Use production operator wallet
  - [ ] Use production JWT secret
  - [ ] Use production Sentry DSN
- [ ] Set up custom domain: `api.solotto.live`
  - [ ] Add CNAME record in DNS
  - [ ] Verify SSL certificate auto-provisioned
  - [ ] Test HTTPS access
- [ ] Deploy backend to production (first deploy)
- [ ] Verify health check: `curl https://api.solotto.live/api/v1/health`
- [ ] Create production Vercel project
- [ ] Configure production environment variables in Vercel:
  - [ ] `NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta`
  - [ ] `NEXT_PUBLIC_BACKEND_URL=https://api.solotto.live`
  - [ ] `NEXT_PUBLIC_LOTTO_MINT=HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump`
  - [ ] Production RPC URL
- [ ] Set up custom domain: `solotto.live`
  - [ ] Add A/CNAME records in DNS
  - [ ] Verify SSL certificate auto-provisioned
  - [ ] Test HTTPS access
- [ ] Deploy frontend to production (first deploy)
- [ ] Verify frontend loads: `curl -I https://solotto.live`
- [ ] Test DNS resolution (nslookup, dig)
- [ ] Configure Vercel CDN caching (if applicable)

#### Day 3: Final Checks
- [ ] Verify Supabase backups enabled:
  - [ ] Check Supabase dashboard → Database → Backups
  - [ ] Verify daily backups scheduled
  - [ ] Verify 7-day retention configured
- [ ] Create manual Supabase backup:
  - [ ] Use Supabase UI or pg_dump
  - [ ] Store backup securely (local + cloud)
  - [ ] Document backup location
- [ ] Test Supabase connection from production Render:
  - [ ] Check Render logs for database connections
  - [ ] Verify pooled connection (port 6543) used
  - [ ] Check active connections in Supabase dashboard
- [ ] Test read-only database connection:
  - [ ] Hit public endpoint (history)
  - [ ] Verify uses DATABASE_URL_RO
  - [ ] Try write operation (should fail)
- [ ] Check Supabase disk space:
  - [ ] Current usage should be <20%
  - [ ] Set alert for 70% usage
- [ ] Run production smoke tests:
  - [ ] Health endpoint: `curl https://api.solotto.live/api/v1/health`
  - [ ] Status endpoint: `curl -H "Authorization: Bearer TOKEN" https://api.solotto.live/api/v1/status`
  - [ ] History endpoint: `curl https://api.solotto.live/api/v1/history/rounds`
  - [ ] Dashboard stats: `curl https://api.solotto.live/api/v1/history/stats`
  - [ ] Frontend loads: `curl -I https://solotto.live`
  - [ ] Operator login: Test at `https://solotto.live/operator`
- [ ] Verify production environment:
  - [ ] Dashboard displays "mainnet-beta"
  - [ ] History shows empty state (no rounds yet)
  - [ ] Transparency portal accessible
- [ ] Test mobile responsiveness:
  - [ ] iPhone Safari
  - [ ] Android Chrome
  - [ ] iPad
- [ ] Test browser compatibility:
  - [ ] Chrome (latest)
  - [ ] Safari (latest)
  - [ ] Firefox (latest)
  - [ ] Edge (latest)
- [ ] Schedule mainnet launch window:
  - [ ] Day: Tuesday or Wednesday
  - [ ] Time: 10 AM - 2 PM PT
  - [ ] Duration: 2-3 hours
  - [ ] Notify community 48 hours in advance
- [ ] Document rollback procedure:
  - [ ] Backend rollback steps (Render)
  - [ ] Frontend rollback steps (Vercel)
  - [ ] Database rollback steps (Supabase)
  - [ ] Test rollback on staging
- [ ] Prepare launch announcement:
  - [ ] Draft Twitter post
  - [ ] Draft Discord message
  - [ ] Prepare FAQ for community

---

## Phase 4: Mainnet Launch (1 Day)

### Launch Day Execution

#### T-1 Hour: Pre-Launch
- [ ] Team call/standup (all hands on deck)
- [ ] Review launch checklist
- [ ] Verify all pre-launch items complete
- [ ] Open monitoring dashboards:
  - [ ] Render logs
  - [ ] Sentry errors
  - [ ] Supabase metrics
  - [ ] UptimeRobot status
- [ ] Test operator login one more time
- [ ] Verify rollback procedure documented and understood

#### T-0: Deployment
- [ ] Deploy backend to production:
  - [ ] `git checkout main && git pull`
  - [ ] `git tag -a v1.0.0 -m "Production Release v1.0.0"`
  - [ ] `git push origin v1.0.0`
  - [ ] Render auto-deploys
  - [ ] Monitor Render logs (5 minutes)
  - [ ] Verify health check passes
- [ ] Deploy frontend to production:
  - [ ] `vercel --prod`
  - [ ] Monitor deployment logs (3 minutes)
  - [ ] Verify deployment success
- [ ] Run smoke tests:
  - [ ] API health: ✅
  - [ ] Status check: ✅
  - [ ] History endpoint: ✅
  - [ ] Dashboard stats: ✅
  - [ ] Frontend loads: ✅
  - [ ] Operator login: ✅
- [ ] Monitor for 1 hour:
  - [ ] Watch Sentry for errors (should be 0)
  - [ ] Check response times in Render (p95 <500ms)
  - [ ] Verify database connections stable
  - [ ] Test all frontend pages manually
  - [ ] Check mobile responsiveness

#### T+2 Hours: Launch Announcement
- [ ] Post to Twitter: "Solotto lottery dApp is now live on mainnet!"
- [ ] Post to Discord: Detailed announcement with links
- [ ] Update website with "LIVE" banner
- [ ] Send email to beta testers (if applicable)
- [ ] Monitor community reactions and questions

#### T+4 Hours: First Test Round
- [ ] Operator logs in with 2FA
- [ ] Create first control configuration:
  - [ ] Prize pool: 5-10 SOL
  - [ ] Snapshot window: 24 hours
  - [ ] Minimum LOTTO: 10,000 tokens
  - [ ] Prize distribution: 50% / 30% / 15% / 5%
  - [ ] Slippage: 0.5%
- [ ] Verify configuration saved
- [ ] Announce round to community:
  - [ ] Twitter: "First Solotto lottery round starts now!"
  - [ ] Discord: Pin announcement with details
  - [ ] Explain snapshot window and eligibility
- [ ] Monitor snapshot window (24 hours):
  - [ ] Check participant count periodically
  - [ ] Answer community questions
  - [ ] Verify no errors in logs

#### T+28 Hours (24h after snapshot start): Snapshot Execution
- [ ] Operator logs in
- [ ] Run snapshot process
- [ ] Monitor snapshot progress:
  - [ ] Check Render logs for progress
  - [ ] Verify participants being added to database
  - [ ] Estimate completion time
- [ ] Verify snapshot complete:
  - [ ] Check participant count
  - [ ] Verify tier assignments
  - [ ] Check for any blacklisted wallets (should be excluded)
- [ ] Announce snapshot complete to community

#### T+66 Hours (18:00 UTC, Day 2): Drawing Execution
- [ ] Operator logs in
- [ ] Execute drawing
- [ ] Monitor drawing process:
  - [ ] Check Render logs
  - [ ] Verify winners being selected
  - [ ] Check audit trail captured (seed, blockhash, slot)
- [ ] Verify drawing complete:
  - [ ] One winner per tier (if eligible participants exist)
  - [ ] Audit trail complete
  - [ ] Winners marked in database
- [ ] Calculate harvest:
  - [ ] Verify prize pool calculation
  - [ ] Check tier allocations (50%/30%/15%/5%)
  - [ ] Verify amounts correct

#### T+66 Hours + 15 Minutes: Distribution
- [ ] Prepare distribution
- [ ] Test Jupiter swap with small amount first (0.1 SOL)
- [ ] If swap succeeds:
  - [ ] Execute full distribution (all tiers)
  - [ ] Monitor Render logs for transaction signatures
- [ ] If swap fails:
  - [ ] Fallback to SOL distribution
  - [ ] Log failure reason
- [ ] Verify distribution complete:
  - [ ] Check transaction signatures in logs
  - [ ] Verify on Solscan (check winner wallets)
  - [ ] Confirm winners received prizes
- [ ] Announce winners to community:
  - [ ] Twitter: "Congratulations to our first Solotto winners!"
  - [ ] Discord: Post winner addresses (first 8 chars)
  - [ ] Link to transparency portal

#### T+66 Hours + 30 Minutes: Verification
- [ ] Verify transparency portal updated:
  - [ ] Round visible with complete data
  - [ ] Winners displayed
  - [ ] Audit trail visible (seed, blockhash, slot)
  - [ ] Prize amounts correct
- [ ] Verify history endpoint:
  - [ ] Round appears in history
  - [ ] All data accurate
- [ ] Check dashboard metrics:
  - [ ] Total rounds: 1
  - [ ] SOL distributed: [amount]
  - [ ] Winners: 4 (or fewer if some tiers had no eligible participants)
- [ ] Gather community feedback:
  - [ ] Read comments on Twitter/Discord
  - [ ] Answer questions
  - [ ] Document any issues or suggestions

### Post-Launch Monitoring (48 Hours)

#### T+6 Hours: First Check-In
- [ ] Review error logs (should be minimal)
- [ ] Check response times (should be <500ms p95)
- [ ] Verify database health
- [ ] Check uptime (should be 100%)
- [ ] Review community feedback

#### T+24 Hours: Day 1 Review
- [ ] Full system health check:
  - [ ] Error rate: ___%
  - [ ] Uptime: ___%
  - [ ] Response time p95: ___ms
  - [ ] Database connections: ___
  - [ ] Disk usage: ___%
- [ ] Verify backup completed (Supabase daily backup)
- [ ] Review Sentry errors (investigate any recurring issues)
- [ ] Community sentiment check
- [ ] Document any issues encountered

#### T+48 Hours: Post-Mortem
- [ ] Team review meeting
- [ ] Discuss what went well
- [ ] Discuss what could be improved
- [ ] Document lessons learned
- [ ] Update documentation with any missing steps
- [ ] Plan next lottery round
- [ ] Celebrate successful launch! 🎉🎊

---

## Success Criteria

### Technical Metrics
- [ ] 99.9%+ uptime (max 1.4 minutes downtime in first 48 hours)
- [ ] <0.1% error rate
- [ ] Response times p95 <500ms
- [ ] Database query times p95 <200ms
- [ ] All E2E tests passing
- [ ] Zero critical security vulnerabilities

### Functional Metrics
- [ ] First lottery round completed successfully
- [ ] Winners selected correctly (verifiable via audit trail)
- [ ] Prizes distributed on-chain (verifiable on Solscan)
- [ ] Transparency portal displays accurate data
- [ ] Dashboard metrics correct
- [ ] No data corruption or loss

### User Experience
- [ ] Operator can log in with 2FA without issues
- [ ] All modules execute without errors
- [ ] Frontend responsive on mobile devices
- [ ] Browser compatibility confirmed
- [ ] Community feedback positive

---

## Rollback Triggers

**Immediately rollback if:**
- [ ] System completely down for >5 minutes
- [ ] Data corruption detected
- [ ] Security breach identified
- [ ] Financial calculations incorrect
- [ ] Unable to distribute prizes

**Consider rollback if:**
- [ ] Error rate >10%
- [ ] Response times >2 seconds p95
- [ ] Major feature broken (e.g., distribution fails)
- [ ] Multiple user reports of critical bugs

**Rollback Procedure:**
1. Announce to community (maintenance mode)
2. Rollback backend (Render: previous deployment)
3. Rollback frontend (Vercel: previous deployment)
4. Restore database if needed (Supabase backup)
5. Verify rollback successful
6. Investigate root cause
7. Fix issues in development
8. Re-test thoroughly
9. Schedule new deployment

---

## Notes & Tracking

### Blockers
*Document any blockers here as they arise*

- None currently

### Questions
*Document any questions or uncertainties*

- None currently

### Decisions Log
*Track key decisions made during implementation*

1. **2FA Library:** Using `speakeasy` for TOTP (industry standard)
2. **Jupiter SDK:** Using `@jup-ag/api` v6 (latest stable)
3. **Test Framework:** Using `jest` + `supertest` (most popular for Node.js)
4. **Deployment Platform:** Using Render for backend (better than Railway for this use case)
5. **Swap Fallback:** Send SOL directly if LOTTO swaps fail (ensures winners always get paid)

---

**Status Legend:**
- ⬜ Not started
- 🟡 In progress
- ✅ Complete
- ⚠️ Blocked
- ❌ Failed/Cancelled

**Last Updated:** October 13, 2025
**Document Owner:** Solotto Development Team
