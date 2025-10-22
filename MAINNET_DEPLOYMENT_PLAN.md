# Solotto Mainnet Deployment Plan
## Single Source of Truth - Production Launch Guide

**Version:** 3.0
**Last Updated:** October 22, 2025
**Target Launch:** Ready for immediate deployment
**Status:** 🟢 Ready for Production Launch

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [System Architecture](#system-architecture)
3. [Token Configuration](#token-configuration)
4. [Deployment Phases](#deployment-phases)
5. [Critical Path Items](#critical-path-items)
6. [Testing Strategy](#testing-strategy)
7. [Security Implementation](#security-implementation)
8. [Monitoring & Operations](#monitoring--operations)
9. [Launch Day Procedures](#launch-day-procedures)
10. [Incident Response](#incident-response)

---

## Executive Summary

### Current State
- ✅ Database: Supabase Pro (production-ready)
- ✅ Core Modules: Control, Snapshot, Drawing, Harvest, Distribution
- ✅ Authentication: Email/password (operator accounts)
- ✅ Drawing System: Node.js crypto.randomBytes() + blockchain audit trail
- ✅ Network Awareness: Devnet/mainnet separation
- ✅ Token: Deployed on mainnet (HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump)
- ✅ Testing: E2E tests completed
- ✅ 2FA: Implemented and tested
- ✅ Jupiter Integration: Implemented with SOL fallback
- ✅ Staging Deployment: Successfully deployed and tested

### Key Decisions Made
- **Drawing Method:** Crypto.randomBytes() with blockchain audit (NOT Switchboard VRF)
- **Authentication:** Email/password with 2FA (NOT wallet-based)
- **Infrastructure Wallet:** Single-sig with Phantom connector (NOT multi-sig)
- **Deployment Platform:** Render for backend, Vercel for frontend
- **Swap Strategy:** Jupiter aggregator, fallback to SOL prizes if swaps fail
- **Testing:** E2E tests for critical paths only (NOT comprehensive 85% coverage)
- **Operator Accounts:** Single production operator account

### Timeline Estimate
- **Phase 1 (2-3 weeks):** Implementation (2FA, Jupiter, E2E tests, env config)
- **Phase 2 (1 week):** Testing & validation on devnet
- **Phase 3 (2-3 days):** Deployment preparation & infrastructure setup
- **Phase 4 (1 day):** Mainnet launch with first test round
- **Total:** 4-6 weeks to production

### Budget (Monthly Recurring)
| Service | Cost |
|---------|------|
| Supabase Pro | $30-40 |
| Render (Backend) | $20-50 |
| Vercel Pro (Frontend) | $20 |
| Alchemy RPC | $0 (current tier) |
| Sentry (Errors) | $26 |
| Domain/SSL | $12 |
| UptimeRobot | $7 |
| **Total** | **$115-155/month** |

---

## System Architecture

### Technology Stack
```
Frontend:
  - Next.js 14+ (React)
  - Vercel (hosting)
  - Solana Wallet Adapter (Phantom)
  - TailwindCSS

Backend:
  - Node.js + Express
  - TypeScript
  - Prisma ORM
  - Render.com (hosting)

Database:
  - PostgreSQL 16
  - Supabase Pro
  - 3 roles: postgres (admin), solotto_app (read/write), solotto_ro (read-only)

Blockchain:
  - Solana mainnet-beta
  - Alchemy RPC (current tier)
  - @solana/web3.js + @solana/spl-token

Drawing System:
  - Node.js crypto.randomBytes(32) for secure random seed
  - Blockchain audit trail: blockhash + slot for transparency
  - Deterministic verification via SHA-256 hashing
```

### Data Flow
```
1. Control Module → Create round configuration + validate wallet balances
2. Snapshot Module → Fetch on-chain LOTTO holders, assign tiers, apply blacklist
3. Drawing Module → Generate secure random seed, select winners, store audit trail
4. Harvest Module → Calculate prize pool (SOL balance × prize %), tier allocations
5. Distribution Module → Jupiter SOL→LOTTO swap (or send SOL if swap fails)
6. Transparency Portal → Public view of all rounds, winners, audit trails
```

### Network Architecture
```
Production URLs:
  - Frontend: https://solotto.live (Vercel)
  - Backend API: https://api.solotto.live (Render)
  - Database: Supabase (nkiezfkiasqgefzgyuwb.supabase.co)

Development URLs:
  - Frontend: http://localhost:3000
  - Backend API: http://localhost:4000
  - Database: Supabase (same as production, filtered by network field)
```

---

## Token Configuration

### LOTTO Token (Mainnet)
```env
Token Name: LOTTO
Token Symbol: LOTTO
Mint Address: HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump
Decimals: 6
Total Supply: 992,892,738.481169 LOTTO
Platform: pump.fun
```

### Liquidity Pool
```
Platform: pump.fun bonding curve
LP Token Address: 2CqSCmGSa3V7mdbHSFftSVJJ9qpLyPK5TSSNSRCQWJte
Current Liquidity: $47,000 USD
Solscan: https://solscan.io/token/HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump
Pool Account: https://solscan.io/account/2CqSCmGSa3V7mdbHSFftSVJJ9qpLyPK5TSSNSRCQWJte
```

### Swap Configuration
```
Primary: Jupiter Aggregator (SOL → LOTTO)
Slippage Tolerance: 0.5%
Fallback Strategy: If swap fails or liquidity too low, send SOL directly as prize
Minimum Liquidity Threshold: TBD during testing
```

---

## Deployment Phases

### Phase 1: Implementation (2-3 Weeks)

#### Week 1: Core Features
**Priority 1: 2FA Implementation**
- [ ] Install `speakeasy` (TOTP) and `qrcode` libraries
- [ ] Add `totpSecret` field to User model (Prisma migration)
- [ ] Create `/auth/setup-2fa` endpoint (generate secret, return QR code)
- [ ] Create `/auth/verify-2fa` endpoint (verify TOTP code)
- [ ] Update `/auth/login` to require TOTP after password verification
- [ ] Add frontend 2FA setup page in operator dashboard
- [ ] Add frontend 2FA verification step in login flow
- [ ] Test with Google Authenticator/Authy

**Priority 2: Jupiter Swap Integration**
- [ ] Install `@jup-ag/api` package
- [ ] Create `SwapService` class in `apps/backend/src/services/swap.service.ts`
- [ ] Implement `swapSolToLotto(amountSol, slippage)` method
- [ ] Add fallback logic: if swap fails → send SOL directly
- [ ] Add liquidity check: query Jupiter quote, validate slippage impact
- [ ] Update Distribution module to use SwapService
- [ ] Test swaps on devnet first (small amounts: 0.1 SOL)
- [ ] Document swap failure scenarios

**Priority 3: E2E Test Suite**
- [ ] Install `jest` and `supertest` testing libraries
- [ ] Create `apps/backend/tests/e2e/` directory structure
- [ ] Test 1: `auth.test.ts` (register, login, 2FA)
- [ ] Test 2: `control.test.ts` (create config, validate blacklist)
- [ ] Test 3: `snapshot.test.ts` (fetch holders, assign tiers)
- [ ] Test 4: `drawing.test.ts` (select winners, verify audit trail)
- [ ] Test 5: `harvest.test.ts` (calculate prize pool, tier allocations)
- [ ] Test 6: `distribution.test.ts` (prepare txs, broadcast, handle failures)
- [ ] Test 7: `full-lifecycle.test.ts` (control → snapshot → draw → harvest → distribute)
- [ ] Add `npm test` script to `package.json`
- [ ] Achieve 60-70% coverage of critical paths

#### Week 2: Configuration & Documentation
**Priority 4: Environment Configuration**
- [ ] Create `apps/backend/.env.production.example`
- [ ] Create `apps/frontend/.env.production.example`
- [ ] Document all required environment variables
- [ ] Generate strong JWT secret (64+ chars): `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Identify production operator wallet (hardware wallet recommended)
- [ ] Set up Render.com account and project
- [ ] Configure Render environment variables (encrypted)
- [ ] Configure Vercel environment variables for production
- [ ] Test connection to Supabase from Render

**Priority 5: Documentation Updates**
- [ ] Archive outdated docs to `docs/archive/` folder
- [ ] Update `deployment_actions.md` (remove VRF, add crypto.randomBytes)
- [ ] Create `OPERATOR_RUNBOOK.md` (day-to-day operations guide)
- [ ] Create `INCIDENT_RESPONSE.md` (emergency procedures)
- [ ] Update `README.md` with mainnet deployment info
- [ ] Document 2FA setup process for operators
- [ ] Document Jupiter swap configuration

#### Week 3: Security & Polish
**Priority 6: Security Hardening**
- [ ] Rotate all Supabase database passwords
- [ ] Enable Supabase IP allowlist (add Render IP ranges)
- [ ] Review CORS configuration (restrict to production domain)
- [ ] Implement rate limiting on public endpoints (express-rate-limit)
- [ ] Add request validation middleware (Zod schemas)
- [ ] Review all error messages (don't leak sensitive info)
- [ ] Add security headers (helmet.js)
- [ ] Test unauthorized access attempts
- [ ] Verify blacklist enforcement
- [ ] Check for exposed secrets in logs

**Priority 7: Monitoring Setup**
- [ ] Create Sentry project for production
- [ ] Install `@sentry/node` in backend
- [ ] Configure Sentry DSN in environment
- [ ] Set up error alerting (email/Slack)
- [ ] Create UptimeRobot monitors (health endpoint, every 5 min)
- [ ] Set up Supabase dashboard alerts (disk >70%, slow queries)
- [ ] Configure Render metrics monitoring
- [ ] Test alert notifications

### Phase 2: Testing & Validation (1 Week)

**Week 4: Devnet Testing**
- [ ] Deploy backend to Render staging environment
- [ ] Deploy frontend to Vercel preview environment
- [ ] Point both to Supabase (network='devnet')
- [ ] Create test LOTTO token on devnet (or use existing)
- [ ] Fund test wallets with devnet LOTTO
- [ ] Run complete lifecycle test (control → distribution)
- [ ] Test 2FA login flow
- [ ] Test Jupiter swaps on devnet (0.1 SOL → LOTTO)
- [ ] Test swap failure fallback (send SOL)
- [ ] Verify audit trails (seed, blockhash, slot)
- [ ] Test with 100+ participant wallets (load test)
- [ ] Verify dashboard metrics filter by network
- [ ] Test transparency portal with devnet data
- [ ] Run all E2E tests against staging environment
- [ ] Document any bugs/issues and fix

### Phase 3: Deployment Preparation (2-3 Days)

**Days 1-2: Infrastructure Setup**
- [ ] Create production Render app
- [ ] Configure production environment variables
- [ ] Set up custom domain (api.solotto.live)
- [ ] Verify SSL certificate
- [ ] Create production Vercel project
- [ ] Configure production environment variables
- [ ] Set up custom domain (solotto.live)
- [ ] Verify SSL certificate
- [ ] Test DNS resolution
- [ ] Enable CDN caching on Vercel

**Day 3: Final Checks**
- [ ] Verify Supabase backups enabled (daily, 7-day retention)
- [ ] Create manual backup of database
- [ ] Test database connection from Render
- [ ] Test read-only database connection
- [ ] Verify connection pooling (port 6543)
- [ ] Check disk space (<20% used)
- [ ] Run smoke tests against production URLs
- [ ] Verify health endpoint returns 200
- [ ] Test operator login (with 2FA)
- [ ] Verify dashboard shows correct network (mainnet-beta)
- [ ] Schedule launch window (Tuesday or Wednesday, 10 AM - 2 PM PT)
- [ ] Prepare rollback procedure

### Phase 4: Mainnet Launch (1 Day)

**Launch Day**
- [ ] Deploy backend to Render production
- [ ] Deploy frontend to Vercel production
- [ ] Monitor deployment logs
- [ ] Verify health checks pass
- [ ] Test operator login with 2FA
- [ ] Verify dashboard loads correctly
- [ ] Check all API endpoints
- [ ] Run smoke test script
- [ ] Monitor for 1 hour (watch error rates)
- [ ] Announce launch to community (Twitter, Discord, etc.)

**First Test Round (Low Stakes)**
- [ ] Create first production round:
  - Prize pool: 5-10 SOL
  - Snapshot window: 24 hours
  - Minimum LOTTO: 10,000 LOTTO
  - Tier breakdown: 50% / 30% / 15% / 5%
- [ ] Monitor snapshot process
- [ ] Verify participant data
- [ ] Execute drawing
- [ ] Verify winners selected
- [ ] Calculate harvest
- [ ] Test Jupiter swap (small amount first)
- [ ] Execute distribution
- [ ] Verify winners receive prizes
- [ ] Check transparency portal
- [ ] Gather community feedback

**Post-Launch (48 Hours)**
- [ ] Monitor error rates continuously
- [ ] Check database performance
- [ ] Verify backup completion
- [ ] Review response times (p95 <500ms)
- [ ] Monitor RPC usage
- [ ] Check connection pool utilization
- [ ] Document any issues
- [ ] Plan improvements for next round

---

## Critical Path Items

### 🔴 Must Complete Before Launch

1. **2FA Implementation** (1 week)
   - Security requirement for operator account
   - Prevents unauthorized access to control panel
   - Use TOTP standard (Google Authenticator compatible)

2. **Jupiter Swap Integration** (1 week)
   - Required for LOTTO prize distribution
   - Must include fallback to SOL if swaps fail
   - Test thoroughly on devnet first

3. **E2E Test Suite** (1 week)
   - Minimum coverage: full lifecycle (control → distribution)
   - Prevents regressions during development
   - Automated verification of critical paths

4. **Production Environment Config** (2-3 days)
   - Mainnet RPC endpoints
   - Production operator wallet
   - Strong JWT secret
   - Mainnet token mint address
   - Supabase connection strings

5. **Security Hardening** (3-5 days)
   - Password rotation
   - IP allowlisting
   - Rate limiting
   - CORS restrictions
   - Input validation

6. **Monitoring Setup** (2-3 days)
   - Sentry error tracking
   - Uptime monitoring
   - Database alerts
   - Billing alerts

### 🟡 Should Complete Before Launch

7. **Documentation Updates** (2-3 days)
   - Operator runbook
   - Incident response guide
   - Archived outdated docs
   - Updated README

8. **Load Testing** (1-2 days)
   - Test with 500+ participants
   - Verify performance at scale
   - Identify bottlenecks

9. **Security Audit** (3-5 days)
   - Manual penetration testing
   - Code review for vulnerabilities
   - Third-party audit (optional)

### 🟢 Nice to Have

10. **Admin Dashboard Enhancements**
    - Real-time metrics
    - Operator activity logs
    - System health dashboard

11. **Community Features**
    - Email notifications for winners
    - Discord bot for announcements
    - Twitter integration

---

## Testing Strategy

### E2E Test Suite Structure

```
apps/backend/tests/
├── setup.ts              # Test database setup, env config
├── teardown.ts           # Cleanup after tests
├── helpers/
│   ├── auth.helper.ts    # Login, get token
│   ├── wallet.helper.ts  # Generate test wallets
│   └── wait.helper.ts    # Wait for async operations
└── e2e/
    ├── 1-auth.test.ts           # Register, login, 2FA
    ├── 2-control.test.ts        # Create config, validate
    ├── 3-snapshot.test.ts       # Fetch holders, assign tiers
    ├── 4-drawing.test.ts        # Select winners, audit
    ├── 5-harvest.test.ts        # Calculate prizes
    ├── 6-distribution.test.ts   # Prepare & broadcast txs
    └── 7-full-lifecycle.test.ts # Complete round
```

### Test Coverage Goals
- **Critical Path:** 80%+ (control → snapshot → drawing → harvest → distribution)
- **Auth Flow:** 100% (login, 2FA, JWT)
- **API Endpoints:** 70%+ (all public and protected routes)
- **Overall:** 60-70% (acceptable for mainnet)

### Manual Testing Checklist
- [ ] Operator can log in with 2FA
- [ ] Control form validates all inputs
- [ ] Snapshot fetches real mainnet LOTTO holders
- [ ] Blacklist is enforced
- [ ] Drawing generates winners correctly
- [ ] Audit trail is complete (seed, blockhash, slot)
- [ ] Harvest calculates prize pool accurately
- [ ] Jupiter swaps execute successfully
- [ ] Fallback to SOL works when swaps fail
- [ ] Distribution creates valid transactions
- [ ] Winners receive prizes on-chain
- [ ] Transparency portal displays correct data
- [ ] Dashboard metrics are accurate
- [ ] History endpoints return correct data
- [ ] Mobile responsiveness works
- [ ] Browser compatibility (Chrome, Safari, Firefox)

### Devnet Testing Plan
1. **Deploy to staging** (Render + Vercel preview)
2. **Create test LOTTO token** (devnet mint, 1B supply)
3. **Fund 100 test wallets** (varying amounts: 10K, 50K, 100K, 500K, 1M LOTTO)
4. **Run full lifecycle** (control → distribution)
5. **Verify all modules** (snapshot, drawing, harvest, distribution)
6. **Test edge cases:**
   - No eligible participants in a tier
   - All participants blacklisted
   - Jupiter swap fails (test fallback)
   - RPC connection issues
   - Database connection pool exhaustion
7. **Load test** (500+ participants, concurrent requests)
8. **Document results** (timing, issues, performance metrics)

---

## Security Implementation

### Authentication & Authorization

**Operator Authentication:**
```typescript
// Login flow:
1. POST /auth/login { email, password }
   → Verify bcrypt password hash
   → Return { requiresTOTP: true }

2. POST /auth/verify-2fa { email, totpCode }
   → Verify TOTP code with speakeasy
   → Generate JWT token (expires 1 hour)
   → Return { token: "eyJ..." }

3. All protected routes use requireJwt middleware
   → Extract token from Authorization header
   → Verify JWT signature with JWT_SECRET
   → Attach user to req.user
```

**2FA Setup:**
```typescript
// One-time setup for operator:
1. POST /auth/setup-2fa (requires existing JWT)
   → Generate TOTP secret with speakeasy.generateSecret()
   → Save secret to user.totpSecret (encrypted in database)
   → Return QR code image (data URL)

2. Operator scans QR code with Google Authenticator/Authy

3. POST /auth/confirm-2fa { totpCode }
   → Verify first TOTP code
   → Set user.totpEnabled = true
   → Return success

4. All future logins require TOTP code
```

**Security Best Practices:**
- Passwords: bcrypt with salt rounds = 10
- JWT: 1-hour expiration, rotate secret monthly
- TOTP: 30-second window, 1-step look-ahead/behind
- Rate limiting: 5 login attempts per 15 minutes per IP
- Session invalidation: logout endpoint clears token (client-side)

### Input Validation

**All API endpoints use Zod schemas:**
```typescript
// Example: Control configuration validation
const controlSchema = z.object({
  snapshotStart: z.string().datetime(),
  snapshotEnd: z.string().datetime(),
  drawTime: z.string().datetime().optional(),
  tradePercentage: z.number().min(0).max(100),
  minUsdLottoRequired: z.number().min(0),
  prizeDistributionPercent: z.number().min(0).max(100),
  slippageTolerancePercent: z.number().min(0).max(5),
  blacklistWallets: z.array(z.string()).optional(),
});

// Middleware validates before handler executes
router.post('/control', requireJwt, validateBody(controlSchema), handler);
```

### Database Security

**Role-Based Access:**
```sql
-- solotto_app: Read/write for application operations
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO solotto_app;

-- solotto_ro: Read-only for public GET endpoints
GRANT SELECT ON Round, Participant, Drawing, Snapshot TO solotto_ro;
REVOKE INSERT, UPDATE, DELETE ON ALL TABLES FROM solotto_ro;
```

**Connection Pooling:**
```typescript
// Use pooled connection (port 6543) for application
DATABASE_URL=postgresql://solotto_app:password@db.supabase.co:6543/postgres?pgbouncer=true

// Use direct connection (port 5432) for migrations only
DATABASE_URL_DIRECT=postgresql://postgres:password@db.supabase.co:5432/postgres
```

**Backup Strategy:**
- Automated: Supabase daily backups (7-day retention)
- Manual: Weekly pg_dump to secure storage (S3/local encrypted)
- Testing: Monthly restore test to verify backups work

### API Security

**Rate Limiting:**
```typescript
import rateLimit from 'express-rate-limit';

// Public endpoints: 100 requests per 15 minutes per IP
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again later.',
});

// Auth endpoints: 5 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.',
});

app.use('/api/v1/history', publicLimiter);
app.use('/auth/login', authLimiter);
```

**CORS Configuration:**
```typescript
import cors from 'cors';

const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? 'https://solotto.live'
    : 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
```

**Security Headers:**
```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
}));
```

### Wallet Security

**Operator Wallet:**
- Hardware wallet recommended (Ledger/Trezor)
- If software wallet: encrypted with strong passphrase
- Private key stored in environment variable (encrypted in Render)
- Never log or expose private key in responses
- Rotate wallet quarterly

**Prize Distribution Wallet:**
- Hot wallet (needs to sign transactions)
- Minimum balance strategy (refill as needed)
- Monitor for unauthorized transactions
- Set up alerts for unexpected balance changes

**Infrastructure Wallet:**
- Single-sig (connected via Phantom)
- Used for prize pool balance checks only (read-only)
- Never used for signing transactions
- Public key stored in environment variable

### Secrets Management

**Environment Variables (Production):**
```env
# Database (encrypted in Render)
DATABASE_URL="postgresql://solotto_app:[ENCRYPTED]@db.supabase.co:6543/postgres"
DATABASE_URL_RO="postgresql://solotto_ro:[ENCRYPTED]@db.supabase.co:6543/postgres"

# JWT (64+ character random string)
JWT_SECRET="[GENERATED_VIA_CRYPTO_RANDOMBYTES]"

# Solana
SOLANA_NETWORK="mainnet-beta"
ALCHEMY_RPC_URL="https://solana-mainnet.g.alchemy.com/v2/[API_KEY]"
OPERATOR_WALLET_PRIVATE_KEY="[ENCRYPTED_BASE58]"

# Token
LOTTO_MINT_ADDRESS="HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump"
LOTTO_DECIMALS="6"

# Security
HARD_BLACKLIST='["11111111111111111111111111111111"]'

# Monitoring
SENTRY_DSN="https://[KEY]@sentry.io/[PROJECT]"
```

**Secret Rotation Schedule:**
- Database passwords: Every 3 months
- JWT secret: Every month
- Operator wallet: Every 6 months (or after security incident)
- API keys: Every 6 months

**Backup Storage:**
- Primary: Render encrypted environment variables
- Backup: 1Password/Bitwarden vault (team account)
- Emergency: Encrypted USB drive in secure location

---

## Monitoring & Operations

### Sentry Error Tracking

**Setup:**
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Capture all unhandled errors
app.use(Sentry.Handlers.errorHandler());
```

**Alert Rules:**
- Error rate > 5% in 5 minutes → Email + Slack
- Response time p95 > 1 second → Email
- Database connection failures → Immediate alert
- RPC connection failures → Email

### Uptime Monitoring

**UptimeRobot Configuration:**
```
Monitor 1: API Health Check
  URL: https://api.solotto.live/api/v1/health
  Interval: Every 5 minutes
  Alert: Email if down for 2 consecutive checks

Monitor 2: Frontend
  URL: https://solotto.live
  Interval: Every 5 minutes
  Alert: Email if down for 2 consecutive checks

Monitor 3: Database Health
  URL: https://api.solotto.live/api/v1/status (requires auth)
  Interval: Every 15 minutes
  Alert: Email if unhealthy
```

### Database Monitoring

**Supabase Dashboard Alerts:**
- Disk usage > 70% → Email
- Active connections > 80% of max → Email
- Query execution time > 1 second → Log (investigate later)
- Failed queries > 5% → Email

**Manual Checks (Weekly):**
```sql
-- Check disk usage
SELECT pg_size_pretty(pg_database_size('postgres'));

-- Check active connections
SELECT count(*) FROM pg_stat_activity WHERE state = 'active';

-- Check slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Check table sizes
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Performance Metrics

**Response Time Targets:**
- Health endpoint: <100ms
- History endpoints: <300ms
- Snapshot processing: <60 seconds (per 1000 wallets)
- Drawing execution: <10 seconds
- Distribution preparation: <30 seconds

**Key Metrics to Track:**
- Requests per minute
- Error rate (%)
- P50, P95, P99 response times
- Database query times
- RPC latency
- Memory usage
- CPU usage

### Logging Strategy

**Log Levels:**
```typescript
// Production logging
console.log('ℹ️  Info: Normal operations');
console.warn('⚠️  Warning: Non-critical issues');
console.error('❌ Error: Failures requiring attention');

// Examples:
console.log('🎰 Starting drawing for round', roundId);
console.warn('⚠️  RPC fallback activated, primary endpoint failed');
console.error('❌ Distribution failed:', error);
```

**What to Log:**
- All operator actions (control, snapshot, drawing, distribution)
- Authentication events (login, 2FA verification)
- RPC failures and fallbacks
- Jupiter swap attempts and results
- Database connection issues
- All errors with stack traces

**What NOT to Log:**
- Private keys or secrets
- User passwords (even hashed)
- Full JWT tokens
- Sensitive PII

---

## Launch Day Procedures

### Pre-Launch Checklist (T-24 Hours)

- [ ] All code merged to `main` branch
- [ ] All E2E tests passing
- [ ] Documentation updated
- [ ] Backup created (Supabase manual backup)
- [ ] Rollback procedure documented
- [ ] Team briefed on launch plan
- [ ] Community notification drafted
- [ ] Launch window scheduled (Tuesday/Wednesday, 10 AM - 2 PM PT)

### Deployment Steps (T-0)

**Step 1: Deploy Backend (15 minutes)**
```bash
# From local machine
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Production Release v1.0.0"
git push origin v1.0.0

# Deploy to Render
# (Render auto-deploys from GitHub on push to main)
# Monitor: https://dashboard.render.com/[your-app]/deploys

# Verify deployment
curl https://api.solotto.live/api/v1/health
# Expected: {"ok": true, "database": "healthy"}
```

**Step 2: Deploy Frontend (10 minutes)**
```bash
# Deploy to Vercel
vercel --prod

# Verify deployment
curl -I https://solotto.live
# Expected: HTTP 200, SSL certificate valid

# Test operator login
# Visit: https://solotto.live/operator
# Login with: operator@solotto.io + 2FA code
```

**Step 3: Smoke Tests (10 minutes)**
```bash
# Health check
curl https://api.solotto.live/api/v1/health

# Status check (requires JWT token)
curl https://api.solotto.live/api/v1/status \
  -H "Authorization: Bearer YOUR_TOKEN"

# History endpoint (public)
curl https://api.solotto.live/api/v1/history/rounds?limit=1

# Dashboard stats (public)
curl https://api.solotto.live/api/v1/history/stats
```

**Step 4: Monitor (60 minutes)**
- Watch Sentry dashboard for errors
- Monitor Render logs for warnings
- Check response times in Render metrics
- Verify database connections in Supabase dashboard
- Test all frontend pages manually
- Verify operator login with 2FA

### First Test Round (T+2 Hours)

**Round Configuration:**
```json
{
  "snapshotStart": "2025-11-01T00:00:00Z",
  "snapshotEnd": "2025-11-02T00:00:00Z",
  "drawTime": "2025-11-02T18:00:00Z",
  "tradePercentage": 100,
  "minUsdLottoRequired": 10,
  "prizeDistributionPercent": 50,
  "slippageTolerancePercent": 0.5,
  "prizeSourceWallet": "[INFRASTRUCTURE_WALLET_ADDRESS]",
  "blacklistWallets": []
}
```

**Prize Pool: 5-10 SOL**
- Tier 1 (50%): 2.5-5 SOL → Jupiter swap to LOTTO
- Tier 2 (30%): 1.5-3 SOL → Jupiter swap to LOTTO
- Tier 3 (15%): 0.75-1.5 SOL → Jupiter swap to LOTTO
- Tier 4 (5%): 0.25-0.5 SOL → Jupiter swap to LOTTO

**Execution Timeline:**
1. **Day 1 (T+2h):** Create control configuration, announce to community
2. **Day 1 (T+24h):** Snapshot window opens, users can still acquire LOTTO
3. **Day 2 (T+48h):** Snapshot window closes, run snapshot process
4. **Day 2 (T+48h+10m):** Verify snapshot data, check participant count
5. **Day 2 (T+66h):** Execute drawing (18:00 UTC)
6. **Day 2 (T+66h+5m):** Verify winners, check audit trail
7. **Day 2 (T+66h+10m):** Calculate harvest, verify prize amounts
8. **Day 2 (T+66h+15m):** Prepare distribution (test Jupiter swap)
9. **Day 2 (T+66h+20m):** Broadcast distribution transactions
10. **Day 2 (T+66h+30m):** Verify winners received prizes on-chain
11. **Day 2 (T+66h+60m):** Gather community feedback, document lessons

**Monitoring During Round:**
- Check snapshot progress every 10 minutes
- Verify participant counts match expectations
- Monitor RPC usage and response times
- Watch for errors in Sentry
- Test transparency portal updates in real-time
- Engage with community, answer questions

### Post-Launch (T+48 Hours)

**Success Metrics:**
- [ ] 99.9%+ uptime (max 1.4 minutes downtime)
- [ ] <0.1% error rate
- [ ] Response times p95 <500ms
- [ ] First round completed successfully
- [ ] Winners received prizes correctly
- [ ] Community feedback positive
- [ ] No critical bugs reported

**Review Meeting:**
- Document any issues encountered
- Identify improvements for next round
- Update documentation with lessons learned
- Plan next round parameters
- Celebrate successful launch! 🎉

---

## Incident Response

### Severity Levels

**Critical (P0):**
- System completely down
- Data corruption detected
- Security breach
- Financial loss occurring
- **Response Time:** Immediate (within 15 minutes)
- **Action:** Rollback immediately, investigate later

**High (P1):**
- Major feature broken (distribution fails)
- Error rate > 10%
- Performance degradation > 50%
- **Response Time:** Within 1 hour
- **Action:** Investigate, fix, or rollback

**Medium (P2):**
- Minor feature broken (transparency portal down)
- Error rate 5-10%
- Performance degradation 25-50%
- **Response Time:** Within 4 hours
- **Action:** Investigate, schedule fix

**Low (P3):**
- UI bug
- Error rate 1-5%
- Performance degradation <25%
- **Response Time:** Within 24 hours
- **Action:** Log issue, fix in next release

### Rollback Procedure

**Backend Rollback:**
```bash
# Via Render Dashboard:
1. Go to https://dashboard.render.com/[your-app]
2. Click "Deploys" tab
3. Find previous successful deployment
4. Click "Rollback to this deploy"
5. Wait 2-3 minutes for redeployment
6. Verify health check passes
```

**Frontend Rollback:**
```bash
# Via Vercel CLI:
vercel ls
vercel promote [previous-deployment-url] --prod

# Or via Vercel Dashboard:
1. Go to https://vercel.com/[your-project]
2. Click "Deployments" tab
3. Find previous successful deployment
4. Click "..." → "Promote to Production"
```

**Database Rollback (DANGEROUS):**
```bash
# Only if database migration caused issue
# Restore from backup:
psql $DATABASE_URL_DIRECT < backup_pre_migration.sql

# Or via Supabase Dashboard:
1. Go to Database → Backups
2. Select backup timestamp
3. Click "Restore"
4. Confirm restoration
```

### Communication Templates

**Critical Incident (P0):**
```
Subject: Solotto Service Disruption - [Date/Time]

The Solotto lottery platform is currently experiencing technical difficulties.

Status: Investigating
Impact: Service unavailable
ETA: Unknown, will update every 30 minutes

We have rolled back to the previous stable version and are investigating the root cause.

Current lottery rounds are safe and will resume once service is restored.

Next update: [Time]
```

**Resolution:**
```
Subject: Solotto Service Restored - [Date/Time]

The Solotto lottery platform has been restored to normal operation.

Incident Duration: [X hours]
Root Cause: [Brief description]
Resolution: [Brief description]

All lottery rounds are safe and have resumed normal operation.

Post-mortem report will be published within 48 hours.

Thank you for your patience.
```

### Emergency Contacts

**Internal Team:**
- Primary Operator: [Name] - [Phone] - [Email]
- Backup Operator: [Name] - [Phone] - [Email]
- Technical Lead: [Name] - [Phone] - [Email]

**Service Providers:**
- Render Support: support@render.com
- Vercel Support: https://vercel.com/support
- Supabase Support: support@supabase.io (Pro plan email support)
- Alchemy Support: https://www.alchemy.com/support

**Status Pages:**
- Render: https://status.render.com
- Vercel: https://www.vercel-status.com
- Supabase: https://status.supabase.com
- Solana: https://status.solana.com

---

## Appendix

### Environment Variables Reference

**Backend (.env.production):**
```env
# Server
NODE_ENV="production"
PORT="3000"

# Database
DATABASE_URL="postgresql://solotto_app:[PASSWORD]@db.nkiezfkiasqgefzgyuwb.supabase.co:6543/postgres?pgbouncer=true&sslmode=require"
DATABASE_URL_RO="postgresql://solotto_ro:[PASSWORD]@db.nkiezfkiasqgefzgyuwb.supabase.co:6543/postgres?pgbouncer=true&sslmode=require"
DATABASE_URL_DIRECT="postgresql://postgres:[PASSWORD]@db.nkiezfkiasqgefzgyuwb.supabase.co:5432/postgres?sslmode=require"

# Solana
SOLANA_NETWORK="mainnet-beta"
ALCHEMY_API_KEY="[YOUR_KEY]"
ALCHEMY_RPC_URL="https://solana-mainnet.g.alchemy.com/v2/[YOUR_KEY]"
SOLANA_RPC_FALLBACK="https://api.mainnet-beta.solana.com"

# Token
LOTTO_MINT_ADDRESS="HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump"
LOTTO_DECIMALS="6"

# Operator Wallet
OPERATOR_WALLET_PRIVATE_KEY="[BASE58_ENCODED_KEY]"

# Security
JWT_SECRET="[64_CHAR_RANDOM_STRING]"
HARD_BLACKLIST='["11111111111111111111111111111111"]'

# Monitoring
SENTRY_DSN="https://[KEY]@sentry.io/[PROJECT]"
```

**Frontend (.env.production):**
```env
# Solana
NEXT_PUBLIC_SOLANA_NETWORK="mainnet-beta"
NEXT_PUBLIC_RPC_URL="https://solana-mainnet.g.alchemy.com/v2/[YOUR_KEY]"

# Token
NEXT_PUBLIC_LOTTO_MINT="HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump"
NEXT_PUBLIC_NETWORK="mainnet-beta"

# Backend
NEXT_PUBLIC_BACKEND_URL="https://api.solotto.live"
```

### Useful Commands

**Database:**
```bash
# Connect to production database
psql "postgresql://postgres:[PASSWORD]@db.nkiezfkiasqgefzgyuwb.supabase.co:5432/postgres?sslmode=require"

# Create manual backup
pg_dump "postgresql://postgres:[PASSWORD]@db.nkiezfkiasqgefzgyuwb.supabase.co:5432/postgres?sslmode=require" > backup_$(date +%Y%m%d).sql

# Check migration status
npx prisma migrate status

# Run migrations (use DIRECT connection)
export DATABASE_URL=$DATABASE_URL_DIRECT
npx prisma migrate deploy
```

**Deployment:**
```bash
# Deploy backend (Render auto-deploys on push)
git push origin main

# Deploy frontend
vercel --prod

# Check deployment status
vercel ls
```

**Testing:**
```bash
# Run all tests
npm test

# Run E2E tests
npm run test:e2e

# Run specific test file
npm test -- drawing.test.ts

# Run with coverage
npm test -- --coverage
```

**Monitoring:**
```bash
# Check backend health
curl https://api.solotto.live/api/v1/health

# Check frontend
curl -I https://solotto.live

# View backend logs (Render)
# Visit: https://dashboard.render.com/[your-app]/logs

# View Sentry errors
# Visit: https://sentry.io/organizations/[org]/issues/
```

### Quick Reference Links

**Production URLs:**
- Frontend: https://solotto.live
- Backend API: https://api.solotto.live
- Operator Dashboard: https://solotto.live/operator
- Transparency Portal: https://solotto.live/transparency

**Admin Dashboards:**
- Render: https://dashboard.render.com
- Vercel: https://vercel.com/dashboard
- Supabase: https://supabase.com/dashboard/project/nkiezfkiasqgefzgyuwb
- Sentry: https://sentry.io

**Token Info:**
- Solscan: https://solscan.io/token/HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump
- Pool: https://solscan.io/account/2CqSCmGSa3V7mdbHSFftSVJJ9qpLyPK5TSSNSRCQWJte

---

**Document Version:** 2.0
**Status:** 🟡 Pre-Deployment
**Next Review:** Weekly during implementation phase
**Owner:** Solotto Development Team
**Last Updated:** October 13, 2025
