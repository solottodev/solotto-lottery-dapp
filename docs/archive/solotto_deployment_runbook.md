# Solotto On-Chain Lottery Drawing Machine
## Production Deployment Runbook

**Document Version:** 1.0  
**Last Updated:** September 30, 2025  
**Deployment Target:** Production (Solana Mainnet)

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Infrastructure Setup](#2-infrastructure-setup)
3. [Database Deployment](#3-database-deployment)
4. [Backend API Deployment](#4-backend-api-deployment)
5. [Frontend Deployment](#5-frontend-deployment)
6. [Configuration & Secrets](#6-configuration--secrets)
7. [Post-Deployment Verification](#7-post-deployment-verification)
8. [Monitoring Setup](#8-monitoring-setup)
9. [Rollback Procedures](#9-rollback-procedures)
10. [Troubleshooting Guide](#10-troubleshooting-guide)

---

## 1. Pre-Deployment Checklist

### 1.1 Code Readiness

**Verify the following before proceeding:**

```bash
# Verify all tests pass
npm run test:all
# Expected: All tests passing, coverage > 85%

# Verify build succeeds
npm run build
# Expected: No build errors

# Verify linting passes
npm run lint
# Expected: No linting errors

# Verify type checking passes
npm run type-check
# Expected: No type errors
```

**Checklist:**
- [ ] All unit tests pass (100%)
- [ ] All integration tests pass (100%)
- [ ] All E2E tests pass (100%)
- [ ] Code coverage ≥ 85%
- [ ] Security scan shows no critical issues
- [ ] Load testing completed successfully
- [ ] UAT sign-off received
- [ ] Documentation updated
- [ ] Changelog updated
- [ ] Version tagged in Git

### 1.2 Stakeholder Approvals

- [ ] Product Owner approval
- [ ] Technical Lead approval
- [ ] Security Team approval
- [ ] Operations Team notified
- [ ] Support Team briefed
- [ ] Communication plan ready

### 1.3 Deployment Window

**Recommended Deployment Time:**
- Date: [Specify date]
- Time: Tuesday or Wednesday, 10:00 AM - 2:00 PM PT
- Duration: Estimated 2-3 hours
- Maintenance window communicated to users

**Avoid:**
- Fridays (limited support over weekend)
- Holidays
- High-traffic periods (during active lottery draws)

### 1.4 Team Readiness

**Required Personnel:**
- [ ] DevOps Engineer (deployment lead)
- [ ] Backend Engineer (API support)
- [ ] Frontend Engineer (UI support)
- [ ] QA Engineer (verification)
- [ ] On-call Engineer (incident response)

**Contact Information:**
```
Deployment Lead: [Name] - [Phone] - [Email]
Backend Support: [Name] - [Phone] - [Email]
Frontend Support: [Name] - [Phone] - [Email]
On-Call Engineer: [Name] - [Phone] - [Email]
```

---

## 2. Infrastructure Setup

### 2.1 Cloud Provider Setup (Vercel + Railway)

**Frontend (Vercel):**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project
vercel link

# Verify project settings
vercel env ls
```

**Backend (Railway):**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login to Railway
railway login

# Link project
railway link

# Verify environment
railway status
```

### 2.2 Database Setup (PostgreSQL)

**Provider:** Render / Railway / Supabase

**Create Production Database:**
```bash
# Create database instance
railway add postgresql

# Get connection string
railway variables

# Expected output:
# DATABASE_URL=postgresql://user:pass@host:5432/solotto_prod
```

**Database Configuration:**
- Instance Type: Production tier
- Storage: 50GB (expandable)
- Backups: Automated daily
- Replication: Enabled (read replicas)
- Connection pooling: PgBouncer enabled

### 2.3 Redis Setup (Upstash)

**Create Redis Instance:**
```bash
# Via Upstash Dashboard:
# 1. Go to console.upstash.com
# 2. Create new Redis database
# 3. Select region: us-east-1
# 4. Enable TLS
# 5. Copy connection string

# Expected format:
# REDIS_URL=rediss://default:password@host:6379
```

### 2.4 Domain & SSL Configuration

**DNS Setup:**
```
# Frontend
solotto.live → Vercel
www.solotto.live → Vercel (redirect)

# API
api.solotto.live → Railway

# WebSocket
ws.solotto.live → Railway
```

**SSL Certificates:**
- Vercel: Automatic (Let's Encrypt)
- Railway: Automatic (Let's Encrypt)
- Verify: All endpoints serve HTTPS only

---

## 3. Database Deployment

### 3.1 Database Migrations

**Dry Run (Staging First):**
```bash
# Set staging database URL
export DATABASE_URL="postgresql://staging..."

# Generate migration preview
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datasource $DATABASE_URL \
  --script > migration-preview.sql

# Review migration SQL
cat migration-preview.sql

# Apply migrations to staging
npx prisma migrate deploy

# Verify schema
npx prisma db pull
```

**Production Migration:**
```bash
# IMPORTANT: Create backup first
railway backup create

# Set production database URL
export DATABASE_URL="postgresql://production..."

# Apply migrations
npx prisma migrate deploy

# Expected output:
# Applying migration `20250112000000_initial_schema`
# Applying migration `20250115000000_add_indexes`
# Database schema updated successfully

# Generate Prisma client
npx prisma generate

# Verify migration
npx prisma migrate status
```

**Migration Verification:**
```sql
-- Connect to database
psql $DATABASE_URL

-- Verify tables exist
\dt

-- Expected tables:
-- operators
-- lottery_configs
-- snapshots
-- snapshot_wallets
-- drawings
-- winners
-- harvests
-- distributions
-- distribution_transactions
-- audit_logs

-- Verify indexes
\di

-- Verify constraints
SELECT conname, contype FROM pg_constraint WHERE conrelid = 'lottery_configs'::regclass;

-- Check row counts (should be 0 for fresh deployment)
SELECT 
  'operators' as table_name, COUNT(*) as rows FROM operators
UNION ALL
SELECT 'lottery_configs', COUNT(*) FROM lottery_configs;
```

### 3.2 Seed Initial Data

**Create Operator Accounts:**
```bash
# Run seed script
npm run seed:production

# Or manually:
node scripts/seed-operators.js
```

**Seed Script Example:**
```typescript
// scripts/seed-operators.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedOperators() {
  // Admin operator
  await prisma.operator.create({
    data: {
      publicKey: process.env.ADMIN_WALLET_PUBLIC_KEY,
      role: 'ADMIN',
      enabled: true
    }
  });

  // Primary operator
  await prisma.operator.create({
    data: {
      publicKey: process.env.OPERATOR_WALLET_PUBLIC_KEY,
      role: 'OPERATOR',
      enabled: true
    }
  });

  console.log('Operators seeded successfully');
}

seedOperators()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Verification:**
```sql
-- Verify operators created
SELECT public_key, role, enabled FROM operators;

-- Expected: 2-3 operator records
```

---

## 4. Backend API Deployment

### 4.1 Environment Variables

**Set Production Environment Variables:**
```bash
# Railway CLI
railway variables set NODE_ENV=production
railway variables set PORT=3000
railway variables set API_BASE_URL=https://api.solotto.live

# Database
railway variables set DATABASE_URL="postgresql://..."
railway variables set REDIS_URL="rediss://..."

# Solana
railway variables set SOLANA_RPC_PRIMARY="https://mainnet.helius-rpc.com/?api-key=XXX"
railway variables set SOLANA_RPC_FALLBACK="https://rpc.quicknode.pro/XXX"
railway variables set SOLANA_CLUSTER=mainnet-beta
railway variables set LOTTO_MINT_ADDRESS="<MINT_ADDRESS>"
railway variables set SWITCHBOARD_QUEUE="<QUEUE_PUBKEY>"

# Wallets (CRITICAL: Use secure secret management)
railway variables set INFRA_WALLET_PRIVATE_KEY="<ENCRYPTED_KEY>"
railway variables set TREASURY_WALLET_PRIVATE_KEY="<ENCRYPTED_KEY>"

# Security
railway variables set JWT_SECRET="<STRONG_RANDOM_SECRET>"
railway variables set JWT_EXPIRATION=3600

# Monitoring
railway variables set SENTRY_DSN="<SENTRY_DSN>"
railway variables set LOG_LEVEL=info

# Rate Limiting
railway variables set RATE_LIMIT_WINDOW=60000
railway variables set RATE_LIMIT_MAX=100

# Verify all variables set
railway variables
```

**Security Notes:**
- NEVER commit private keys to Git
- Use environment-specific secrets
- Rotate secrets after deployment
- Store backup of secrets in secure vault (1Password, AWS Secrets Manager)

### 4.2 Deploy Backend

**Build and Deploy:**
```bash
# Ensure you're on main branch
git checkout main
git pull origin main

# Tag release
git tag -a v1.0.0 -m "Production Release v1.0.0"
git push origin v1.0.0

# Deploy to Railway
railway up

# Railway will:
# 1. Build the application
# 2. Run npm run build
# 3. Start with npm start
# 4. Expose on assigned domain

# Monitor deployment logs
railway logs

# Expected output:
# Building...
# Successfully built
# Starting application...
# Server listening on port 3000
# Database connected
# Redis connected
# RPC connection established
```

**Deployment Verification:**
```bash
# Health check
curl https://api.solotto.live/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-01-12T12:00:00Z",
#   "version": "1.0.0"
# }

# System status (requires auth token)
curl https://api.solotto.live/status \
  -H "Authorization: Bearer <token>"

# Expected: All services "operational"
```

---

## 5. Frontend Deployment

### 5.1 Environment Variables

**Set Vercel Environment Variables:**
```bash
# Via Vercel CLI
vercel env add NEXT_PUBLIC_API_URL production
# Enter: https://api.solotto.live/v1

vercel env add NEXT_PUBLIC_WS_URL production
# Enter: wss://api.solotto.live/ws

vercel env add NEXT_PUBLIC_SOLANA_NETWORK production
# Enter: mainnet-beta

vercel env add NEXT_PUBLIC_RPC_ENDPOINT production
# Enter: https://api.mainnet-beta.solana.com

vercel env add SENTRY_DSN production
# Enter: <SENTRY_DSN>

# List all environment variables
vercel env ls
```

### 5.2 Deploy Frontend

**Build and Deploy:**
```bash
# Ensure clean state
git checkout main
git pull origin main

# Deploy to Vercel (production)
vercel --prod

# Vercel will:
# 1. Install dependencies
# 2. Run next build
# 3. Optimize production bundle
# 4. Deploy to edge network
# 5. Assign to solotto.live domain

# Monitor deployment
vercel logs

# Expected output:
# Building...
# Optimizing...
# Deploying to production...
# Success! Deployed to https://solotto.live
```

**Build Optimization Verification:**
```bash
# Check bundle sizes (before deployment)
npm run build

# Expected output should show optimized bundles:
# Route (pages)                              Size     First Load JS
# ┌ ○ /                                      5.2 kB         85.3 kB
# ├ ○ /history                               3.8 kB         83.9 kB
# └ ○ /operator                              12.4 kB        94.5 kB

# All pages should be under 100kB First Load JS
```

**Deployment Verification:**
```bash
# Test homepage
curl -I https://solotto.live

# Expected: HTTP 200, SSL certificate valid

# Test operator dashboard (requires wallet)
curl -I https://solotto.live/operator

# Expected: HTTP 200

# Test history page
curl -I https://solotto.live/history

# Expected: HTTP 200
```

---

## 6. Configuration & Secrets

### 6.1 Wallet Security

**Operator Wallets:**
```bash
# CRITICAL: Production wallets should use hardware wallets (Ledger/Trezor)

# Infrastructure wallet
# - Holds project SOL/tokens
# - Used for prize pool calculations
# - Should be multi-sig for extra security

# Treasury wallet
# - Used for prize distributions
# - Hot wallet (needs to sign transactions)
# - Should have minimal balance, refilled as needed

# Recommended setup:
# 1. Generate wallets offline
# 2. Store seed phrases in secure vault
# 3. Use hardware wallets for signing
# 4. Enable multi-sig for infrastructure wallet
```

**Private Key Management:**
```bash
# Encrypt private keys before storing
# Use GPG encryption:

# Encrypt
echo "PRIVATE_KEY_BASE58" | gpg --encrypt --recipient devops@solotto.live > infra_key.gpg

# Decrypt (only when needed)
gpg --decrypt infra_key.gpg

# Store encrypted keys in:
# - AWS Secrets Manager
# - HashiCorp Vault
# - 1Password Teams
```

### 6.2 API Keys & Tokens

**Helius RPC API Key:**
```bash
# Sign up at helius.dev
# Create new API key for production
# Enable mainnet access
# Set rate limits appropriately

# Store in environment:
railway variables set HELIUS_API_KEY="<KEY>"
```

**Monitoring Services:**
```bash
# Sentry
railway variables set SENTRY_DSN="<DSN>"
railway variables set SENTRY_ENVIRONMENT=production

# Verify Sentry integration
node -e "require('@sentry/node').captureMessage('Test from production')"
```

---

## 7. Post-Deployment Verification

### 7.1 Smoke Tests

**Automated Smoke Test Script:**
```bash
#!/bin/bash
# smoke-test.sh

API_URL="https://api.solotto.live"
FRONTEND_URL="https://solotto.live"

echo "Running smoke tests..."

# Test 1: API Health
echo "1. Testing API health..."
curl -f $API_URL/health || exit 1

# Test 2: Frontend loads
echo "2. Testing frontend..."
curl -f $FRONTEND_URL || exit 1

# Test 3: Public history endpoint
echo "3. Testing history endpoint..."
curl -f $API_URL/v1/history/rounds?limit=1 || exit 1

# Test 4: Database connectivity
echo "4. Testing database..."
curl -f $API_URL/status || exit 1

echo "All smoke tests passed!"
```

**Run Smoke Tests:**
```bash
chmod +x smoke-test.sh
./smoke-test.sh

# Expected: All tests pass
```

### 7.2 Manual Verification Checklist

**Critical Paths:**
- [ ] Homepage loads correctly
- [ ] Operator dashboard accessible
- [ ] Wallet connection works (Phantom/Solflare)
- [ ] History page shows "No rounds yet" message
- [ ] All API endpoints return expected responses
- [ ] WebSocket connection establishes
- [ ] Error pages render correctly (404, 500)
- [ ] Mobile responsive layout works

**Authentication Flow:**
- [ ] Request challenge message
- [ ] Sign message with wallet
- [ ] Receive JWT token
- [ ] Token authentication works on protected routes
- [ ] Token expiration handled correctly

**Performance:**
- [ ] Homepage loads in < 2 seconds
- [ ] API responses < 500ms (p95)
- [ ] No JavaScript errors in console
- [ ] Lighthouse score > 90

### 7.3 First Lottery Test (Devnet)

**Before running on mainnet, test complete flow on devnet:**

```bash
# Switch environment to devnet temporarily
railway variables set SOLANA_CLUSTER=devnet
railway variables set SOLANA_RPC_PRIMARY="https://api.devnet.solana.com"

# Restart service
railway restart

# Execute test lottery cycle
# 1. Create configuration
# 2. Generate snapshot (with test wallets)
# 3. Execute drawing
# 4. Calculate prize pool
# 5. Execute distribution
# 6. Verify history

# Switch back to mainnet
railway variables set SOLANA_CLUSTER=mainnet-beta
railway variables set SOLANA_RPC_PRIMARY="https://mainnet.helius-rpc.com/?api-key=XXX"
railway restart
```

---

## 8. Monitoring Setup

### 8.1 Application Monitoring (Sentry)

**Verify Sentry Integration:**
```bash
# Test error tracking
curl -X POST https://api.solotto.live/test-error

# Check Sentry dashboard for error
# Expected: Error appears in Sentry console
```

**Configure Alerts:**
```
Sentry Dashboard → Alerts → New Alert Rule

Alert Conditions:
- Error rate > 5% in 5 minutes
- Response time p95 > 1 second
- Database connection failures

Notification Channels:
- Email: devops@solotto.live
- Slack: #solotto-alerts
- PagerDuty: Critical issues only
```

### 8.2 Infrastructure Monitoring

**Railway Monitoring:**
```
Railway Dashboard → solotto-api → Metrics

Monitor:
- CPU usage (alert if > 80%)
- Memory usage (alert if > 85%)
- Request count
- Response times
- Error rates
```

**Uptime Monitoring:**
```bash
# Use UptimeRobot or similar

Monitors to create:
- https://api.solotto.live/health (every 5 minutes)
- https://solotto.live (every 5 minutes)
- wss://api.solotto.live/ws (every 15 minutes)

Alert if down for > 2 consecutive checks
```

### 8.3 Database Monitoring

**PostgreSQL Monitoring:**
```sql
-- Create monitoring view
CREATE VIEW system_health AS
SELECT
  (SELECT COUNT(*) FROM lottery_configs) as total_configs,
  (SELECT COUNT(*) FROM snapshots WHERE status = 'complete') as completed_snapshots,
  (SELECT COUNT(*) FROM drawings WHERE status = 'complete') as completed_drawings,
  (SELECT COUNT(*) FROM distributions WHERE status = 'complete') as completed_distributions,
  (SELECT pg_database_size('solotto_prod')) as database_size,
  (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections;

-- Query health regularly
SELECT * FROM system_health;
```

**Set Up Alerts:**
- Database size > 80% capacity
- Active connections > 80% of max
- Query execution time > 1 second
- Failed transactions > 5%

### 8.4 Blockchain Monitoring

**RPC Health Check:**
```typescript
// scripts/monitor-rpc.ts
import { Connection } from '@solana/web3.js';

async function monitorRPC() {
  const connection = new Connection(process.env.SOLANA_RPC_PRIMARY!);
  
  setInterval(async () => {
    try {
      const slot = await connection.getSlot();
      const blockTime = await connection.getBlockTime(slot);
      const health = await connection.getHealth();
      
      console.log({
        timestamp: new Date(),
        slot,
        blockTime,
        health,
        latency: Date.now() - (blockTime! * 1000)
      });
      
      // Alert if latency > 5 seconds
      if (Date.now() - (blockTime! * 1000) > 5000) {
        // Send alert
      }
    } catch (error) {
      console.error('RPC health check failed:', error);
      // Send alert
    }
  }, 30000); // Every 30 seconds
}

monitorRPC();
```

---

## 9. Rollback Procedures

### 9.1 When to Rollback

**Immediate Rollback Triggers:**
- Critical bugs affecting financial calculations
- Data corruption detected
- Security vulnerability discovered
- System completely unavailable (> 5 minutes)
- Database integrity compromised

**Consider Rollback:**
- Error rate > 10%
- Performance degradation > 50%
- User-facing features broken
- RPC connection failures

### 9.2 Backend Rollback

**Quick Rollback (Railway):**
```bash
# List recent deployments
railway deployments

# Rollback to previous deployment
railway rollback <deployment-id>

# Or rollback to specific version
git checkout v0.9.9
railway up

# Verify rollback
curl https://api.solotto.live/health

# Monitor logs
railway logs
```

**Database Rollback:**
```bash
# ONLY if database changes caused issues

# Restore from backup
railway backup restore <backup-id>

# Or roll back specific migrations
npx prisma migrate resolve --rolled-back 20250115000000_problematic_migration

# Verify data integrity
psql $DATABASE_URL -c "SELECT COUNT(*) FROM lottery_configs;"
```

### 9.3 Frontend Rollback

**Quick Rollback (Vercel):**
```bash
# List recent deployments
vercel ls

# Promote previous deployment to production
vercel promote <deployment-url> --prod

# Or redeploy previous version
git checkout v0.9.9
vercel --prod

# Verify rollback
curl -I https://solotto.live
```

### 9.4 Post-Rollback Actions

**After Rolling Back:**
1. Notify all stakeholders
2. Create incident report
3. Identify root cause
4. Fix issues in development
5. Re-test thoroughly
6. Schedule new deployment

**Communication Template:**
```
Subject: Solotto Deployment Rollback - [Date]

Team,

We have rolled back the v1.0.0 deployment due to [reason].

Current Status: Running on v0.9.9
Impact: [Describe impact]
Root Cause: [If known]
Next Steps: [Action items]

We will communicate timeline for re-deployment once issues are resolved.
```

---

## 10. Troubleshooting Guide

### 10.1 Common Issues

**Issue: API Returns 500 Errors**

```bash
# Check logs
railway logs --tail 100

# Common causes:
# 1. Database connection issues
railway variables get DATABASE_URL
# Verify connection string is correct

# 2. Missing environment variables
railway variables
# Verify all required vars set

# 3. RPC connection failures
# Test RPC manually:
curl https://api.mainnet-beta.solana.com -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'

# Solution: Check Sentry for detailed error traces
```

**Issue: Frontend Not Loading**

```bash
# Check Vercel deployment status
vercel ls

# Check for build errors
vercel logs <deployment-url>

# Common causes:
# 1. Build failure - check logs for errors
# 2. Environment variables missing
vercel env ls

# 3. API URL misconfigured
# Verify NEXT_PUBLIC_API_URL is correct

# Solution: Redeploy with fixes
vercel --prod
```

**Issue: Wallet Connection Fails**

```bash
# Check browser console for errors

# Common causes:
# 1. Wrong network (testnet vs mainnet)
# Verify NEXT_PUBLIC_SOLANA_NETWORK=mainnet-beta

# 2. Wallet adapter issues
# Clear browser cache and reconnect

# 3. CORS errors
# Verify API CORS settings allow frontend domain
```

**Issue: Snapshot Processing Hangs**

```bash
# Check snapshot status
curl https://api.solotto.live/v1/snapshot/<id> \
  -H "Authorization: Bearer <token>"

# Common causes:
# 1. RPC rate limiting
# Check RPC provider dashboard

# 2. Large wallet count
# Monitor logs for progress

# 3. Database connection pool exhausted
# Check active connections:
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"

# Solution: Increase connection pool or optimize queries
```

**Issue: VRF Timeout**

```bash
# Check drawing status
curl https://api.solotto.live/v1/drawing/<id>

# Common causes:
# 1. Switchboard queue congestion
# Check switchboard.xyz status

# 2. Insufficient SOL for VRF fees
# Check authority wallet balance

# 3. Network congestion
# Check Solana status: status.solana.com

# Solution: Retry drawing after 5 minutes
```

### 10.2 Emergency Contacts

**Critical Issues:**
- On-Call Engineer: [Phone]
- DevOps Lead: [Phone]
- CTO: [Phone]

**Service Providers:**
- Vercel Support: vercel.com/support
- Railway Support: railway.app/help
- Helius Support: helius.dev/discord
- Sentry Support: sentry.io/support

### 10.3 Disaster Recovery

**Complete System Failure:**

1. **Activate Incident Response Team**
2. **Switch to Maintenance Mode**
   ```bash
   # Deploy maintenance page
   vercel deploy ./maintenance --prod
   ```

3. **Diagnose Issue**
   - Check all service statuses
   - Review error logs
   - Identify root cause

4. **Execute Recovery Plan**
   - Restore from backups if needed
   - Fix infrastructure issues
   - Redeploy services

5. **Verify Recovery**
   - Run full smoke test suite
   - Verify data integrity
   - Test critical paths

6. **Post-Mortem**
   - Document incident
   - Identify preventive measures
   - Update runbook

---

## Appendix A: Deployment Checklist

**Pre-Deployment (T-24 hours):**
- [ ] All tests passing
- [ ] Staging deployment successful
- [ ] UAT completed
- [ ] Backup created
- [ ] Team briefed
- [ ] Communication sent to users

**Deployment (T-0):**
- [ ] Database migrations applied
- [ ] Backend deployed
- [ ] Frontend deployed
- [ ] Smoke tests passing
- [ ] Monitoring configured
- [ ] Documentation updated

**Post-Deployment (T+1 hour):**
- [ ] System health verified
- [ ] Performance metrics normal
- [ ] No critical errors
- [ ] User feedback monitored
- [ ] Support team ready

---

## Appendix B: Emergency Rollback Script

```bash
#!/bin/bash
# emergency-rollback.sh

echo "EMERGENCY ROLLBACK INITIATED"
echo "Rolling back to last known good state..."

# Rollback backend
railway rollback $(railway deployments --json | jq -r '.[1].id')

# Rollback frontend
vercel rollback $(vercel ls --json | jq -r '.[1].url') --prod

# Verify rollback
sleep 30
curl -f https://api.solotto.live/health && echo "Backend OK"
curl -f https://solotto.live && echo "Frontend OK"

echo "Rollback complete. Investigate issues before redeploying."
```

---

**Deployment Runbook v1.0 - Complete**