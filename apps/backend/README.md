# Solotto Backend API

**Status:** Production Ready

This is the Express.js backend API server for the Solotto on-chain lottery system. It provides REST endpoints for lottery management, cryptographic drawing, prize distribution, and public transparency.

## Overview

The backend orchestrates the entire lottery lifecycle:

1. **Control** - Configure lottery rounds with eligibility rules
2. **Snapshot** - Fetch token holders and assign tiers
3. **Drawing** - Select winners using cryptographic randomness
4. **Harvest** - Calculate prize distribution from operator wallet
5. **Distribution** - Execute prize payments via Jupiter swap or direct SOL transfer
6. **Transparency** - Public API for audit trails and system health

## Technology Stack

### Core Framework
- **Runtime:** Node.js 18+
- **Framework:** Express.js 4.18.2
- **Language:** TypeScript 5.3.3
- **ORM:** Prisma 6.16.3 (PostgreSQL)

### Blockchain Integration
- **Solana SDK:** @solana/web3.js 1.98.4
- **SPL Token:** @solana/spl-token 0.4.14
- **RPC Provider:** Alchemy Enhanced RPC with public fallback
- **Swap Integration:** Jupiter Aggregator v6 API
- **Price Data:** CoinGecko API

### Authentication & Security
- **JWT:** jsonwebtoken 9.0.2 (1-hour expiration)
- **Password Hashing:** bcryptjs 3.0.2 (10 salt rounds)
- **2FA:** speakeasy 2.0.0 (TOTP)
- **QR Codes:** qrcode 1.5.4
- **Signature Verification:** tweetnacl 1.0.3

### Utilities
- **Validation:** Zod 4.1.11
- **HTTP Client:** Axios 1.12.2
- **CORS:** cors 2.8.5
- **Environment:** dotenv 16.3.1
- **Base58:** bs58 6.0.0

### Documentation & Testing
- **API Docs:** Swagger/OpenAPI (swagger-jsdoc, swagger-ui-express)
- **Testing:** Jest 29.7.0 + Supertest 6.3.4
- **TypeScript Testing:** ts-jest 29.4.5

## Project Structure

```
apps/backend/
├── src/
│   ├── index.ts                          # Express app & server
│   ├── prisma.ts                         # Prisma client setup
│   │
│   ├── middleware/
│   │   └── requireJwt.ts                 # JWT authentication
│   │
│   ├── routes/
│   │   ├── auth.ts                       # Registration, login, 2FA
│   │   ├── control.ts                    # Lottery configuration
│   │   ├── snapshot.ts                   # Token holder snapshots
│   │   ├── drawing.ts                    # Winner selection
│   │   ├── harvest.ts                    # Prize pool calculation
│   │   ├── distribution.ts               # Prize payments
│   │   ├── history.ts                    # Historical data & stats
│   │   ├── price.ts                      # Token price fetching
│   │   └── transparency.ts               # Public audit API
│   │
│   ├── services/
│   │   ├── rpc.service.ts                # Solana RPC with fallback
│   │   ├── snapshot.service.ts           # Snapshot logic
│   │   ├── drawing.service.ts            # Cryptographic drawing
│   │   ├── transfer.service.ts           # Transaction handling
│   │   ├── trading-activity.service.ts   # Eligibility calculation
│   │   ├── jupiter.service.ts            # Jupiter swap integration
│   │   ├── alchemy.client.ts             # Alchemy API client
│   │   └── price.service.ts              # Price service
│   │
│   ├── controllers/
│   │   └── auth.controller.ts            # Authentication logic
│   │
│   ├── utils/
│   │   ├── jwt.ts                        # JWT utilities
│   │   ├── solana.ts                     # Solana helpers
│   │   └── zodSchemas.ts                 # Validation schemas
│   │
│   └── config/
│       ├── networks.ts                   # Network configuration
│       └── swagger.ts                    # OpenAPI spec
│
├── prisma/
│   ├── schema.prisma                     # Database schema
│   └── migrations/                       # Migration history
│
├── tests/                                # Jest E2E tests
├── dist/                                 # Compiled JavaScript
├── package.json                          # Dependencies & scripts
├── tsconfig.json                         # TypeScript config
└── jest.config.js                        # Jest config
```

## Environment Variables

Create a `.env` file in `apps/backend/`:

```env
# Server
PORT=4000
NODE_ENV=development

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/solotto
DATABASE_URL_RO=postgresql://readonly:password@localhost:5432/solotto  # Optional

# Authentication
JWT_SECRET=your-secret-key-here

# Solana Network
SOLANA_NETWORK=devnet                    # devnet | mainnet-beta
ALCHEMY_RPC_URL=https://solana-devnet.g.alchemy.com/v2/YOUR_KEY
ALCHEMY_API_KEY=your-alchemy-api-key
SOLANA_RPC_FALLBACK=https://api.devnet.solana.com

# Token Configuration
LOTTO_MINT_ADDRESS=your-devnet-mint-address
LOTTO_PRICE_MINT=HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump  # For CoinGecko

# Jupiter
JUPITER_API_BASE_URL=https://quote-api.jup.ag

# Security
HARD_BLACKLIST=["wallet1","wallet2"]     # JSON array of blacklisted wallets

# Logging
HEALTH_DEBUG=0                           # Set to 1 for detailed health check logs
```

See [.env.example](.env.example) for a complete template.

## Installation & Setup

### 1. Install Dependencies

```bash
cd apps/backend
npm install
```

### 2. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# View database in browser (optional)
npx prisma studio
```

See [Database README](./DATABASE_README.md) for detailed database documentation.

### 3. Start Development Server

```bash
npm run dev          # Hot reload with ts-node
```

The server starts at http://localhost:4000

### 4. Access API Documentation

Visit http://localhost:4000/api/v1/docs for the interactive Swagger UI.

## API Endpoints

### Authentication

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/register` | Create operator account | No |
| POST | `/auth/login` | Login with email/password | No |
| POST | `/auth/login-wallet` | Login with Solana wallet signature | No |
| POST | `/auth/setup-2fa` | Setup TOTP 2FA | Yes |
| POST | `/auth/verify-2fa` | Enable 2FA with TOTP code | Yes |
| POST | `/auth/disable-2fa` | Disable 2FA | Yes |
| POST | `/auth/change-password` | Update password | Yes |

### Health Checks

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/` | Root health check | No |
| GET | `/api/v1/health` | Database health | No |
| GET | `/api/v1/health/rpc` | Solana RPC health | No |
| GET | `/api/v1/health/alchemy` | Alchemy API health | No |
| GET | `/api/v1/health/jupiter` | Jupiter config validation | No |

### Lottery Operations

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/control` | Create lottery round | Yes |
| POST | `/api/v1/snapshot/run` | Execute token snapshot | Yes |
| POST | `/api/v1/snapshot/confirm` | Calculate eligibility | Yes |
| GET | `/api/v1/snapshot/:id/participants` | Get participants (JSON) | Yes |
| GET | `/api/v1/snapshot/:id/participants/export` | Export participants (CSV) | Yes |
| POST | `/api/v1/drawing/run` | Execute drawing | Yes |
| POST | `/api/v1/drawing/confirm` | Confirm drawing results | Yes |
| POST | `/api/v1/harvest/prepare` | Calculate prize pool | Yes |
| POST | `/api/v1/distribution/prepare` | Build prize transactions | Yes |
| POST | `/api/v1/distribution/execute` | Submit signed transactions | Yes |

### Data & Transparency

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/v1/price/current` | Get LOTTO price (CoinGecko) | No |
| GET | `/api/v1/history/stats` | Lottery statistics | No |
| GET | `/api/v1/transparency` | Public transparency dashboard | No |

## Lottery Workflow

### Phase 1: Configuration

```bash
POST /api/v1/control
```

Creates a lottery round with:
- Token mint and decimals
- Eligibility window (start/end dates)
- Trading activity threshold (default: 50%)
- Minimum USD balance (default: $50)
- Prize distribution percentage (default: 70%)
- Blacklist (wallets to exclude)
- Prize source wallet

**Validations:**
- Checks prize source wallet balance on-chain
- Enforces hard blacklist + per-round blacklist
- Captures initial (START) balances for trading activity tracking

### Phase 2: Snapshot

```bash
POST /api/v1/snapshot/run
```

Fetches all token holders from blockchain:
1. Queries Alchemy Enhanced API or RPC fallback
2. Filters non-zero balances
3. Converts to UI amounts using token decimals
4. Assigns tiers based on USD balance:
   - **Tier 1:** Top 5% of holders
   - **Tier 2:** 5-20%
   - **Tier 3:** 20-50%
   - **Tier 4:** 50-100%
   - **Dust:** Below $50 minimum (tier = null)
5. Stores participants in database

```bash
POST /api/v1/snapshot/confirm
```

Calculates eligibility:
1. Captures END balances (round completion state)
2. Calculates trading activity: `(END - START) / START * 100`
3. Marks `isEligible = true` if trading activity >= threshold
4. Updates round statistics

**Eligibility Requirements (AND logic):**
- USD balance >= $50
- Trading activity >= 50%

### Phase 3: Drawing

```bash
POST /api/v1/drawing/run
```

Selects winners using cryptographic randomness:
1. Generates 32-byte secure random seed (`crypto.randomBytes(32)`)
2. For each tier:
   - Retrieves all eligible participants
   - Generates deterministic random index from seed + tier
   - Selects winner at that index
3. Captures blockchain state (blockhash, slot) for audit
4. Returns winners and eligible counts

```bash
POST /api/v1/drawing/confirm
```

Confirms drawing results:
- Updates round with winner wallet addresses per tier
- Sets drawing timestamp
- Transitions status to CONFIRMED

**Drawing Algorithm:**
```javascript
// Deterministic seeded randomness
const hash = crypto.createHash('sha256')
  .update(seed + tierIndex)
  .digest();
const randomValue = parseInt(hash.slice(0, 8), 16);
const winnerIndex = randomValue % eligibleParticipants.length;
```

### Phase 4: Harvest

```bash
POST /api/v1/harvest/prepare
```

Calculates prize distribution:
1. Queries operator wallet's current SOL balance
2. Calculates prize pool: `balance * prizeDistributionPercent`
3. Allocates by tier:
   - **Tier 1:** 40% of prize pool
   - **Tier 2:** 30%
   - **Tier 3:** 20%
   - **Tier 4:** 10%
4. Returns tier allocations and total prize pool

### Phase 5: Distribution

```bash
POST /api/v1/distribution/prepare
```

Builds unsigned prize transactions:

**Option 1: Jupiter Swap (SOL → LOTTO)**
- Fetches swap quotes for each winner
- Builds versioned transactions
- Returns base64-encoded transactions + expected LOTTO amounts
- Slippage: 0.5% default (configurable)

**Option 2: Direct SOL Transfer (Fallback)**
- Creates system program transfer instructions
- Batches by operator token accounts
- Returns base64-encoded transactions

```bash
POST /api/v1/distribution/execute
```

Submits signed transactions:
- Receives frontend-signed transactions
- Broadcasts to Solana network
- Stores transaction signatures in database

## Service Architecture

### RPC Service

**Primary:** Alchemy Enhanced RPC
**Fallback:** Public RPC (api.devnet.solana.com)

```typescript
const rpcService = getRPCService();
const balance = await rpcService.getBalance(wallet);
```

**Features:**
- Automatic failover on connection errors
- Temporary preference switching
- Connection health monitoring

### Snapshot Service

Handles token holder discovery and tier assignment:

```typescript
const snapshotService = getSnapshotService();
await snapshotService.runSnapshot(roundId);
```

### Drawing Service

Cryptographic winner selection:

```typescript
const drawingService = getDrawingService();
const { winners } = await drawingService.runDrawing(roundId);
```

### Jupiter Service

Token swap integration:

```typescript
const jupiterService = getJupiterService();
const quote = await jupiterService.getSwapQuote(inputMint, outputMint, amount);
```

### Trading Activity Service

Eligibility calculation:

```typescript
const tradingService = getTradingActivityService();
await tradingService.captureStartBalances(roundId);
await tradingService.captureEndBalances(roundId);
await tradingService.calculateEligibility(roundId, threshold);
```

## Security

### Authentication
- JWT tokens with 1-hour expiration
- bcrypt password hashing (10 salt rounds)
- TOTP 2FA for operators (Google Authenticator compatible)
- Wallet signature verification (TweetNaCl)

### Drawing System
- Cryptographically secure randomness (crypto.randomBytes)
- Deterministic verification (SHA-256)
- Blockchain audit trail (blockhash, slot, seed)
- Public transparency API

### Infrastructure
- Database: SSL/TLS required, connection pooling
- API: Rate limiting, CORS restrictions
- Input validation: Zod schemas
- Environment: Encrypted secrets (Render/Vercel)

## Testing

```bash
# Run all tests
npm test

# Run E2E tests
npm run test:e2e

# Generate coverage report
npm run test:coverage
```

## Deployment

### Production Build

```bash
npm run build        # Compile TypeScript to dist/
npm run start        # Start production server
```

### Environment Requirements

- Node.js 18+
- PostgreSQL 16 (Supabase Pro recommended)
- Alchemy RPC account
- Environment variables configured

### Deployment Platforms

- **Backend:** Render.com
- **Database:** Supabase Pro
- **Monitoring:** Sentry, UptimeRobot

See [MAINNET_DEPLOYMENT_PLAN.md](../../MAINNET_DEPLOYMENT_PLAN.md) for detailed deployment guide.

## Network Configuration

The backend supports multiple Solana networks via `SOLANA_NETWORK` environment variable:

| Network | RPC Endpoint | Token Mint |
|---------|--------------|------------|
| mainnet-beta | api.mainnet-beta.solana.com | `HJSnJaQv...` (LOTTO) |
| devnet | api.devnet.solana.com | Test token |
| testnet | api.testnet.solana.com | Test token |

Network is automatically configured based on environment variable.

## Troubleshooting

### Database Connection Issues

```bash
# Check Prisma connection
npx prisma db pull

# Regenerate client
npx prisma generate

# View migration status
npx prisma migrate status
```

### RPC Connection Failures

Set `HEALTH_DEBUG=1` in `.env` to see detailed RPC connection logs:

```bash
GET /api/v1/health/rpc
```

### Jupiter Swap Errors

Verify Jupiter configuration:

```bash
GET /api/v1/health/jupiter
```

## Development Commands

```bash
# Development
npm run dev              # Start dev server with hot reload

# Building
npm run build            # Compile TypeScript
npm run start            # Start production server

# Database
npx prisma generate      # Generate Prisma client
npx prisma migrate dev   # Create new migration
npx prisma migrate deploy  # Apply migrations
npx prisma studio        # Open database GUI

# Testing
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Generate coverage

# Code Quality
npm run lint             # Run ESLint
npm run format           # Format with Prettier
```

## Contributing

1. Create a feature branch
2. Write E2E tests for critical paths
3. Update API documentation in Swagger comments
4. Test on devnet before mainnet
5. Follow TypeScript best practices

## Related Documentation

- [Database README](./DATABASE_README.md) - Database schema and operations
- [Transparency Features](./README_TRANSPARENCY.md) - Public API documentation
- [Deployment Guide](../../MAINNET_DEPLOYMENT_PLAN.md) - Production deployment
- [Implementation Checklist](../../IMPLEMENTATION_CHECKLIST.md) - Feature tracking

## Support

- **Technical Issues:** Create repository issue
- **Security Concerns:** Contact team directly (do not create public issues)
- **API Documentation:** http://localhost:4000/api/v1/docs

---

**Built on Solana with Express.js, Prisma, and TypeScript**
