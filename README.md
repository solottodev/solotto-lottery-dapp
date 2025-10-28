# Solotto Lottery dApp

**Status:** 🟢 Ready for Mainnet Deployment

This is the full-stack monorepo for the Solotto on-chain lottery system on Solana.

## 🎰 What is Solotto?

Solotto is a provably fair, on-chain lottery platform built on Solana. It enables transparent, automated lottery drawings where winners are selected using cryptographically secure randomness with full blockchain audit trails.

### Key Features

- ✅ **Provably Fair Drawings** - Cryptographic randomness with blockchain audit (seed, blockhash, slot)
- ✅ **Multi-Tier System** - 4 tiers based on LOTTO token holdings (Top 5%, 5-20%, 20-50%, 50-100%)
- ✅ **Two-Stage Eligibility** - Balance filter ($50+ USD) + Trading activity filter (50%+ change)
- ✅ **Transparent History** - Public transparency portal with complete round data
- ✅ **Automated Distribution** - Jupiter swap integration for SOL → LOTTO prizes with fallback
- ✅ **Operator 2FA** - TOTP authentication for all operator accounts
- ✅ **Network-Aware** - Separate devnet and mainnet operations
- ✅ **RPC Failover** - Automatic failover from Alchemy to public RPC
- ✅ **Session Persistence** - Workflow state restoration on page refresh
- ✅ **CSV Export** - Participant and distribution data export

## 🚀 Mainnet Information

### Token

- **Name:** LOTTO
- **Mint Address:** `HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump`
- **Decimals:** 6
- **Platform:** pump.fun
- **Solscan:** https://solscan.io/token/HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump

### Production URLs

- **Frontend:** https://solotto-lottery-dapp-frontend.vercel.app/
- **Backend API:** https://solotto-lottery-dapp-frontend.vercel.app/api/transparency
- **Transparency Portal:** https://solotto-lottery-dapp-frontend.vercel.app/transparency

solotto.live branded URLs coming soon

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

- **Framework:** Next.js 14.2.33 (App Router, React 18.2.0)
- **Language:** TypeScript 5.3.3
- **Styling:** Tailwind CSS 3.4.13 with custom theme
- **State Management:** Zustand 5.0.8 (with sessionStorage persistence)
- **Forms:** React Hook Form 7.63.0 + Zod 3.22.4 validation
- **Wallet Integration:**
  - @solana/wallet-adapter-react 0.15.39
  - Phantom, Solflare support
  - Auto-connect functionality
- **Data Fetching:** @tanstack/react-query 5.90.2
- **Icons:** Lucide React 0.544.0
- **Hosting:** Vercel

### Backend

- **Runtime:** Node.js 18+
- **Framework:** Express.js 4.18.2
- **Language:** TypeScript 5.3.3
- **ORM:** Prisma 6.16.3 (with read-write separation)
- **Authentication:**
  - JWT (jsonwebtoken 9.0.2, 1-hour expiration)
  - bcryptjs 3.0.2 (password hashing)
  - speakeasy 2.0.0 (TOTP 2FA)
- **Validation:** Zod 4.1.11
- **Documentation:** Swagger/OpenAPI (swagger-jsdoc, swagger-ui-express)
- **Testing:** Jest 29.7.0 + Supertest 6.3.4
- **Hosting:** Render.com

### Database

- **Type:** PostgreSQL 16
- **Hosting:** Supabase Pro ($25/month)
- **Connection Pooling:** PgBouncer (port 6543)
- **Roles:**
  - postgres (superuser, migrations)
  - solotto_app (read-write, application)
  - solotto_ro (read-only, public endpoints)
- **Backup:** Daily automated backups (7-day retention)
- **SSL/TLS:** Required for all connections
- **Tables:** 7 core tables (User, LotteryConfig, Round, Participant, Snapshot, Drawing, BalanceSnapshot)

### Blockchain

- **Network:** Solana mainnet-beta / devnet
- **RPC:**
  - Primary: Alchemy Enhanced RPC
  - Fallback: Public RPC (api.devnet.solana.com)
  - Automatic failover support
- **SDKs:**
  - @solana/web3.js 1.98.4
  - @solana/spl-token 0.4.14
- **Swap:** Jupiter Aggregator v6 API (SOL ↔ LOTTO)
- **Price Data:** CoinGecko API
- **Signature Verification:** TweetNaCl.js 1.0.3

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

## 🎲 How Solotto Works

### Lottery Workflow (5 Phases)

**Phase 1: Control** - Configure lottery round

- Set eligibility window (start/end dates)
- Configure minimum USD balance (default: $50)
- Set trading activity threshold (default: 50% balance change)
- Define prize distribution percentage (default: 70% of wallet)
- Specify blacklist (wallets to exclude)
- Validate prize source wallet balance on-chain
- Capture START balances for trading activity tracking

**Phase 2: Snapshot** - Identify eligible participants

- Fetch all LOTTO token holders from Solana blockchain
- Assign tiers based on USD balance:
  - **Tier 1:** Top 5% of holders
  - **Tier 2:** 5-20%
  - **Tier 3:** 20-50%
  - **Tier 4:** 50-100%
  - **Dust:** Below $50 minimum (ineligible)
- Capture END balances at round completion
- Calculate trading activity: `(END - START) / START * 100%`
- Mark participants eligible if:
  - USD balance >= $50 **AND**
  - Trading activity >= 50%

**Phase 3: Drawing** - Select winners cryptographically

- Generate 32-byte secure random seed (`crypto.randomBytes(32)`)
- For each tier (T1-T4):
  - Create deterministic hash: `SHA256(seed + tierIndex)`
  - Select winner: `hash % eligibleParticipants.length`
- Capture blockchain state (blockhash, slot) for audit trail
- Store seed and results in database
- Confirm drawing and mark winners

**Phase 4: Harvest** - Calculate prize distribution

- Query operator wallet SOL balance
- Calculate prize pool: `balance * 70%`
- Allocate by tier:
  - **T1:** 40% of prize pool
  - **T2:** 30%
  - **T3:** 20%
  - **T4:** 10%

**Phase 5: Distribution** - Pay winners

- **Option 1:** Jupiter swap (SOL → LOTTO tokens)
  - Fetch swap quotes for each winner
  - Build unsigned versioned transactions
  - Operator signs with wallet (Phantom/Solflare)
  - Broadcast to Solana network
- **Option 2:** Direct SOL transfer (fallback)
- Store transaction signatures for transparency
- Export distribution results as CSV

### Eligibility System (Two-Stage Filter)

**Stage 1 - Balance Filter (at snapshot):**

- Must hold >= $50 USD worth of LOTTO tokens
- Assigned to Tier 1-4 based on percentile ranking

**Stage 2 - Trading Activity Filter (at confirmation):**

- Balance must change by >= 50% during eligibility window
- Calculated from START (round creation) vs END (confirmation) balances
- Prevents static wallets from winning

**Winner Selection:**

- Only eligible participants (passed both filters) can win
- One winner per tier (4 total per round)
- Deterministic from seed (verifiable by anyone)
- Blockchain audit trail for complete transparency

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
   - API Docs: http://localhost:4000/api/v1/docs (Swagger UI)
   - Database GUI: `npx prisma studio` (http://localhost:5555)

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

## 🔌 API Overview

### REST API Endpoints

The backend provides a comprehensive REST API for lottery operations:

**Authentication & Health:**

- `POST /auth/register` - Create operator account
- `POST /auth/login` - Login with email/password (+ optional 2FA)
- `POST /auth/setup-2fa` - Setup TOTP 2FA
- `GET /api/v1/health` - Database health check
- `GET /api/v1/health/rpc` - Solana RPC health check
- `GET /api/v1/health/jupiter` - Jupiter swap health check

**Lottery Operations (Protected):**

- `POST /api/v1/control` - Create lottery configuration
- `POST /api/v1/snapshot/run` - Execute token holder snapshot
- `POST /api/v1/snapshot/confirm` - Calculate trading activity & eligibility
- `GET /api/v1/snapshot/:id/participants` - Fetch participants (JSON)
- `GET /api/v1/snapshot/:id/participants/export` - Export participants (CSV)
- `POST /api/v1/drawing/run` - Execute cryptographic drawing
- `POST /api/v1/drawing/confirm` - Confirm drawing results
- `POST /api/v1/harvest/prepare` - Calculate prize pool allocations
- `POST /api/v1/distribution/prepare` - Build unsigned transactions
- `POST /api/v1/distribution/execute` - Broadcast signed transactions

**Public Data:**

- `GET /api/v1/price/current` - Current LOTTO price (CoinGecko)
- `GET /api/v1/history/stats` - Lottery statistics
- `GET /api/v1/transparency` - Transparency dashboard data

**Authentication:** JWT tokens (1-hour expiration) required for protected endpoints

**Documentation:** Interactive Swagger UI at `/api/v1/docs`

See [apps/backend/README.md](./apps/backend/README.md) for complete API documentation.

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
- **[apps/backend/DATABASE_README.md](./apps/backend/DATABASE_README.md)** - Database schema & operations
- **[apps/frontend/README.md](./apps/frontend/README.md)** - Frontend application documentation
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

### Phase 1: Mainnet Launch (Complete)

- [x] Implement 2FA for operators
- [x] Integrate Jupiter swap (SOL → LOTTO)
- [x] Build E2E test suite
- [x] Complete security hardening
- [ ] Deploy to mainnet
- [ ] First production lottery round

### Phase 2: Enhancement (Post-Launch)

- [ ] Email notifications for winners
- [ ] Discord and Telegram bot integration
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
