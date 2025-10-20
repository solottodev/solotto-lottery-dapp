# Archived Documentation

This folder contains outdated documentation that has been superseded by newer versions.

## Archived Files

### solotto_deployment_runbook.md
- **Date Archived:** October 13, 2025
- **Reason:** References outdated architecture (Switchboard VRF, wallet-based auth, Railway hosting)
- **Replaced By:** `MAINNET_DEPLOYMENT_PLAN.md` (root directory)

### deployment_actions.md
- **Date Archived:** October 13, 2025
- **Reason:** Contains outdated deployment actions and references to removed features
- **Replaced By:** `MAINNET_DEPLOYMENT_PLAN.md` (root directory)

## Current Documentation

For the latest deployment information, see:
- **[MAINNET_DEPLOYMENT_PLAN.md](../../MAINNET_DEPLOYMENT_PLAN.md)** - Single source of truth for deployment
- **[docs/SUPABASE_MIGRATION_COMPLETE.md](../SUPABASE_MIGRATION_COMPLETE.md)** - Database migration status
- **[README.md](../../README.md)** - Project overview and setup

## Why These Documents Were Archived

The original runbook and deployment actions document were created before several key architectural decisions:

1. **Drawing System Change:** Switchboard VRF → Node.js crypto.randomBytes()
2. **Authentication Change:** Wallet-based → Email/password with 2FA
3. **Infrastructure Change:** Railway → Render
4. **Database Migration:** Docker PostgreSQL → Supabase Pro
5. **Removed Features:** Test data auto-copy feature removed

Rather than maintaining multiple conflicting documents, we've consolidated everything into a single master plan that reflects current decisions.

## Historical Context

These documents are preserved for historical reference and to understand the evolution of the project's architecture. If you need to reference old decisions or implementation details, they're available here but should not be used for current development or deployment.

---

**Last Updated:** October 13, 2025
