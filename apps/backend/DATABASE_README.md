# Solotto Database Documentation

**Database Type:** PostgreSQL 16
**ORM:** Prisma 6.16.3
**Hosting:** Supabase Pro (Production) / Docker (Development)

This document provides comprehensive documentation for the Solotto lottery database schema, architecture, and operations.

## Overview

The Solotto database tracks the complete lifecycle of lottery rounds, from configuration through winner distribution. It uses PostgreSQL with Prisma ORM for type-safe queries and automated migrations.

### Key Features

- **7 core tables** for lottery operations
- **Two-stage eligibility filtering** (balance + trading activity)
- **Cryptographic audit trail** (seeds, blockhashes, signatures)
- **Network isolation** (separate devnet/mainnet data)
- **Role-based access** (admin, read-write, read-only)
- **Connection pooling** (PgBouncer for application connections)

## Database Technology Stack

### PostgreSQL 16
- **Hosting:** Supabase Pro (managed service)
- **Connection Pooling:** PgBouncer (port 6543)
- **Direct Access:** Port 5432 (for migrations)
- **SSL/TLS:** Required (`sslmode=require`)

### Prisma ORM
- **Version:** 6.16.3
- **Generator:** Prisma Client (TypeScript)
- **Migration Tool:** Prisma Migrate
- **GUI Tool:** Prisma Studio

### Connection Configuration

```env
# Primary connection (read-write)
DATABASE_URL="postgresql://solotto_app:password@host:6543/postgres?pgbouncer=true&sslmode=require"

# Read-only connection (optional, for public endpoints)
DATABASE_URL_RO="postgresql://solotto_ro:password@host:6543/postgres?pgbouncer=true&sslmode=require"
```

## Database Schema

### Entity Relationship Diagram

```
User (1) ─────< (Many) LotteryConfig

Round (1) ─────< (Many) Participant
      │
      ├─────< (Many) Snapshot
      │
      ├─────< (Many) Drawing
      │
      └─────< (Many) BalanceSnapshot
```

## Table Schemas

### 1. User

Stores operator accounts with authentication credentials and 2FA setup.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | User identifier |
| `email` | String | UNIQUE, NOT NULL | Login email |
| `password` | String | NOT NULL | bcrypt hashed password (10 rounds) |
| `totpSecret` | String | NULLABLE | TOTP secret for 2FA (base32) |
| `totpEnabled` | Boolean | DEFAULT false | 2FA activation status |
| `createdAt` | DateTime | DEFAULT now() | Account creation timestamp |
| `updatedAt` | DateTime | AUTO UPDATE | Last modification timestamp |

**Relations:**
- Has many `LotteryConfig` (via `createdById`)

**Indexes:**
- `email` (unique)

---

### 2. LotteryConfig

Configuration parameters for each lottery round.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | Config identifier |
| `tokenMint` | String | NOT NULL | Solana token mint address |
| `tokenDecimals` | Int | NOT NULL | Token decimal places (usually 6 or 9) |
| `snapshotStart` | DateTime | NOT NULL | Eligibility window start |
| `snapshotEnd` | DateTime | NOT NULL | Eligibility window end |
| `drawTime` | DateTime | NULLABLE | Scheduled drawing time |
| `tradePercentage` | Float | NOT NULL | Trading activity threshold (e.g., 50%) |
| `minUsdLottoRequired` | Float | DEFAULT 50.0 | Minimum USD balance for eligibility |
| `prizeDistributionPercent` | Float | DEFAULT 70.0 | % of wallet balance for prizes |
| `slippageTolerancePercent` | Float | DEFAULT 0.5 | Swap slippage tolerance |
| `blacklist` | Json | DEFAULT [] | Array of blacklisted wallet addresses |
| `lottoUsdPrice` | Float | NULLABLE | LOTTO price in USD (snapshot time) |
| `status` | ConfigStatus | NOT NULL | PENDING, VALIDATED, FAILED, ACTIVE, LOCKED, COMPLETED, CANCELED |
| `createdById` | String (UUID) | FOREIGN KEY | User who created config |
| `createdAt` | DateTime | DEFAULT now() | Config creation timestamp |
| `updatedAt` | DateTime | AUTO UPDATE | Last modification timestamp |

**Relations:**
- Belongs to `User` (via `createdById`)

**Enums:**
```prisma
enum ConfigStatus {
  PENDING      // Initial state
  VALIDATED    // Config validated on-chain
  FAILED       // Validation failed
  ACTIVE       // Currently active
  LOCKED       // No new participants
  COMPLETED    // Round finished
  CANCELED     // Round canceled
}
```

---

### 3. Round

Core lottery round data, tracking the complete lifecycle from eligibility through distribution.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | Round identifier |
| `startDate` | DateTime | NOT NULL | Eligibility period start |
| `endDate` | DateTime | NOT NULL | Eligibility period end |
| `drawingDate` | DateTime | NULLABLE | When winner selection occurred |
| `distributionDate` | DateTime | NULLABLE | When prizes were distributed |
| `prizePoolSol` | Float | NOT NULL | Total prize pool (SOL) |
| `prizeDistributionPercent` | Float | DEFAULT 70.0 | % of pool for prizes |
| `prizeSourceWallet` | String | NULLABLE | Wallet funding prizes |
| `prizeSourceBalanceSol` | Float | NULLABLE | Available balance in source wallet |
| `totalParticipants` | Int | DEFAULT 0 | Snapshot participant count |
| `eligibleParticipants` | Int | DEFAULT 0 | After trading activity filter |
| `tierWinners` | Json | NOT NULL | Winner addresses: `{t1, t2, t3, t4}` |
| `tierPayouts` | Json | NOT NULL | Prize amounts per tier |
| `distributionTxSignatures` | Json | DEFAULT [] | Array of transaction signatures |
| `distributionAtaAddresses` | Json | DEFAULT {} | Associated token account addresses |
| `swapToLotto` | Boolean | DEFAULT false | Convert SOL → LOTTO via Jupiter |
| `swapRouteId` | String | NULLABLE | Jupiter swap route ID |
| `swapSlippage` | Float | NULLABLE | Swap slippage tolerance |
| `network` | String | DEFAULT "devnet" | devnet or mainnet-beta |
| `createdAt` | DateTime | DEFAULT now() | Round creation timestamp |

**Relations:**
- Has many `Participant`
- Has many `Snapshot`
- Has many `Drawing`
- Has many `BalanceSnapshot`

**Indexes:**
- `drawingDate`
- `network`

---

### 4. Participant

Individual lottery participants with eligibility scores and winner status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | Participant identifier |
| `roundId` | String (UUID) | FOREIGN KEY | Round identifier |
| `wallet` | String | NOT NULL | Solana wallet address (base58) |
| `tier` | Int | NULLABLE | 1-4 (top 5%, 5-20%, 20-50%, 50-100%), null for dust |
| `tokenLottoBalanceStart` | Float | NULLABLE | Balance at round START |
| `tokenLottoBalanceEnd` | Float | NULLABLE | Balance at round END |
| `tokenUsdBalance` | Float | NULLABLE | USD value at snapshot |
| `eligibilityScore` | Float | NULLABLE | Trading activity % |
| `isEligible` | Boolean | DEFAULT false | Eligible after trading activity check |
| `isWinner` | Boolean | DEFAULT false | Selected as winner |
| `createdAt` | DateTime | DEFAULT now() | Participant creation timestamp |

**Relations:**
- Belongs to `Round` (via `roundId`, CASCADE delete)

**Indexes:**
- `wallet`
- `createdAt`

**Tier Distribution Logic:**
- **Tier 1:** Top 5% of eligible holders (by token balance)
- **Tier 2:** Next 15% (5%-20%)
- **Tier 3:** Next 30% (20%-50%)
- **Tier 4:** Bottom 50% (50%-100%)
- **Dust:** Below minimum USD threshold (tier = null, not eligible)

---

### 5. Snapshot

Tracks snapshot job execution status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | Snapshot identifier |
| `roundId` | String (UUID) | FOREIGN KEY | Round identifier |
| `status` | SnapshotStatus | NOT NULL | IDLE, RUNNING, COMPLETED, CONFIRMED |
| `startedAt` | DateTime | NULLABLE | When snapshot job started |
| `completedAt` | DateTime | NULLABLE | When snapshot job finished |
| `createdAt` | DateTime | DEFAULT now() | Snapshot record creation |

**Relations:**
- Belongs to `Round` (via `roundId`, CASCADE delete)

**Enums:**
```prisma
enum SnapshotStatus {
  IDLE         // Waiting to start
  RUNNING      // Fetching token holders from blockchain
  COMPLETED    // Holder fetch finished
  CONFIRMED    // Trading activity calculated, eligibility finalized
}
```

---

### 6. Drawing

Winner selection tracking with cryptographic audit trail.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | Drawing identifier |
| `roundId` | String (UUID) | FOREIGN KEY | Round identifier |
| `status` | DrawingStatus | NOT NULL | IDLE, RUNNING, COMPLETED, CONFIRMED |
| `seed` | String | NULLABLE | 64-char hex (32 bytes from crypto.randomBytes) |
| `vrfRequestId` | String | NULLABLE | VRF request ID (if using on-chain VRF) |
| `blockhash` | String | NULLABLE | Solana blockhash at drawing time |
| `slot` | Int | NULLABLE | Solana slot number at drawing time |
| `startedAt` | DateTime | NULLABLE | When drawing started |
| `completedAt` | DateTime | NULLABLE | When drawing finished |
| `createdAt` | DateTime | DEFAULT now() | Drawing record creation |

**Relations:**
- Belongs to `Round` (via `roundId`, CASCADE delete)

**Enums:**
```prisma
enum DrawingStatus {
  IDLE         // Waiting to start
  RUNNING      // Drawing in progress
  COMPLETED    // Drawing finished
  CONFIRMED    // Results confirmed, winners marked
}
```

**Drawing Algorithm:**
```javascript
// Deterministic seeded randomness
const hash = crypto.createHash('sha256')
  .update(seed + tierIndex)
  .digest();
const randomValue = parseInt(hash.slice(0, 8), 16);
const winnerIndex = randomValue % eligibleParticipants.length;
```

---

### 7. BalanceSnapshot

Historical token balance tracking for trading activity calculation.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | String (UUID) | PRIMARY KEY | Balance snapshot identifier |
| `roundId` | String (UUID) | FOREIGN KEY | Round identifier |
| `wallet` | String | NOT NULL | Solana wallet address |
| `tokenBalance` | Float | NOT NULL | Token balance (UI amount) |
| `snapshotType` | String | NOT NULL | "START" or "END" |
| `capturedAt` | DateTime | DEFAULT now() | When balance was captured |

**Relations:**
- Belongs to `Round` (via `roundId`, CASCADE delete)

**Indexes:**
- `(roundId, wallet, snapshotType)` (composite, unique)
- `capturedAt`

**Unique Constraint:**
- `(roundId, wallet, snapshotType)` - Prevents duplicate START/END records

**Trading Activity Calculation:**
```javascript
const tradingActivity = ((balanceEnd - balanceStart) / balanceStart) * 100;
const isEligible = tradingActivity >= threshold; // e.g., 50%
```

---

## Database Roles & Permissions

### Supabase Production Roles

| Role | Username | Access Level | Usage |
|------|----------|--------------|-------|
| **Superuser** | `postgres` | Full admin | Migrations, schema changes |
| **Application** | `solotto_app` | Read-write | Backend API operations |
| **Read-only** | `solotto_ro` | Read-only | Public endpoints, analytics |

### Role Setup

```sql
-- Create read-write role
CREATE ROLE solotto_app WITH LOGIN PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE postgres TO solotto_app;
GRANT USAGE ON SCHEMA public TO solotto_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO solotto_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO solotto_app;

-- Create read-only role
CREATE ROLE solotto_ro WITH LOGIN PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE postgres TO solotto_ro;
GRANT USAGE ON SCHEMA public TO solotto_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO solotto_ro;
```

---

## Database Migrations

Located at `/apps/backend/prisma/migrations/`

| Migration | Date | Changes |
|-----------|------|---------|
| `20251007000824_init` | Oct 7, 2024 | Initial schema (User, LotteryConfig, Round, Participant, Snapshot, Drawing) |
| `20251008151652_add_is_eligible_to_participant` | Oct 8, 2024 | Added `isEligible` boolean field to Participant |
| `20251012084500_add_trading_activity_fields` | Oct 12, 2024 | Added START/END balance tracking fields |
| `20251012222131_add_network_to_rounds` | Oct 12, 2024 | Added `network` field for devnet/mainnet separation |
| `20251013000000_add_2fa_fields` | Oct 13, 2024 | Added TOTP 2FA support to User model |
| `20251023000000_add_balance_snapshot` | Oct 23, 2024 | Created BalanceSnapshot table for trading activity |
| `20251027192233_20251027_align_local_db` | Oct 27, 2024 | Added `lottoUsdPrice` field to LotteryConfig |

### Running Migrations

```bash
# Apply migrations (production)
npx prisma migrate deploy

# Create new migration (development)
npx prisma migrate dev --name your_migration_name

# Check migration status
npx prisma migrate status

# Reset database (development only, DESTRUCTIVE)
npx prisma migrate reset
```

---

## CRUD Operations & Patterns

### User Authentication

**Create User:**
```typescript
const user = await prisma.user.create({
  data: {
    email: 'operator@solotto.live',
    password: hashedPassword, // bcrypt
  },
});
```

**Find User by Email:**
```typescript
const user = await prisma.user.findUnique({
  where: { email: 'operator@solotto.live' },
});
```

**Enable 2FA:**
```typescript
await prisma.user.update({
  where: { id: userId },
  data: {
    totpSecret: secret,
    totpEnabled: true,
  },
});
```

---

### Snapshot Operations

**Create Round with START Balances:**
```typescript
const round = await prisma.round.create({
  data: {
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    prizePoolSol: 0,
    network: 'devnet',
  },
});

// Capture START balances
await prisma.balanceSnapshot.createMany({
  data: holders.map(holder => ({
    roundId: round.id,
    wallet: holder.owner,
    tokenBalance: holder.balanceUi,
    snapshotType: 'START',
  })),
  skipDuplicates: true,
});
```

**Batch Create Participants:**
```typescript
await prisma.participant.createMany({
  data: participants.map(p => ({
    roundId,
    wallet: p.wallet,
    tokenLottoBalanceStart: p.tokenLottoBalanceStart,
    tokenLottoBalanceEnd: p.tokenLottoBalanceEnd,
    tokenUsdBalance: p.tokenUsdBalance,
    tier: p.tier,
    isEligible: false,
    isWinner: false,
  })),
});
```

**Capture END Balances & Calculate Eligibility:**
```typescript
// Capture END balances
await prisma.balanceSnapshot.createMany({
  data: holders.map(holder => ({
    roundId,
    wallet: holder.owner,
    tokenBalance: holder.balanceUi,
    snapshotType: 'END',
  })),
  skipDuplicates: true,
});

// Calculate trading activity
const participants = await prisma.participant.findMany({
  where: { roundId },
});

for (const participant of participants) {
  const startBalance = await prisma.balanceSnapshot.findUnique({
    where: {
      roundId_wallet_snapshotType: {
        roundId,
        wallet: participant.wallet,
        snapshotType: 'START',
      },
    },
  });

  const endBalance = await prisma.balanceSnapshot.findUnique({
    where: {
      roundId_wallet_snapshotType: {
        roundId,
        wallet: participant.wallet,
        snapshotType: 'END',
      },
    },
  });

  const tradingActivity =
    ((endBalance.tokenBalance - startBalance.tokenBalance) / startBalance.tokenBalance) * 100;

  await prisma.participant.update({
    where: { id: participant.id },
    data: {
      eligibilityScore: tradingActivity,
      isEligible: tradingActivity >= 50,
    },
  });
}
```

---

### Drawing Operations

**Read Eligible Participants by Tier:**
```typescript
const tier1Eligible = await prisma.participant.findMany({
  where: {
    roundId,
    tier: 1,
    isEligible: true,
  },
  select: { id: true, wallet: true },
});
```

**Mark Winner:**
```typescript
await prisma.participant.update({
  where: { id: winnerId },
  data: { isWinner: true },
});
```

**Update Round with Winners:**
```typescript
await prisma.round.update({
  where: { id: roundId },
  data: {
    tierWinners: {
      t1: winner1Wallet,
      t2: winner2Wallet,
      t3: winner3Wallet,
      t4: winner4Wallet,
    },
    drawingDate: new Date(),
  },
});
```

---

### History Queries

**Get Round Statistics:**
```typescript
const stats = await prisma.round.aggregate({
  where: {
    network: 'mainnet-beta',
    drawingDate: { not: null },
  },
  _count: { _all: true },
  _sum: { prizePoolSol: true },
});
```

**Get Recent Rounds:**
```typescript
const recentRounds = await prisma.round.findMany({
  where: { network: 'mainnet-beta' },
  orderBy: { drawingDate: 'desc' },
  take: 10,
  include: {
    Participant: {
      where: { isWinner: true },
    },
  },
});
```

---

## Eligibility Logic

### Two-Stage Filtering

**STAGE 1: Snapshot (Balance Filter)**

Applied during `POST /api/v1/snapshot/run`:

```javascript
// Minimum USD balance check
const usdBalance = tokenBalance * lottoUsdPrice;
const tier = usdBalance >= minUsdLottoRequired
  ? calculateTier(usdBalance)
  : null; // Dust wallet

// Tier assignment (top-down percentile)
function calculateTier(usdBalance) {
  const sortedBalances = [...allBalances].sort((a, b) => b - a);
  const rank = sortedBalances.indexOf(usdBalance);
  const percentile = (rank / sortedBalances.length) * 100;

  if (percentile < 5) return 1;       // Top 5%
  if (percentile < 20) return 2;      // 5-20%
  if (percentile < 50) return 3;      // 20-50%
  return 4;                           // 50-100%
}
```

**STAGE 2: Confirmation (Trading Activity Filter)**

Applied during `POST /api/v1/snapshot/confirm`:

```javascript
// Trading activity calculation
const tradingActivity = ((balanceEnd - balanceStart) / balanceStart) * 100;

// Eligibility determination
const isEligible = (tier !== null) && (tradingActivity >= threshold);

await prisma.participant.update({
  where: { id },
  data: {
    eligibilityScore: tradingActivity,
    isEligible,
  },
});
```

### Eligibility Requirements (AND Logic)

A participant is eligible if **ALL** of the following are true:

1. USD balance >= $50 (default minimum)
2. Trading activity >= 50% (balance change during round)
3. Not in blacklist (hard blacklist + per-round blacklist)

---

## Indexing Strategy

### Existing Indexes

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| User | `email` | Unique | Fast user lookup, prevent duplicates |
| Participant | `wallet` | B-tree | Fast wallet-based queries |
| Participant | `createdAt` | B-tree | Time-series queries |
| Round | `drawingDate` | B-tree | Drawing timeline queries |
| Round | `network` | B-tree | Network filtering (devnet/mainnet) |
| BalanceSnapshot | `(roundId, wallet, snapshotType)` | Composite Unique | Fast START/END lookups, prevent duplicates |
| BalanceSnapshot | `capturedAt` | B-tree | Time-series analysis |

### Performance Optimization

For high-volume operations (1000+ participants):

```typescript
// Batch inserts (100-record chunks)
const BATCH_SIZE = 100;
for (let i = 0; i < participants.length; i += BATCH_SIZE) {
  const batch = participants.slice(i, i + BATCH_SIZE);
  await prisma.participant.createMany({
    data: batch,
  });
}
```

---

## Data Flow & Lifecycle

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CREATE ROUND                                             │
│    └─ Create Round record                                   │
│    └─ Capture START balances (BalanceSnapshot.START)        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. RUN SNAPSHOT                                             │
│    └─ Fetch token holders from blockchain                   │
│    └─ Assign tiers (1-4 or null for dust)                   │
│    └─ Apply blacklist filter                                │
│    └─ Store Participants with tier assignments              │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. CONFIRM SNAPSHOT                                         │
│    └─ Capture END balances (BalanceSnapshot.END)            │
│    └─ Calculate trading activity % (balance change)         │
│    └─ Update Participant.isEligible = true if >= threshold  │
│    └─ Update Round.eligibleParticipants count               │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. RUN DRAWING                                              │
│    └─ Generate cryptographic seed (crypto.randomBytes(32))  │
│    └─ Select 1 winner per tier from eligible participants   │
│    └─ Store seed and blockchain state in Drawing            │
│    └─ Mark winners (Participant.isWinner = true)            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. DISTRIBUTE PRIZES                                        │
│    └─ Calculate prize amounts per tier                      │
│    └─ Create transactions to winner wallets                 │
│    └─ Store tx signatures in Round.distributionTxSignatures │
└─────────────────────────────────────────────────────────────┘
```

---

## Production Deployment

### Supabase Pro Configuration

**Plan:** Supabase Pro
**Cost:** $25/month
**Included:**
- 8GB database storage
- Daily automated backups (7-day retention)
- Connection pooling (PgBouncer)
- SSL/TLS encryption
- Built-in monitoring dashboard

**Connection Endpoints:**

| Port | Purpose | Protocol |
|------|---------|----------|
| 5432 | Direct connection | PostgreSQL (admin/migrations) |
| 6543 | Pooled connection | PgBouncer (application) |

**Environment Variables (Production):**

```env
DATABASE_URL="postgresql://solotto_app:PROD_PASSWORD@db.PROD_REF.supabase.co:6543/postgres?pgbouncer=true&sslmode=require"
DATABASE_URL_RO="postgresql://solotto_ro:PROD_PASSWORD@db.PROD_REF.supabase.co:6543/postgres?pgbouncer=true&sslmode=require"
```

### Backup Strategy

- **Automated Backups:** Daily at 00:00 UTC
- **Retention:** 7 days
- **Manual Backups:** Via Supabase dashboard
- **Point-in-Time Recovery:** Available on Pro plan

---

## Security Best Practices

### Connection Security
- Always use SSL/TLS (`sslmode=require`)
- Use connection pooling (PgBouncer) for application connections
- Separate read-only role for public endpoints
- Rotate database passwords regularly

### Data Protection
- Password hashing: bcrypt with 10 salt rounds
- TOTP secrets: Base32-encoded, encrypted at rest
- Blacklist enforcement: Hard-coded + configurable lists
- Network isolation: Separate devnet/mainnet data via `network` column

### Audit Trail
- Drawing seed: Stored in `Drawing.seed`
- Blockchain state: `Drawing.blockhash`, `Drawing.slot`
- Transaction signatures: `Round.distributionTxSignatures`
- Balance history: `BalanceSnapshot` (START/END pairs)

---

## Troubleshooting

### Connection Issues

**Problem:** `Can't reach database server`

**Solution:**
```bash
# Check DATABASE_URL format
echo $DATABASE_URL

# Verify network access
ping db.YOUR_REF.supabase.co

# Test connection with psql
psql $DATABASE_URL
```

### Migration Failures

**Problem:** `Migration failed to apply`

**Solution:**
```bash
# Check migration status
npx prisma migrate status

# View migration history
npx prisma migrate resolve --applied 20251027192233_20251027_align_local_db

# Force reset (dev only, DESTRUCTIVE)
npx prisma migrate reset
```

### Performance Issues

**Problem:** Slow queries on large participant sets

**Solution:**
```typescript
// Use batching for large inserts
const BATCH_SIZE = 100;
for (let i = 0; i < data.length; i += BATCH_SIZE) {
  await prisma.participant.createMany({
    data: data.slice(i, i + BATCH_SIZE),
  });
}

// Use indexes for frequent queries
await prisma.participant.findMany({
  where: { wallet: 'ABC123' }, // Uses wallet index
});
```

---

## Development Commands

```bash
# Prisma Client
npx prisma generate              # Generate TypeScript client

# Migrations
npx prisma migrate dev           # Create and apply migration (dev)
npx prisma migrate deploy        # Apply migrations (production)
npx prisma migrate status        # Check migration status
npx prisma migrate reset         # Reset database (dev only)

# Database GUI
npx prisma studio                # Open browser-based GUI

# Database Introspection
npx prisma db pull               # Pull schema from database
npx prisma db push               # Push schema to database (dev only)

# Validation
npx prisma validate              # Validate schema.prisma syntax

# Seed (if configured)
npx prisma db seed               # Run seed script
```

---

## Related Documentation

- [Backend README](./README.md) - API documentation
- [Prisma Schema](./prisma/schema.prisma) - Full schema definition
- [Migration Files](./prisma/migrations/) - Migration history
- [Supabase Migration Guide](../../docs/ref_docs/SUPABASE_MIGRATION_COMPLETE.md) - Production setup

---

## Support

- **Database Issues:** Check [Supabase Dashboard](https://app.supabase.com)
- **Schema Questions:** Review [Prisma Docs](https://www.prisma.io/docs)
- **Performance:** Enable query logging with `log: ['query']` in Prisma Client

---

**Database Powered by PostgreSQL 16 + Prisma ORM**
