# Solotto Database Migration - Summary & Next Steps

## Executive Summary

This document provides an overview of the PostgreSQL database migration plan for the Solotto lottery dApp mainnet deployment using **Supabase Pro** as the hosting provider.

---

## What We're Doing

**Migrating from:** Local Docker PostgreSQL (development)
**Migrating to:** Supabase Pro (production-ready managed PostgreSQL)
**Timeline:** ~25 minutes for initial setup + testing
**Cost:** $25/month base + minimal usage fees

---

## Why Supabase Pro?

✅ **Developer-Friendly**: Works seamlessly with Prisma ORM
✅ **Built-in PgBouncer**: Connection pooling included (port 6543)
✅ **Automatic Backups**: Daily backups with 7-day retention
✅ **SSL by Default**: Security without extra configuration
✅ **Generous Limits**: 100k MAU, 8GB disk, unlimited connections
✅ **Great Dashboard**: Visual table editor, SQL editor, monitoring
✅ **Email Support**: Included with Pro plan
✅ **Cost-Effective**: $25/month for production-grade features

---

## Current Database State

### Schema Overview
- **7 Tables**: User, LotteryConfig, Round, Participant, Snapshot, Drawing, _prisma_migrations
- **4 Migrations**: ~19KB total, all applied successfully to local database
- **Key Features**:
  - Network-aware (devnet/mainnet-beta separation)
  - Read/write role separation (DATABASE_URL + DATABASE_URL_RO)
  - JSON fields for complex data
  - Indexes on network and drawingDate
  - Cascade deletes for data integrity

### Current Usage
- **Local Development**: Docker PostgreSQL 16 on port 5433
- **Environment**: Devnet with test data
- **Access Pattern**: Single connection, no pooling needed
- **Data Volume**: Minimal (test data only)

---

## Migration Plan Overview

### Phase 1: Setup (5 min)
1. Create Supabase account
2. Provision Pro plan database
3. Configure project settings

### Phase 2: Security (5 min)
1. Set up database roles (solotto_app, solotto_ro)
2. Enable SSL/TLS (auto-enabled)
3. Configure IP allowlist (optional for staging)

### Phase 3: Migration (5 min)
1. Run Prisma migrations on Supabase
2. Verify schema matches local
3. Grant role permissions

### Phase 4: Testing (10 min)
1. Test database connections
2. Verify read/write permissions
3. Test backend API endpoints
4. Validate data operations

---

## Files Created

### Documentation
- **[docs/SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Comprehensive setup guide (9 phases, ~150+ steps)
- **[docs/SUPABASE_QUICK_START.md](./SUPABASE_QUICK_START.md)** - Quick reference checklist (~25 min)
- **[docs/DATABASE_MIGRATION_SUMMARY.md](./DATABASE_MIGRATION_SUMMARY.md)** - This file

### Configuration Files
- **[apps/backend/.env.supabase.example](../apps/backend/.env.supabase.example)** - Environment variable template
- **[apps/backend/prisma/supabase-init-roles.sql](../apps/backend/prisma/supabase-init-roles.sql)** - Database role setup SQL

### Scripts
- **[apps/backend/scripts/test-supabase-connection.ts](../apps/backend/scripts/test-supabase-connection.ts)** - Automated connection testing
- **[apps/backend/scripts/migrate-to-supabase.sh](../apps/backend/scripts/migrate-to-supabase.sh)** - Migration script (Mac/Linux)
- **[apps/backend/scripts/migrate-to-supabase.bat](../apps/backend/scripts/migrate-to-supabase.bat)** - Migration script (Windows)

### Updated Files
- **[.gitignore](../.gitignore)** - Added Supabase env files and backup exclusions

---

## Quick Start Guide

### Step 1: Create Supabase Project
```bash
1. Go to https://supabase.com
2. Sign up / Log in
3. Create new project:
   - Name: solotto-mainnet-db
   - Region: East US (North Virginia)
   - Password: [generate strong password]
   - Plan: Pro ($25/month)
4. Save project-ref and password
```

### Step 2: Configure Environment
```bash
cd apps/backend
cp .env.supabase.example .env.supabase
# Edit .env.supabase:
# - Replace YOUR_PROJECT_REF
# - Replace YOUR_POSTGRES_PASSWORD
```

### Step 3: Run Migration
```bash
# Windows
scripts\migrate-to-supabase.bat

# Mac/Linux
chmod +x scripts/migrate-to-supabase.sh
./scripts/migrate-to-supabase.sh
```

### Step 4: Create Database Roles
```bash
1. Open Supabase Dashboard → SQL Editor
2. Copy contents of: apps/backend/prisma/supabase-init-roles.sql
3. Generate two strong passwords (32+ chars each)
4. Replace placeholders in SQL
5. Execute SQL
6. Update .env.supabase with the passwords
```

### Step 5: Test Connection
```bash
cp .env.supabase .env
npx ts-node scripts/test-supabase-connection.ts
# Expected: All 4 tests pass ✅
```

### Step 6: Test Backend
```bash
npm run dev
# Test endpoints (health, auth, control)
# Verify data in Supabase Table Editor
```

---

## Connection Strings Reference

### Application Connections (Pooled - Port 6543)
```env
# Read/Write (solotto_app)
DATABASE_URL="postgresql://solotto_app:[password]@db.[project-ref].supabase.co:6543/postgres?pgbouncer=true&sslmode=require"

# Read-Only (solotto_ro)
DATABASE_URL_RO="postgresql://solotto_ro:[password]@db.[project-ref].supabase.co:6543/postgres?pgbouncer=true&sslmode=require"
```

### Migration/Admin (Direct - Port 5432)
```env
# Superuser (postgres)
DATABASE_URL_DIRECT="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?sslmode=require"
```

**When to use which:**
- **Pooled (6543)**: Application runtime, API endpoints, queries
- **Direct (5432)**: Prisma migrations, schema changes, admin tasks

---

## Security Checklist

### Before Production Deployment
- [ ] Strong passwords for all roles (32+ characters)
- [ ] Passwords stored in secrets manager (not .env files)
- [ ] IP allowlist configured for production server
- [ ] SSL/TLS verified (`?sslmode=require`)
- [ ] Read-only role tested and enforced
- [ ] JWT_SECRET is strong random string (64+ chars)
- [ ] Operator wallet keys secured (hardware wallet/KMS)
- [ ] Automated backups verified
- [ ] Monitoring alerts configured
- [ ] Test data auto-copy feature removed

### Production Environment Variables
```env
# Database (Supabase)
DATABASE_URL="postgresql://solotto_app:PROD_PASSWORD@db.PROD_REF.supabase.co:6543/postgres?pgbouncer=true&sslmode=require"
DATABASE_URL_RO="postgresql://solotto_ro:PROD_PASSWORD@db.PROD_REF.supabase.co:6543/postgres?pgbouncer=true&sslmode=require"

# Solana (Mainnet)
SOLANA_NETWORK="mainnet-beta"
ALCHEMY_API_KEY="mainnet_api_key"
ALCHEMY_RPC_URL="https://solana-mainnet.g.alchemy.com/v2/mainnet_key"
LOTTO_MINT_ADDRESS="mainnet_token_mint"

# Security
JWT_SECRET="64_char_random_production_secret"
OPERATOR_WALLET_PRIVATE_KEY="mainnet_operator_key"
HARD_BLACKLIST='["known_bad_wallet_1","known_bad_wallet_2"]'
```

---

## Testing Checklist

### Local Development Tests
- [ ] Backend connects to Supabase successfully
- [ ] All 4 migrations applied correctly
- [ ] All 7 tables exist in Supabase Table Editor
- [ ] solotto_app and solotto_ro roles created
- [ ] Health endpoint returns healthy
- [ ] Can create operator user via /auth/register
- [ ] Can authenticate via /auth/login
- [ ] Can create round via /api/v1/control
- [ ] Read-only connection cannot write data
- [ ] Data visible in Supabase Table Editor

### Production Readiness Tests
- [ ] Load test (1000 participants, 10 concurrent requests)
- [ ] Network filtering works (SOLANA_NETWORK=mainnet-beta)
- [ ] Dashboard stats show correct network data
- [ ] Snapshot queries real blockchain data (not test data)
- [ ] Winner selection runs without errors
- [ ] Prize distribution creates valid transactions
- [ ] Transparency endpoints return correct data
- [ ] Connection pool handles expected load

---

## Monitoring & Maintenance

### Daily Checks
- Supabase Dashboard → Database Health
- Connection count (<100 normal)
- Disk usage (<75% of 8GB)
- Query performance (p95 <200ms)
- Backup completion status

### Weekly Tasks
- Review slow queries
- Check disk growth rate
- Verify error logs
- Test backup restore

### Monthly Tasks
- Full backup restore test
- Credential rotation review
- Audit user permissions
- Database statistics review

---

## Cost Breakdown

### Supabase Pro Plan
- **Base**: $25/month
- **Includes**:
  - 8 GB database size
  - 50 GB bandwidth
  - 250 GB egress
  - 100k monthly active users
  - Daily backups (7-day retention)
  - Email support

### Additional Costs (Estimate)
- **Database size overage**: $0.125/GB after 8GB (~$5-10/month estimated)
- **Bandwidth overage**: $0.09/GB after 250GB (~$5-10/month estimated)
- **Total estimated**: $35-50/month for production usage

### Comparison to Alternatives
- **AWS RDS**: $50-200/month (more configuration required)
- **DigitalOcean**: $15-60/month (limited pooling, 3 pools max)
- **Railway**: $20-80/month (smaller provider)
- **Neon**: $20-100/month (newer, serverless architecture)

**Supabase Pro** offers the best balance of features, ease of use, and cost for this project.

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss during migration | Low | Critical | Automated backups before migration, test restore |
| Downtime during migration | Medium | High | Maintenance window, 48h advance notice |
| Connection string errors | Medium | High | Test in staging first, validate formats |
| SSL/TLS issues | Low | Medium | Supabase enforces SSL by default |
| Migration rollback needed | Low | Medium | Keep backup, document rollback procedure |
| Read replica lag | Low | Low | Monitor replication (<5s acceptable) |
| Connection pool exhaustion | Low | Medium | Use PgBouncer (port 6543), auto-scales |
| Cost overrun | Low | Low | Set billing alerts at $50, $75, $100 |

---

## Rollback Plan

If migration fails or issues arise:

### Immediate Rollback (< 1 hour)
1. Stop backend application
2. Revert `.env` to use local Docker database:
   ```env
   DATABASE_URL="postgresql://solotto_app:solotto_app_pw@localhost:5433/solotto?schema=public"
   ```
3. Restart backend application
4. Verify local Docker PostgreSQL is running
5. Test all endpoints

### Data Recovery
1. If data was lost, restore from backup:
   ```bash
   psql -h localhost -p 5433 -U postgres solotto < backup_pre_migration.sql
   ```
2. Verify data integrity
3. Resume operations

### Post-Mortem
1. Document what went wrong
2. Identify root cause
3. Update migration plan
4. Schedule retry with fixes

---

## Success Metrics

### Migration Success Criteria
- ✅ All 4 Prisma migrations applied successfully
- ✅ All 7 database tables created correctly
- ✅ All indexes created (network, drawingDate)
- ✅ Database roles created and permissions granted
- ✅ Backend connects and queries successfully
- ✅ API endpoints return expected data
- ✅ Read-only connection enforced
- ✅ Data persists correctly

### Production Success Criteria (First 48 Hours)
- ✅ 99.9%+ uptime (max 1.4 min downtime)
- ✅ <200ms p95 query latency
- ✅ <0.1% error rate
- ✅ <80% connection pool utilization
- ✅ <70% disk usage
- ✅ All backups completing successfully
- ✅ No data corruption or loss
- ✅ Monitoring alerts working correctly

---

## Support & Resources

### Documentation
- **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md)** - Full detailed guide (use for troubleshooting)
- **[SUPABASE_QUICK_START.md](./SUPABASE_QUICK_START.md)** - Quick reference (use for setup)
- **[deployment_actions.md](../deployment_actions.md)** - Mainnet deployment checklist

### External Resources
- **Supabase Docs**: https://supabase.com/docs/guides/database
- **Supabase Discord**: https://discord.supabase.com
- **Prisma + Supabase**: https://www.prisma.io/docs/guides/deployment/supabase
- **PostgreSQL Manual**: https://www.postgresql.org/docs/16/

### Contact
- **Supabase Support**: support@supabase.io (Pro plan includes email support)
- **Supabase Status**: https://status.supabase.com

---

## Next Actions

### Immediate (Next 24 Hours)
1. [ ] Create Supabase account
2. [ ] Provision Pro plan database
3. [ ] Run through Quick Start guide
4. [ ] Test connection locally
5. [ ] Verify all tables and roles

### Short Term (Next Week)
1. [ ] Set up monitoring alerts
2. [ ] Configure IP allowlist for production
3. [ ] Store credentials in secrets manager
4. [ ] Create mainnet environment variables
5. [ ] Test with production-like data volume

### Medium Term (Before Mainnet Launch)
1. [ ] Load testing (1000+ participants)
2. [ ] Full end-to-end test on devnet with Supabase
3. [ ] Document incident response procedures
4. [ ] Train team on Supabase dashboard
5. [ ] Schedule mainnet launch window

---

## Timeline

### Development/Staging Phase (Week 1-2)
- Day 1: Supabase setup and migration (this guide)
- Day 2-3: Testing and validation
- Day 4-5: Load testing and optimization
- Week 2: Integration testing with full dApp

### Production Phase (Week 3)
- Monday: Final security review
- Tuesday: Backup verification, monitoring setup
- Wednesday: **Mainnet database deployment**
- Thursday: Small test round (100 participants max)
- Friday: Full production launch

---

## Frequently Asked Questions

### Q: Can I use the free tier instead of Pro?
**A:** Not recommended for production. Free tier pauses after inactivity and has connection limits. Pro is $25/month for peace of mind.

### Q: What if I exceed 8GB disk size?
**A:** You pay $0.125/GB for additional storage. 10GB = $25 base + $0.25 overage = $25.25/month.

### Q: Can I migrate back to local PostgreSQL?
**A:** Yes, anytime. Export data via `pg_dump` from Supabase and import to local PostgreSQL.

### Q: Do I need a separate database for devnet and mainnet?
**A:** No, the `network` field separates them. But you CAN use separate databases for extra isolation if desired.

### Q: How do I back up the database manually?
**A:** Use `pg_dump`:
```bash
pg_dump -h db.PROJECT_REF.supabase.co -p 5432 -U postgres postgres > backup.sql
```

### Q: What happens if Supabase goes down?
**A:** Check https://status.supabase.com. Pro plan has 99.9%+ SLA. Have a rollback plan to local database.

### Q: Can I use connection pooling with Prisma?
**A:** Yes, Supabase includes PgBouncer on port 6543. Use `?pgbouncer=true` in connection string.

### Q: How do I rotate passwords?
**A:** Run `ALTER ROLE solotto_app PASSWORD 'new_password'` in SQL Editor, then update env vars and restart backend.

---

**Last Updated**: 2025-01-13
**Author**: Solotto DevOps Team
**Version**: 1.0
