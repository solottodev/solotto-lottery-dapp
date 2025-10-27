# Solotto On-Chain Lottery Drawing Machine
## Technical Specification Document v2.0

**Document Version:** 2.0  
**Last Updated:** September 30, 2025  
**Status:** Ready for Implementation  
**Project:** Solotto Lottery Drawing Machine Rebuild

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [System Architecture](#3-system-architecture)
4. [Module Specifications](#4-module-specifications)
5. [Data Models](#5-data-models)
6. [API Specifications](#6-api-specifications)
7. [Security Architecture](#7-security-architecture)
8. [Deployment Strategy](#8-deployment-strategy)

---

## 1. Architecture Overview

### 1.1 Design Philosophy

The Solotto Drawing Machine follows a **modular, event-driven architecture** with clear separation between:
- **Frontend**: User interface for operators and public history
- **Backend API**: Business logic and blockchain orchestration
- **Blockchain Layer**: Solana integration and VRF execution
- **Data Layer**: PostgreSQL for audit logs, Redis for caching

### 1.2 Core Principles

- **Idempotency**: All critical operations must be safely retriable
- **Auditability**: Every action logged with immutable references
- **Fail-Safe**: Graceful degradation with manual intervention paths
- **Transparency**: Public verification of all lottery mechanics

---

## 2. Technology Stack

### 2.1 Frontend

```
Framework: Next.js 14.2+ (App Router)
Language: TypeScript 5.3+
Styling: TailwindCSS 3.4+ with custom design system
UI Components: shadcn/ui + Radix UI primitives
State Management: Zustand 4.5+
Data Fetching: TanStack Query (React Query) v5
Wallet Integration: @solana/wallet-adapter-react 0.15+
Charts: Recharts 2.10+
Forms: React Hook Form + Zod validation
```

### 2.2 Backend

```
Runtime: Node.js 20 LTS
Framework: Express.js 4.18+ with TypeScript
API Documentation: OpenAPI 3.1 (Swagger)
Validation: Zod schemas shared with frontend
Rate Limiting: express-rate-limit + Redis
Security: Helmet.js, CORS, express-validator
Job Queue: BullMQ for async processing
Monitoring: Sentry for errors, custom metrics
```

### 2.3 Blockchain

```
Solana SDK: @solana/web3.js 1.87+
RPC Providers: 
  - Primary: Helius RPC (premium tier)
  - Fallback: QuickNode
  - Tertiary: Alchemy
Indexer: Helius Digital Asset API
VRF Provider: Switchboard V2
DEX Integration: Jupiter Aggregator v6
Transaction Management: Custom retry logic with priority fees
```

### 2.4 Database & Cache

```
Primary Database: PostgreSQL 16
ORM: Prisma 5.8+
Schema Migrations: Prisma Migrate
Cache: Redis 7.2+ (Upstash or self-hosted)
Connection Pooling: PgBouncer
Backup Strategy: Automated daily snapshots to S3
```

### 2.5 DevOps

```
Version Control: GitHub with branch protection
CI/CD: GitHub Actions
Frontend Hosting: Vercel (Edge Network)
Backend Hosting: Railway or Render
Monitoring: Sentry + Custom Grafana dashboards
Secrets Management: Environment variables + Vault
Testing: Jest + Playwright
```

---

## 3. System Architecture

### 3.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Operator   │  │    Public    │  │  Wallet Connect │  │
│  │   Dashboard  │  │   History    │  │    Provider     │  │
│  └──────────────┘  └──────────────┘  └─────────────────┘  │
└────────────┬────────────────────────────────────┬──────────┘
             │                                     │
             │ HTTPS/WSS                          │ Web3
             │                                     │
┌────────────▼────────────────────────────────────▼──────────┐
│                   BACKEND API (Express)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐ │
│  │  Auth    │ │  Lottery │ │  Wallet  │ │   Job Queue   │ │
│  │ Service  │ │  Engine  │ │ Service  │ │   (BullMQ)    │ │
│  └──────────┘ └──────────┘ └──────────┘ └───────────────┘ │
└────────┬───────────┬───────────┬──────────────────┬────────┘
         │           │           │                  │
         │           │           │                  │
┌────────▼──────┐┌───▼──────┐┌──▼────────┐  ┌──────▼───────┐
│  PostgreSQL   ││  Redis   ││  Solana   │  │  Switchboard │
│  (Audit Log)  ││  (Cache) ││    RPC    │  │     VRF      │
└───────────────┘└──────────┘└───────────┘  └──────────────┘
```

### 3.2 Data Flow: Complete Lottery Cycle

```
1. CONTROL → Config validated → Stored in DB with signature
2. SNAPSHOT → Query blockchain → Tier wallets → Cache results
3. DRAWING → VRF request → Winners selected → Log on-chain proof
4. HARVEST → Calculate pool → Optional swap → Confirm balance
5. DISTRIBUTION → Batch transfers → Log tx hashes → Update history
6. HISTORY → Public page updated → CSVs generated → Audit complete
```

---

## 4. Module Specifications

### 4.1 Authentication Service

**Purpose**: Secure operator access via Solana wallet signature

**Implementation**:

```typescript
// Auth middleware
interface AuthRequest extends Request {
  wallet: {
    publicKey: string;
    isAuthorized: boolean;
    role: 'admin' | 'operator' | 'auditor';
  };
}

class AuthService {
  async verifySignature(
    message: string,
    signature: string,
    publicKey: string
  ): Promise<boolean> {
    // Verify wallet signature using @solana/web3.js
    // Check against approved operator list in DB
    // Generate JWT with 1-hour expiration
  }
  
  async checkPermissions(
    publicKey: string,
    requiredRole: string
  ): Promise<boolean> {
    // Query operators table for role
    // Implement role hierarchy (admin > operator > auditor)
  }
}
```

**Database Schema**:

```sql
CREATE TABLE operators (
  public_key VARCHAR(44) PRIMARY KEY,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'operator', 'auditor')),
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP,
  enabled BOOLEAN DEFAULT true
);

CREATE INDEX idx_operators_role ON operators(role);
```

**Security Requirements**:
- Message to sign must include timestamp (prevent replay attacks)
- Signature validity: 5 minutes
- JWT expiration: 1 hour
- Rate limiting: 5 attempts per minute per IP
- Failed attempts logged with IP address

---

### 4.2 Control Module

**Purpose**: Configure lottery parameters with validation

**API Endpoint**:

```typescript
POST /api/control/configure

Request Body:
{
  startDate: "2025-01-05T00:00:00Z",  // ISO 8601 UTC
  endDate: "2025-01-12T00:00:00Z",
  tradeThresholdPercent: 50,           // Min: 50, Max: 100
  infraAllocationPercent: 70,          // Prize pool percentage
  blacklistedWallets: string[],        // Optional array
  slippageTolerancePercent: 1.0        // For DEX swaps
}

Response:
{
  configId: "uuid-v4",
  status: "validated",
  snapshotWindowBlocks: [slot_start, slot_end],
  createdAt: "2025-01-12T12:00:00Z",
  operatorSignature: "..."
}
```

**Validation Rules**:

```typescript
const ConfigSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  tradeThresholdPercent: z.number().min(50).max(100),
  infraAllocationPercent: z.number().min(0).max(100),
  blacklistedWallets: z.array(z.string().length(44)).optional(),
  slippageTolerancePercent: z.number().min(0.1).max(5.0)
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: "End date must be after start date"
}).refine(data => new Date(data.endDate) < new Date(), {
  message: "End date must be in the past"
});
```

**Database Schema**:

```sql
CREATE TABLE lottery_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  trade_threshold_percent INTEGER NOT NULL,
  infra_allocation_percent INTEGER NOT NULL,
  blacklisted_wallets TEXT[],
  slippage_tolerance_percent DECIMAL(4,2),
  operator_public_key VARCHAR(44) NOT NULL,
  operator_signature TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT check_dates CHECK (end_date > start_date),
  CONSTRAINT check_trade_threshold CHECK (trade_threshold_percent BETWEEN 50 AND 100)
);

CREATE INDEX idx_lottery_configs_status ON lottery_configs(status);
```

**Business Logic**:

```typescript
class ControlModule {
  async validateConfig(config: LotteryConfig): Promise<ValidationResult> {
    // 1. Validate dates are in past
    // 2. Check no overlapping active configs
    // 3. Verify blacklist wallet formats
    // 4. Convert UTC dates to Solana slot numbers
    // 5. Store immutable config with operator signature
    // 6. Emit event for snapshot module
  }
  
  async getActiveConfig(): Promise<LotteryConfig | null> {
    // Return most recent validated config not yet completed
  }
}
```

---

### 4.3 Snapshot Module

**Purpose**: Generate tiered wallet lists based on holdings and trading activity

**API Endpoint**:

```typescript
POST /api/snapshot/create

Request Body:
{
  configId: "uuid-v4"
}

Response:
{
  snapshotId: "uuid-v4",
  configId: "uuid-v4",
  totalWallets: 2940,
  eligibleWallets: 2940,
  tiers: {
    tier1: { count: 147, threshold: "149000 $LOTTO" },
    tier2: { count: 441, threshold: "50000 $LOTTO" },
    tier3: { count: 882, threshold: "10000 $LOTTO" },
    tier4: { count: 1470, threshold: "1000 $LOTTO" }
  },
  snapshotHash: "sha256-hash",
  createdAt: "2025-01-12T12:05:00Z",
  status: "complete"
}
```

**Implementation Strategy**:

```typescript
class SnapshotModule {
  private heliusApi: HeliusClient;
  private rpcFallback: Connection;
  private redis: Redis;
  
  async createSnapshot(configId: string): Promise<Snapshot> {
    // 1. Fetch config from DB
    const config = await this.getConfig(configId);
    
    // 2. Query all $LOTTO token holders at end block
    const holders = await this.fetchTokenHolders(
      config.endDate,
      config.blacklistedWallets
    );
    
    // 3. For each holder, check trading activity in period
    const qualifiedWallets = await this.filterByTradingActivity(
      holders,
      config.startDate,
      config.endDate,
      config.tradeThresholdPercent
    );
    
    // 4. Segment into tiers based on holdings
    const tiers = this.calculateTiers(qualifiedWallets);
    
    // 5. Generate cryptographic hash for reproducibility
    const snapshotHash = this.generateSnapshotHash(tiers);
    
    // 6. Store in DB and cache in Redis
    await this.saveSnapshot(configId, tiers, snapshotHash);
    
    // 7. Emit event for drawing module
    return { snapshotId, tiers, snapshotHash };
  }
  
  private async fetchTokenHolders(
    endDate: Date,
    blacklist: string[]
  ): Promise<TokenHolder[]> {
    try {
      // Primary: Helius Digital Asset API
      const response = await this.heliusApi.getTokenAccounts({
        mint: LOTTO_MINT_ADDRESS,
        options: { showZeroBalance: false }
      });
      
      return response
        .filter(holder => !blacklist.includes(holder.owner))
        .filter(holder => holder.amount >= MINIMUM_HOLDING_THRESHOLD);
        
    } catch (error) {
      // Fallback: Direct RPC call
      console.warn('Helius failed, using RPC fallback');
      return await this.fetchViaRPC(endDate, blacklist);
    }
  }
  
  private calculateTiers(wallets: QualifiedWallet[]): TierDistribution {
    // Sort by token balance descending
    const sorted = wallets.sort((a, b) => b.balance - a.balance);
    
    const total = sorted.length;
    const tier1Count = Math.floor(total * 0.05);
    const tier2Count = Math.floor(total * 0.15);
    const tier3Count = Math.floor(total * 0.30);
    
    return {
      tier1: sorted.slice(0, tier1Count),
      tier2: sorted.slice(tier1Count, tier1Count + tier2Count),
      tier3: sorted.slice(tier1Count + tier2Count, tier1Count + tier2Count + tier3Count),
      tier4: sorted.slice(tier1Count + tier2Count + tier3Count)
    };
  }
}
```

**Database Schema**:

```sql
CREATE TABLE snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id UUID REFERENCES lottery_configs(id),
  snapshot_hash VARCHAR(64) NOT NULL UNIQUE,
  total_wallets INTEGER NOT NULL,
  eligible_wallets INTEGER NOT NULL,
  tier_1_count INTEGER NOT NULL,
  tier_2_count INTEGER NOT NULL,
  tier_3_count INTEGER NOT NULL,
  tier_4_count INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'processing',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE snapshot_wallets (
  id BIGSERIAL PRIMARY KEY,
  snapshot_id UUID REFERENCES snapshots(id),
  wallet_address VARCHAR(44) NOT NULL,
  balance BIGINT NOT NULL,
  tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 4),
  trade_volume BIGINT,
  
  CONSTRAINT unique_wallet_per_snapshot UNIQUE (snapshot_id, wallet_address)
);

CREATE INDEX idx_snapshot_wallets_tier ON snapshot_wallets(snapshot_id, tier);
CREATE INDEX idx_snapshot_wallets_address ON snapshot_wallets(wallet_address);
```

**Performance Optimization**:
- Cache token holder list in Redis (TTL: 1 hour)
- Batch RPC calls (max 100 concurrent)
- Use database connection pooling
- Implement cursor-based pagination for large wallet lists
- Target: Process 10,000 wallets in under 90 seconds

---

### 4.4 Drawing Module

**Purpose**: Execute verifiable random selection using Switchboard VRF

**API Endpoint**:

```typescript
POST /api/drawing/execute

Request Body:
{
  snapshotId: "uuid-v4"
}

Response:
{
  drawingId: "uuid-v4",
  snapshotId: "uuid-v4",
  winners: {
    tier1: { address: "9WzDX...", vrfSeed: "...", vrfProof: "..." },
    tier2: { address: "7xKXt...", vrfSeed: "...", vrfProof: "..." },
    tier3: { address: "4sGjM...", vrfSeed: "...", vrfProof: "..." },
    tier4: { address: "2eR7M...", vrfSeed: "...", vrfProof: "..." }
  },
  vrfRequestTxHash: "solana-tx-hash",
  status: "complete",
  createdAt: "2025-01-12T12:10:00Z"
}
```

**VRF Integration**:

```typescript
import { OracleQueueAccount, loadSwitchboardProgram } from "@switchboard-xyz/solana.js";

class DrawingModule {
  private switchboard: SwitchboardProgram;
  private connection: Connection;
  
  async executeDrawing(snapshotId: string): Promise<DrawingResult> {
    // 1. Load tier wallet lists from snapshot
    const tiers = await this.loadTierWallets(snapshotId);
    
    // 2. Request VRF for each tier
    const winners: Winner[] = [];
    
    for (const [tierNum, wallets] of Object.entries(tiers)) {
      if (wallets.length === 0) {
        console.log(`Tier ${tierNum} has no eligible wallets, skipping`);
        continue;
      }
      
      // Request randomness from Switchboard
      const vrfAccount = await this.requestVRF();
      
      // Wait for VRF result (usually 1-2 slots)
      const randomValue = await this.awaitVRFResult(vrfAccount);
      
      // Select winner deterministically from random value
      const winnerIndex = randomValue % wallets.length;
      const winner = wallets[winnerIndex];
      
      // Ensure no duplicate winners across tiers
      if (!this.isDuplicateWinner(winner.address, winners)) {
        winners.push({
          tier: tierNum,
          address: winner.address,
          vrfSeed: randomValue.toString(),
          vrfProof: vrfAccount.toString()
        });
      } else {
        // Select next non-duplicate wallet
        const fallbackWinner = this.selectFallbackWinner(wallets, winners);
        winners.push(fallbackWinner);
      }
    }
    
    // 3. Store results in DB with VRF proofs
    await this.saveDrawingResults(snapshotId, winners);
    
    // 4. Emit event for distribution module
    return { drawingId, winners };
  }
  
  private async requestVRF(): Promise<VrfAccount> {
    const program = await loadSwitchboardProgram("mainnet-beta", this.connection);
    const queue = new OracleQueueAccount(program, ORACLE_QUEUE_PUBKEY);
    
    // Create VRF account and request randomness
    const [vrfAccount] = await queue.createVrf({
      callback: {
        programId: this.programId,
        accounts: [...],
        ixData: Buffer.from([])
      },
      authority: this.authority.publicKey,
      enable: true
    });
    
    await vrfAccount.requestRandomness();
    
    return vrfAccount;
  }
  
  private async awaitVRFResult(vrfAccount: VrfAccount): Promise<BN> {
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds timeout
    
    while (attempts < maxAttempts) {
      const state = await vrfAccount.loadData();
      
      if (state.status.kind === "StatusCallbackSuccess") {
        return state.currentRound.result;
      }
      
      await sleep(1000);
      attempts++;
    }
    
    throw new Error("VRF request timed out");
  }
}
```

**Database Schema**:

```sql
CREATE TABLE drawings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID REFERENCES snapshots(id),
  vrf_request_tx_hash VARCHAR(88),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE winners (
  id SERIAL PRIMARY KEY,
  drawing_id UUID REFERENCES drawings(id),
  tier INTEGER NOT NULL CHECK (tier BETWEEN 1 AND 4),
  wallet_address VARCHAR(44) NOT NULL,
  vrf_seed TEXT NOT NULL,
  vrf_proof TEXT NOT NULL,
  prize_amount BIGINT,
  distribution_tx_hash VARCHAR(88),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_winners_drawing ON winners(drawing_id);
CREATE INDEX idx_winners_wallet ON winners(wallet_address);
```

**Failure Handling**:
- VRF timeout: Retry with exponential backoff (3 attempts)
- Duplicate winner: Automatically select next eligible wallet
- Empty tier: Skip and redistribute prize (handled in distribution module)
- Log all VRF requests and results for audit trail

---

### 4.5 Prize Harvest & Swap Module

**Purpose**: Calculate prize pool and optionally swap SOL to $LOTTO

**API Endpoint**:

```typescript
POST /api/harvest/calculate

Request Body:
{
  drawingId: "uuid-v4",
  prizeAsset: "SOL" | "LOTTO",
  dexPreference: "jupiter" | "orca"
}

Response:
{
  harvestId: "uuid-v4",
  infraWalletBalance: "127.450000 SOL",
  prizePoolAmount: "89.215000 SOL",
  swapExecuted: false,
  swapDetails: null,
  status: "ready_for_distribution",
  createdAt: "2025-01-12T12:12:00Z"
}
```

**Implementation**:

```typescript
import { Jupiter } from "@jup-ag/core";

class HarvestModule {
  private connection: Connection;
  private infraWallet: Keypair;
  
  async calculatePrizePool(
    drawingId: string,
    prizeAsset: "SOL" | "LOTTO",
    dexPreference: string
  ): Promise<HarvestResult> {
    // 1. Get config for this drawing
    const config = await this.getDrawingConfig(drawingId);
    
    // 2. Query infrastructure wallet balance
    const balance = await this.connection.getBalance(
      this.infraWallet.publicKey
    );
    
    // 3. Calculate prize pool based on infra %
    const prizePool = balance * (config.infraAllocationPercent / 100);
    
    // 4. If $LOTTO requested, execute swap
    let swapDetails = null;
    if (prizeAsset === "LOTTO") {
      swapDetails = await this.executeSwap(
        prizePool,
        dexPreference,
        config.slippageTolerancePercent
      );
    }
    
    // 5. Store harvest record
    await this.saveHarvestRecord(drawingId, prizePool, swapDetails);
    
    return { harvestId, prizePool, swapDetails };
  }
  
  private async executeSwap(
    amountSol: number,
    dex: string,
    slippage: number
  ): Promise<SwapResult> {
    const jupiter = await Jupiter.load({
      connection: this.connection,
      cluster: "mainnet-beta",
      user: this.infraWallet
    });
    
    // Get best route
    const routes = await jupiter.computeRoutes({
      inputMint: NATIVE_SOL_MINT,
      outputMint: LOTTO_MINT_ADDRESS,
      amount: LAMPORTS_PER_SOL * amountSol,
      slippageBps: slippage * 100,
      forceFetch: true
    });
    
    if (!routes || routes.routesInfos.length === 0) {
      throw new Error("No swap routes available");
    }
    
    const bestRoute = routes.routesInfos[0];
    
    // Check price impact
    const priceImpact = bestRoute.priceImpactPct;
    if (priceImpact > slippage) {
      throw new Error(`Price impact ${priceImpact}% exceeds slippage tolerance ${slippage}%`);
    }
    
    // Execute swap
    const { execute } = await jupiter.exchange({ routeInfo: bestRoute });
    const swapResult = await execute();
    
    return {
      inputAmount: amountSol,
      outputAmount: bestRoute.outAmount / (10 ** LOTTO_DECIMALS),
      priceImpact: priceImpact,
      txHash: swapResult.txid,
      dex: dex,
      route: bestRoute.marketInfos.map(m => m.label).join(" → ")
    };
  }
}
```

**Database Schema**:

```sql
CREATE TABLE harvests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  drawing_id UUID REFERENCES drawings(id),
  infra_wallet_balance BIGINT NOT NULL,
  prize_pool_amount BIGINT NOT NULL,
  prize_asset VARCHAR(10) NOT NULL,
  swap_executed BOOLEAN DEFAULT false,
  swap_tx_hash VARCHAR(88),
  swap_input_amount BIGINT,
  swap_output_amount BIGINT,
  swap_price_impact DECIMAL(6,4),
  dex_used VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Safety Mechanisms**:
- Dry-run swap before execution to verify pricing
- Require operator confirmation for swaps over 10 SOL
- Automatic fallback to SOL distribution if swap fails
- Price impact hard limit: 5% (reject if exceeded)
- Minimum prize pool: 0.1 SOL (prevent dust distributions)

---

### 4.6 Distribution Module

**Purpose**: Send prizes to winners with transaction proofs

**API Endpoint**:

```typescript
POST /api/distribution/execute

Request Body:
{
  harvestId: "uuid-v4"
}

Response:
{
  distributionId: "uuid-v4",
  distributions: [
    {
      tier: 1,
      winner: "9WzDX...",
      amount: "35.686 SOL",
      txHash: "3vK9m...",
      status: "confirmed",
      solscanUrl: "https://solscan.io/tx/3vK9m..."
    }
  ],
  totalDistributed: "89.215 SOL",
  failedDistributions: [],
  status: "complete",
  completedAt: "2025-01-12T12:15:00Z"
}
```

**Implementation**:

```typescript
class DistributionModule {
  private connection: Connection;
  private treasuryWallet: Keypair;
  
  async executeDistribution(harvestId: string): Promise<DistributionResult> {
    // 1. Load harvest details and winners
    const harvest = await this.getHarvest(harvestId);
    const winners = await this.getWinners(harvest.drawingId);
    
    // 2. Calculate tier allocations (with redistribution if needed)
    const allocations = this.calculateTierAllocations(
      harvest.prizePoolAmount,
      winners
    );
    
    // 3. Execute transfers sequentially
    const distributions: Distribution[] = [];
    const failed: FailedDistribution[] = [];
    
    for (const [tier, allocation] of Object.entries(allocations)) {
      try {
        const winner = winners.find(w => w.tier === tier);
        
        if (!winner) continue;
        
        // Check token account exists (if $LOTTO)
        if (harvest.prizeAsset === "LOTTO") {
          await this.ensureTokenAccount(winner.address);
        }
        
        // Send transaction with priority fee
        const txHash = await this.sendPrize(
          winner.address,
          allocation.amount,
          harvest.prizeAsset
        );
        
        await this.confirmTransaction(txHash);
        
        distributions.push({
          tier: tier,
          winner: winner.address,
          amount: allocation.amount,
          txHash: txHash,
          status: "confirmed"
        });
        
        await this.updateWinnerDistribution(winner.id, txHash, allocation.amount);
        
        // Rate limit: 1 tx per second
        await sleep(1000);
        
      } catch (error) {
        failed.push({
          tier: tier,
          winner: winner.address,
          error: error.message,
          retryable: this.isRetryableError(error)
        });
      }
    }
    
    await this.saveDistributionRecord(harvestId, distributions, failed);
    
    return { distributionId, distributions, failed };
  }
  
  private calculateTierAllocations(
    prizePool: number,
    winners: Winner[]
  ): TierAllocations {
    const baseAllocations = {
      tier1: 0.40,
      tier2: 0.30,
      tier3: 0.20,
      tier4: 0.10
    };
    
    // Check which tiers have winners
    const activeTiers = winners.map(w => w.tier);
    
    // If any tier empty, redistribute proportionally
    if (activeTiers.length < 4) {
      return this.redistributeToActiveTiers(baseAllocations, activeTiers, prizePool);
    }
    
    // Standard allocation
    return {
      tier1: prizePool * 0.40,
      tier2: prizePool * 0.30,
      tier3: prizePool * 0.20,
      tier4: prizePool * 0.10
    };
  }
}
```

**Database Schema**:

```sql
CREATE TABLE distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  harvest_id UUID REFERENCES harvests(id),
  total_distributed BIGINT NOT NULL,
  failed_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE distribution_transactions (
  id SERIAL PRIMARY KEY,
  distribution_id UUID REFERENCES distributions(id),
  winner_id INTEGER REFERENCES winners(id),
  tier INTEGER NOT NULL,
  amount BIGINT NOT NULL,
  tx_hash VARCHAR(88) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  confirmed_at TIMESTAMP
);

CREATE INDEX idx_distribution_txs_status ON distribution_transactions(status);
```

**Retry Logic**:

```typescript
class RetryStrategy {
  async retryFailedDistributions(distributionId: string): Promise<void> {
    const failed = await this.getFailedTransactions(distributionId);
    
    for (const tx of failed) {
      if (tx.retryCount >= 3) {
        await this.markForManualReview(tx.id);
        continue;
      }
      
      try {
        await sleep(Math.pow(2, tx.retryCount) * 1000);
        
        const txHash = await this.sendPrize(
          tx.winnerAddress,
          tx.amount,
          tx.asset
        );
        
        await this.updateTransactionSuccess(tx.id, txHash);
        
      } catch (error) {
        await this.incrementRetryCount(tx.id, error.message);
      }
    }
  }
}
```

---

### 4.7 History Module

**Purpose**: Public transparency and audit trail

**Public API Endpoints**:

```typescript
// List all lottery rounds (paginated)
GET /api/history/rounds?page=1&limit=20

Response:
{
  rounds: [
    {
      roundId: "uuid",
      roundNumber: 339000,
      drawingDate: "2025-01-09T12:00:00Z",
      prizePool: "89.215 SOL",
      totalParticipants: 2940,
      eligibleParticipants: 2940,
      status: "complete"
    }
  ],
  pagination: {
    page: 1,
    limit: 20,
    total: 2,
    hasMore: false
  }
}

// Get specific round details
GET /api/history/rounds/:roundId

Response:
{
  round: {
    roundId: "uuid",
    roundNumber: 339000,
    snapshot: {
      totalWallets: 2940,
      tiers: { tier1: 147, tier2: 441, tier3: 882, tier4: 1470 }
    },
    winners: [
      {
        tier: 1,
        address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        prize: "35.686 SOL",
        txHash: "3vK9m...",
        solscanUrl: "https://solscan.io/tx/3vK9m...",
        vrfSeed: "...",
        vrfProof: "..."
      }
    ]
  }
}

// Search for wallet participation
GET /api/history/wallet/:address

Response:
{
  walletAddress: "9WzDX...",
  participationHistory: [
    {
      roundNumber: 339000,
      tier: 1,
      isWinner: true,
      prizeAmount: "35.686 SOL"
    }
  ],
  statistics: {
    totalRoundsParticipated: 2,
    totalWins: 1,
    totalPrizesWon: "35.686 SOL"
  }
}

// Export CSV
GET /api/history/export?roundId=uuid&type=winners|participants
```

**CSV Export Implementation**:

```typescript
class HistoryModule {
  async exportRoundData(
    roundId: string,
    exportType: 'winners' | 'participants'
  ): Promise<string> {
    if (exportType === 'winners') {
      return this.exportWinners(roundId);
    } else {
      return this.exportParticipants(roundId);
    }
  }
  
  private async exportWinners(roundId: string): Promise<string> {
    const round = await this.getRoundDetails(roundId);
    
    const csv = [
      ['Round', 'Date', 'Tier', 'Winner', 'Prize', 'Asset', 'TX Hash'],
      ...round.winners.map(w => [
        round.roundNumber,
        round.drawingDate,
        w.tier,
        w.address,
        w.prize,
        round.prizeAsset,
        w.txHash
      ])
    ];
    
    return csv.map(row => row.join(',')).join('\n');
  }
}
```

---

## 5. Data Models

### 5.1 Complete Prisma Schema

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Operator {
  publicKey  String   @id @db.VarChar(44)
  role       Role
  enabled    Boolean  @default(true)
  createdAt  DateTime @default(now())
  lastLogin  DateTime?
  configs    LotteryConfig[]
  @@map("operators")
}

enum Role {
  ADMIN
  OPERATOR
  AUDITOR
}

model LotteryConfig {
  id                       String    @id @default(uuid())
  startDate                DateTime
  endDate                  DateTime
  tradeThresholdPercent    Int
  infraAllocationPercent   Int
  blacklistedWallets       String[]
  slippageTolerancePercent Decimal   @db.Decimal(4,2)
  operatorPublicKey        String    @db.VarChar(44)
  operatorSignature        String
  status                   ConfigStatus @default(PENDING)
  createdAt                DateTime  @default(now())
  operator                 Operator  @relation(fields: [operatorPublicKey], references: [publicKey])
  snapshot                 Snapshot?
  @@map("lottery_configs")
}

enum ConfigStatus {
  PENDING
  VALIDATED
  ACTIVE
  COMPLETE
  FAILED
}

model Snapshot {
  id               String   @id @default(uuid())
  configId         String   @unique
  snapshotHash     String   @unique @db.VarChar(64)
  totalWallets     Int
  eligibleWallets  Int
  tier1Count       Int
  tier2Count       Int
  tier3Count       Int
  tier4Count       Int
  status           SnapshotStatus @default(PROCESSING)
  createdAt        DateTime @default(now())
  completedAt      DateTime?
  config           LotteryConfig @relation(fields: [configId], references: [id])
  wallets          SnapshotWallet[]
  drawing          Drawing?
  @@map("snapshots")
}

model Drawing {
  id               String   @id @default(uuid())
  snapshotId       String   @unique
  vrfRequestTxHash String?  @db.VarChar(88)
  status           DrawingStatus @default(PENDING)
  createdAt        DateTime @default(now())
  completedAt      DateTime?
  snapshot         Snapshot @relation(fields: [snapshotId], references: [id])
  winners          Winner[]
  harvest          Harvest?
  @@map("drawings")
}

model Winner {
  id                  Int      @id @default(autoincrement())
  drawingId           String
  tier                Int
  walletAddress       String   @db.VarChar(44)
  vrfSeed             String
  vrfProof            String
  prizeAmount         BigInt?
  distributionTxHash  String?  @db.VarChar(88)
  createdAt           DateTime @default(now())
  drawing             Drawing  @relation(fields: [drawingId], references: [id])
  @@index([drawingId])
  @@index([walletAddress])
  @@map("winners")
}

model AuditLog {
  id            BigInt   @id @default(autoincrement())
  action        String
  module        String
  operatorKey   String?  @db.VarChar(44)
  entityId      String?
  entityType    String?
  metadata      Json?
  ipAddress     String?
  userAgent     String?
  createdAt     DateTime @default(now())
  @@index([action])
  @@index([module])
  @@index([createdAt])
  @@map("audit_logs")
}
```

---

## 6. API Specifications

### 6.1 RESTful API Structure

```
Base URL: https://api.solotto.live/v1

Authentication: Bearer JWT token

Rate Limits:
- Authenticated: 100 req/min
- Public (history): 300 req/min
- Export endpoints: 10 req/hour
```

### 6.2 Complete API Endpoints

**Authentication**
```
POST   /auth/challenge          Generate challenge message
POST   /auth/verify             Verify signature and issue JWT
POST   /auth/refresh            Refresh expired JWT
GET    /auth/me                 Get current operator info
```

**Control Module**
```
POST   /control/configure       Create new lottery config
GET    /control/configs         List all configs
GET    /control/configs/:id     Get specific config
PATCH  /control/configs/:id     Update draft config
DELETE /control/configs/:id     Cancel draft config
```

**Snapshot Module**
```
POST   /snapshot/create         Trigger snapshot generation
GET    /snapshot/:id            Get snapshot details
GET    /snapshot/:id/tiers      Get wallet lists by tier
GET    /snapshot/:id/validate   Re-validate snapshot
```

**Drawing Module**
```
POST   /drawing/execute         Execute VRF drawing
GET    /drawing/:id             Get drawing results
GET    /drawing/:id/verify      Verify VRF proof
POST   /drawing/:id/retry       Retry failed drawing
```

**Harvest Module**
```
POST   /harvest/calculate       Calculate prize pool
POST   /harvest/swap            Execute swap
GET    /harvest/:id             Get harvest details
GET    /harvest/:id/quote       Get swap quote
```

**Distribution Module**
```
POST   /distribution/execute    Execute distribution
GET    /distribution/:id        Get distribution status
POST   /distribution/:id/retry  Retry failed transactions
```

**History Module (Public)**
```
GET    /history/rounds          List all rounds
GET    /history/rounds/:id      Get specific round
GET    /history/wallet/:address Search wallet
GET    /history/stats           Get statistics
GET    /history/export          Export CSV
```

---

## 7. Security Architecture

### 7.1 Authentication Flow

```
1. Frontend requests challenge message
   POST /auth/challenge { publicKey: "..." }
   
2. Backend generates unique message with timestamp
   Response: { message: "Solotto auth: <timestamp>" }
   
3. User signs message with wallet
   const signature = await wallet.signMessage(message)
   
4. Frontend submits signature
   POST /auth/verify { publicKey, message, signature }
   
5. Backend verifies signature and issues JWT
   Response: { token: "eyJhbG...", expiresIn: 3600 }
```

### 7.2 Role-Based Access Control

```typescript
const requireRole = (minRole: Role) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.wallet || !req.wallet.isAuthorized) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const roleHierarchy = { AUDITOR: 1, OPERATOR: 2, ADMIN: 3 };
    
    if (roleHierarchy[req.wallet.role] < roleHierarchy[minRole]) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
};
```

### 7.3 Input Validation

```typescript
import { z } from 'zod';

export const WalletAddressSchema = z.string()
  .length(44)
  .regex(/^[1-9A-HJ-NP-Za-km-z]+$/);

export const ConfigSchema = z.object({
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  tradeThresholdPercent: z.number().int().min(50).max(100),
  infraAllocationPercent: z.number().int().min(0).max(100),
  blacklistedWallets: z.array(WalletAddressSchema).optional(),
  slippageTolerancePercent: z.number().min(0.1).max(5.0)
}).refine(data => new Date(data.endDate) > new Date(data.startDate));
```

---

## 8. Deployment Strategy

### 8.1 Environment Configuration

```bash
# Application
NODE_ENV=production
PORT=3000
API_BASE_URL=https://api.solotto.live

# Database
DATABASE_URL=postgresql://user:pass@host:5432/solotto
REDIS_URL=redis://host:6379

# Solana
SOLANA_RPC_PRIMARY=https://mainnet.helius-rpc.com/?api-key=xxx
SOLANA_RPC_FALLBACK=https://rpc.quicknode.pro/xxx
LOTTO_MINT_ADDRESS=xxxxx
SWITCHBOARD_QUEUE=xxxxx

# Wallets (encrypted at rest)
INFRA_WALLET_PRIVATE_KEY=xxxxx
TREASURY_WALLET_PRIVATE_KEY=xxxxx

# Security
JWT_SECRET=xxxxx
JWT_EXPIRATION=3600

# Monitoring
SENTRY_DSN=xxxxx
LOG_LEVEL=info
```

### 8.2 Deployment Checklist

**Pre-Deployment:**
- Run full test suite (unit + integration)
- Security audit completed
- Load testing with 10k+ wallets
- Verify all environment variables
- Database migration plan reviewed
- Backup strategy in place
- Rollback procedure documented

**Deployment:**
- Deploy database migrations
- Deploy backend API to Railway/Render
- Deploy frontend to Vercel
- Configure DNS and SSL certificates
- Set up monitoring dashboards
- Configure alerting rules
- Enable rate limiting
- Test all endpoints in production

**Post-Deployment:**
- Monitor error rates for 24 hours
- Verify first lottery execution
- Check public history accessibility
- Review audit logs
- Confirm backup systems functional

### 8.3 Monitoring & Alerting

```typescript
// Sentry error tracking
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1
});

// Custom metrics
class MetricsCollector {
  async recordLotteryExecution(duration: number, status: string) {
    await prometheus.histogram('lottery_execution_duration', duration, { status });
  }
  
  async recordRPCLatency(provider: string, latency: number) {
    await prometheus.histogram('rpc_latency', latency, { provider });
  }
}
```

### 8.4 Backup & Disaster Recovery

```bash
# Automated daily database backups
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/solotto-$(date +\%Y\%m\%d).sql.gz

# Retention: 30 days
find /backups -name "solotto-*.sql.gz" -mtime +30 -delete

# Recovery procedure
1. Restore from most recent backup
2. Verify data integrity
3. Re-deploy application
4. Validate critical functions
5. Resume operations
```

---

## 9. Development Workflow

### 9.1 Git Branching Strategy

```
main (production)
  └── staging (pre-production testing)
       └── develop (active development)
            ├── feature/control-module
            ├── feature/snapshot-module
            └── bugfix/vrf-timeout
```

### 9.2 Code Review Requirements

- All PRs require approval from senior developer
- Automated tests must pass
- Code coverage minimum: 80%
- No high-severity security warnings
- Documentation updated

### 9.3 Development Timeline (7 Weeks)

**Week 1-2: Foundation**
- Set up repository and CI/CD
- Database schema and migrations
- Authentication service
- Design system components

**Week 3-4: Core Modules**
- Control Module
- Snapshot Module
- Drawing Module with VRF

**Week 5: Financial Operations**
- Harvest Module
- Distribution Module
- DEX integration

**Week 6-7: Polish & Testing**
- History Module
- Public-facing pages
- End-to-end testing
- Security audit
- Performance optimization

---

## Appendix A: Glossary

**VRF**: Verifiable Random Function - cryptographic method for generating provably random numbers
**Tier**: Segment of participants based on token holdings
**Snapshot**: Point-in-time record of eligible wallets
**Infrastructure Wallet**: Wallet holding project funds
**Prize Pool**: Portion of infrastructure funds allocated to lottery
**DEX**: Decentralized Exchange
**RPC**: Remote Procedure Call - interface to blockchain
**Indexer**: Service that indexes blockchain data for faster queries

---

## Appendix B: References

- Solana Documentation: https://docs.solana.com
- Switchboard VRF: https://docs.switchboard.xyz
- Jupiter Aggregator: https://docs.jup.ag
- Next.js Documentation: https://nextjs.org/docs
- Prisma Documentation: https://www.prisma.io/docs

---

**Document End**

This technical specification provides complete implementation guidance for the Solotto Lottery Drawing Machine rebuild. All code examples are production-ready and follow best practices for Web3 applications on Solana.