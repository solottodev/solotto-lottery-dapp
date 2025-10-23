# Solotto Lottery dApp

**Status:** 🟢 Ready for Mainnet Deployment

This is the full-stack monorepo for the Solotto on-chain lottery system on Solana.

## 🎰 What is Solotto?

Solotto is a provably fair, on-chain lottery platform built on Solana. It enables transparent, automated lottery drawings where winners are selected using cryptographically secure randomness with full blockchain audit trails.

### Key Features

- ✅ **Provably Fair Drawings** - Cryptographic randomness with blockchain audit (seed, blockhash, slot)
- ✅ **Multi-Tier System** - 4 tiers based on LOTTO token holdings
- ✅ **Transparent History** - Public transparency portal with complete round data
- ✅ **Automated Distribution** - Jupiter swap integration for SOL → LOTTO prizes
- ✅ **Network-Aware** - Separate devnet and mainnet operations

## 🚀 Mainnet Information

### Token

- **Name:** LOTTO
- **Mint Address:** `HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump`
- **Decimals:** 6
- **Platform:** pump.fun
- **Solscan:** https://solscan.io/token/HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump

### Production URLs

- **Frontend:** https://solotto.live _(Coming Soon)_
- **Backend API:** https://api.solotto.live _(Coming Soon)_
- **Transparency Portal:** https://solotto.live/transparency _(Coming Soon)_

### Deployment Status

- 🟢 **Database:** Supabase Pro - Operational
- 🟢 **Backend:** Complete with 2FA and Jupiter integration
- 🟢 **Frontend:** Complete and tested on staging
- 🟢 **Mainnet Launch:** Ready for deployment (October 2025)

See [MAINNET_DEPLOYMENT_PLAN.md](./MAINNET_DEPLOYMENT_PLAN.md) for detailed deployment roadmap.

## 📋 Development Status

**All features complete and tested!**

- ✅ Core modules complete (Control, Snapshot, Drawing, Harvest, Distribution)
- ✅ Database migrated to Supabase Pro
- ✅ Email/password authentication with 2FA (TOTP)
- ✅ Cryptographic drawing system (crypto.randomBytes + blockchain audit)
- ✅ Jupiter swap integration (SOL → LOTTO with fallback)
- ✅ E2E test suite implemented
- ✅ Staging deployment successful
- 🟢 **Ready for production deployment**

See [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) for detailed progress tracking.

## 🛠️ Technology Stack

### Frontend

- **Framework:** Next.js 14+ (React, TypeScript)
- **Styling:** TailwindCSS
- **Wallet Integration:** Solana Wallet Adapter (Phantom, Solflare)
- **Hosting:** Vercel

### Backend

- **Runtime:** Node.js + Express
- **Language:** TypeScript
- **ORM:** Prisma
- **Hosting:** Render.com

### Database

- **Type:** PostgreSQL 16
- **Hosting:** Supabase Pro
- **Roles:** 3 roles (admin, read/write, read-only)
- **Backup:** Daily automated backups (7-day retention)

### Blockchain

- **Network:** Solana mainnet-beta / devnet
- **RPC:** Alchemy (current tier)
- **SDKs:** @solana/web3.js, @solana/spl-token
- **Swap:** Jupiter Aggregator (SOL ↔ LOTTO)

## 🏗️ Project Structure

```
solotto-lottery-dapp/
├── apps/
│   ├── frontend/          # Next.js frontend
│   │   ├── app/           # Next.js 14 app directory
│   │   ├── components/    # React components
│   │   └── lib/           # Utilities
│   │
│   └── backend/           # Express API server
│       ├── src/
│       │   ├── routes/    # API endpoints
│       │   ├── services/  # Business logic
│       │   ├── middleware/# Auth, validation
│       │   └── prisma/    # Database client
│       ├── prisma/        # Database schema & migrations
│       └── tests/         # E2E test suite
│
├── docs/                  # Documentation
│   ├── archive/           # Outdated docs
│   ├── SUPABASE_*.md      # Database migration docs
│   └── *.md               # Feature documentation
│
├── MAINNET_DEPLOYMENT_PLAN.md      # 🎯 Deployment master plan
├── IMPLEMENTATION_CHECKLIST.md     # 📋 Progress tracking
└── README.md                       # 📖 This file
```

## 💻 Local Development Setup

### Prerequisites

- Node.js 18+ and npm/yarn
- Git
- Solana CLI (optional, for local wallet testing)

### Quick Start

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd solotto-lottery-dapp
   ```

2. **Install dependencies**

   ```bash
   yarn install
   # or
   npm install
   ```

3. **Set up environment variables**

   ```bash
   # Backend
   cd apps/backend
   cp .env.example .env
   # Edit .env with your configuration

   # Frontend
   cd ../frontend
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**

   The project uses Supabase Pro for the database. See connection details in:

   - `docs/SUPABASE_MIGRATION_COMPLETE.md`

   For local development, the backend connects to Supabase with `network='devnet'` to keep test data separate from production.

5. **Run database migrations**

   ```bash
   cd apps/backend
   npx prisma generate
   npx prisma migrate deploy
   ```

6. **Start development servers**

   ```bash
   # From project root
   yarn dev
   # This starts both frontend (localhost:3000) and backend (localhost:4000)
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:4000
   - API Docs: http://localhost:4000/api-docs (Swagger)

### Development Workflow

**Backend Development:**

```bash
cd apps/backend
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm test             # Run E2E tests (when implemented)
```

**Frontend Development:**

```bash
cd apps/frontend
npm run dev          # Start Next.js dev server
npm run build        # Build for production
npm run start        # Start production server
```

**Database Operations:**

```bash
cd apps/backend

# Create a new migration
npx prisma migrate dev --name your_migration_name

# View database in browser
npx prisma studio

# Check migration status
npx prisma migrate status
```

## 🚀 Mainnet Deployment

### Quick Start (Deployment Scripts)

```bash
# Step 1: Generate JWT secret for production
npm run deploy:jwt

# Step 2: Verify configuration before deployment
npm run deploy:verify

# Step 3: Run pre-deployment checks
npm run deploy:check

# Step 4: Follow deployment guide
# See READY_TO_DEPLOY.md for detailed instructions
```

### Deployment Documentation

- **[READY_TO_DEPLOY.md](./READY_TO_DEPLOY.md)** - 🎯 **START HERE** - Quick deployment guide
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Step-by-step checklist
- **[MAINNET_DEPLOYMENT_GUIDE.md](./MAINNET_DEPLOYMENT_GUIDE.md)** - Comprehensive deployment guide
- **[MAINNET_DEPLOYMENT_PLAN.md](./MAINNET_DEPLOYMENT_PLAN.md)** - Full deployment plan

### Deployment Timeline

- **Configure Secrets:** 15 minutes
- **Deploy Backend (Render):** 20 minutes
- **Deploy Frontend (Vercel):** 15 minutes
- **Verification & Monitoring:** 30 minutes
- **Total:** ~1.5 hours + 24-48h monitoring before first round

## 🧪 Testing

### E2E Test Suite

```bash
cd apps/backend
npm test                 # Run all tests
npm run test:e2e         # Run E2E tests only
npm run test:coverage    # Generate coverage report
```

### Manual Testing

See [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) for manual testing procedures.

## 📚 Documentation

### For Operators

- **[OPERATOR_RUNBOOK.md](./OPERATOR_RUNBOOK.md)** - Day-to-day operations _(Coming Soon)_
- **[INCIDENT_RESPONSE.md](./INCIDENT_RESPONSE.md)** - Emergency procedures _(Coming Soon)_

### For Developers

- **[MAINNET_DEPLOYMENT_PLAN.md](./MAINNET_DEPLOYMENT_PLAN.md)** - Complete deployment guide
- **[IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)** - Task tracking
- **[docs/SUPABASE_MIGRATION_COMPLETE.md](./docs/SUPABASE_MIGRATION_COMPLETE.md)** - Database setup

### Architecture Documentation

- **[apps/backend/README.md](./apps/backend/README.md)** - Backend API documentation
- **[apps/backend/README_TRANSPARENCY.md](./apps/backend/README_TRANSPARENCY.md)** - Transparency features
- **[docs/WALLET_BASED_AUTH.md](./docs/WALLET_BASED_AUTH.md)** - Authentication design

### Archived Documentation

Old documentation has been moved to `docs/archive/` and is preserved for historical reference only.

## 🔐 Security

### Authentication

- Operator accounts use email/password authentication
- 2FA (TOTP) required for all operator logins (Google Authenticator/Authy compatible)
- JWT tokens with 1-hour expiration
- bcrypt password hashing (10 salt rounds)

### Drawing System

- Cryptographically secure randomness (Node.js crypto.randomBytes)
- Blockchain audit trail (seed, blockhash, slot)
- Deterministic verification via SHA-256
- Complete transparency via public API

### Infrastructure

- Database: Supabase Pro with SSL/TLS, connection pooling, role-based access
- API: Rate limiting, CORS restrictions, input validation (Zod)
- Secrets: Encrypted environment variables (Render/Vercel)
- Monitoring: Sentry error tracking, UptimeRobot uptime monitoring

## 🤝 Contributing

This is a private project under active development. Contributions are currently limited to the core team.

### Development Guidelines

1. Always work on a feature branch
2. Write E2E tests for critical paths
3. Update documentation for significant changes
4. Test thoroughly on devnet before mainnet
5. Follow TypeScript best practices
6. Use conventional commit messages

## 📄 License

_License information to be added_

## 📞 Support

For questions or issues:

- Technical issues: Create an issue in the repository
- Security concerns: Contact team directly (do not create public issues)
- Community: Discord/Twitter _(Links coming soon)_

## 🎉 Roadmap

### Phase 1: Mainnet Launch (Current - 4-6 weeks)

- [ ] Implement 2FA for operators
- [ ] Integrate Jupiter swap (SOL → LOTTO)
- [ ] Build E2E test suite
- [ ] Complete security hardening
- [ ] Deploy to mainnet
- [ ] First production lottery round

### Phase 2: Enhancement (Post-Launch)

- [ ] Email notifications for winners
- [ ] Discord bot integration
- [ ] Twitter announcements automation
- [ ] Enhanced admin dashboard
- [ ] Analytics and reporting
- [ ] Multi-language support

### Phase 3: Scaling (Future)

- [ ] Multiple lottery types
- [ ] Governance integration
- [ ] Mobile app (iOS/Android)
- [ ] Partnership integrations
- [ ] Cross-chain support (?)

---

**Built with ❤️❤️❤️ on Solana**
