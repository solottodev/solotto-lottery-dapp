# Solotto Backend Transparency Documentation

## Overview

The Solotto lottery backend is designed with **transparency** and **auditability** as core principles. This document explains how the backend operates, how randomness is generated, and how users can verify the integrity of lottery operations.

## Source Code Access

### Public Repository
- **GitHub**: [https://github.com/solottodev/solotto-lottery-dapp](https://github.com/solottodev/solotto-lottery-dapp)
- **Backend Code**: [https://github.com/solottodev/solotto-lottery-dapp/tree/main/apps/backend](https://github.com/solottodev/solotto-lottery-dapp/tree/main/apps/backend)

### API Documentation
- **Interactive Docs**: `http://localhost:4000/api/v1/docs` (local) or `https://api.solotto.io/api/v1/docs` (production)
- **Transparency Endpoint**: `/api/v1/transparency` - Real-time operational data

## Architecture

### Technology Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Blockchain**: Solana (web3.js + SPL Token)
- **Authentication**: JWT with wallet signature verification

### Core Services

1. **RPC Service** ([src/services/rpc.service.ts](https://github.com/solottodev/solotto-lottery-dapp/blob/main/apps/backend/src/services/rpc.service.ts))
   - Primary and fallback Solana RPC connections
   - Automatic failover for reliability
   - Rate limiting and retry logic

2. **Wallet Service** ([src/services/wallet.service.ts](https://github.com/solottodev/solotto-lottery-dapp/blob/main/apps/backend/src/services/wallet.service.ts))
   - Secure operator keypair management
   - Environment variable-based configuration
   - No private keys stored in code

3. **Snapshot Service** ([src/services/snapshot.service.ts](https://github.com/solottodev/solotto-lottery-dapp/blob/main/apps/backend/src/services/snapshot.service.ts))
   - Queries on-chain token holder balances
   - Applies blacklist filtering
   - Assigns participants to tiers based on holdings

4. **Drawing Service** ([src/services/drawing.service.ts](https://github.com/solottodev/solotto-lottery-dapp/blob/main/apps/backend/src/services/drawing.service.ts))
   - Cryptographically secure winner selection
   - Uses Solana blockhash as verifiable randomness source
   - Fair distribution across holder tiers

5. **Transfer Service** ([src/services/transfer.service.ts](https://github.com/solottodev/solotto-lottery-dapp/blob/main/apps/backend/src/services/transfer.service.ts))
   - Executes prize distribution to winners
   - Supports both SOL and SPL token transfers
   - Records all transaction signatures for audit

## Lottery Workflow

### 1. Control Stage ([/api/v1/control](https://github.com/solottodev/solotto-lottery-dapp/blob/main/apps/backend/src/routes/control.ts))

**Operator Action**: Configure lottery parameters

**Parameters**:
- `tokenMint`: Token contract address (e.g., $LOTTO)
- `snapshotStart/End`: Time window for balance snapshot
- `drawTime`: When winners will be selected
- `tradePercentage`: Minimum trading activity required (%)
- `minUsdLottoRequired`: Minimum token holdings in USD
- `prizeDistributionPercent`: % of prize wallet allocated to prizes
- `blacklist`: Addresses excluded from participation
- `prizeSourceWallet`: Wallet address holding prize funds

**Transparency Features**:
- Validates prize source wallet balance on-chain before accepting
- Merges operator-provided blacklist with hard-coded permanent blacklist
- Creates immutable Round record in database with all parameters
- Returns effective blacklist (operator + permanent) for verification

**Verification**:
```bash
# Query round configuration
curl http://localhost:4000/api/v1/history/round/{roundId}
```

---

### 2. Snapshot Stage ([/api/v1/snapshot](https://github.com/solottodev/solotto-lottery-dapp/blob/main/apps/backend/src/routes/snapshot.ts))

**Operator Action**: Capture token holder balances

**Process**:
1. Queries Solana blockchain for all token holders of specified mint
2. Excludes blacklisted addresses (both permanent and per-round)
3. Fetches USD price via Alchemy or Jupiter
4. Assigns holders to tiers based on token balance:
   - **Tier 1**: Top 25% of holders
   - **Tier 2**: 25-50%
   - **Tier 3**: 50-75%
   - **Tier 4**: Bottom 25%
5. Stores all participants in database with:
   - Wallet address
   - Token balance (start and end of round)
   - USD value of holdings
   - Assigned tier
   - Eligibility score (trading activity %)

**Transparency Features**:
- All participant data stored in PostgreSQL
- Snapshot ID, start time, completion time recorded
- CSV export available: `/api/v1/snapshot/{id}/participants/export`

**Verification**:
```bash
# View snapshot participants
curl http://localhost:4000/api/v1/snapshot/{snapshotId}/participants

# Download CSV
curl http://localhost:4000/api/v1/snapshot/{snapshotId}/participants/export \
  -H "Authorization: Bearer {jwt}" -o snapshot.csv
```

---

### 3. Drawing Stage ([/api/v1/drawing](https://github.com/solottodev/solotto-lottery-dapp/blob/main/apps/backend/src/routes/drawing.ts))

**Operator Action**: Execute winner selection

**Randomness Source**:
The drawing uses **Solana's latest blockhash** combined with the current timestamp as a verifiable source of randomness:

```typescript
// Simplified drawing logic
const connection = rpcService.getConnection();
const { blockhash } = await rpcService.getLatestBlockhash();
const slot = await connection.getSlot();
const timestamp = Date.now();

// Combine blockhash + timestamp as seed
const seed = `${blockhash}:${timestamp}`;

// Use cryptographic hash (tweetnacl) to generate randomness
const randomBytes = nacl.hash(Buffer.from(seed));

// Select winner from eligible participants in each tier
const winner = selectWinnerFromTier(eligibleParticipants, randomBytes);
```

**Why This Is Fair**:
- **Blockhash**: Generated by Solana validators, not controllable by operator
- **Slot**: On-chain slot number, provides additional entropy
- **Timestamp**: Prevents pre-computation attacks
- **Deterministic**: Given the same seed, the same winner is always selected (verifiable)

**Transparency Features**:
- Seed (blockhash:timestamp) stored in Drawing record
- Slot number stored for blockchain verification
- All eligible participants and their tiers recorded before drawing
- Winner addresses stored in Round.tierWinners

**Verification**:
```bash
# View drawing results
curl http://localhost:4000/api/v1/history/round/{roundId}

# Verify blockhash on Solana
solana block {slot} --url {rpc-endpoint}
```

---

### 4. Harvest Stage ([/api/v1/harvest](https://github.com/solottodev/solotto-lottery-dapp/blob/main/apps/backend/src/routes/harvest.ts))

**Operator Action**: Calculate prize distribution

**Process**:
1. Queries operator wallet balance on-chain (prize source wallet)
2. Calculates prize pool: `balance × prizeDistributionPercent`
3. Distributes prize pool across tiers (only those with winners):
   - **Tier 1**: 40% of prize pool
   - **Tier 2**: 30% of prize pool
   - **Tier 3**: 20% of prize pool
   - **Tier 4**: 10% of prize pool
4. If a tier has no winner, its allocation is redistributed proportionally

**Transparency Features**:
- Current wallet balance queried on-chain (not from cached data)
- Prize pool calculation is deterministic
- All allocations stored in Round.tierPayouts
- Blockhash and slot captured for audit trail

**Verification**:
```bash
# Query on-chain wallet balance
solana balance {prizeSourceWallet} --url {rpc-endpoint}

# Compare with database
curl http://localhost:4000/api/v1/history/round/{roundId}
```

---

### 5. Distribution Stage ([/api/v1/distribution](https://github.com/solottodev/solotto-lottery-dapp/blob/main/apps/backend/src/routes/distribution.ts))

**Operator Action**: Send prizes to winners

**Process**:
1. Retrieves winners and prize amounts from database
2. Executes on-chain transfers (SOL or SPL tokens) to each winner
3. Records transaction signatures for every transfer
4. Optional: Swaps SOL to $LOTTO via Jupiter DEX before distribution
5. Updates Round.distributionDate and Round.distributionTxSignatures

**Transparency Features**:
- Every transaction signature recorded in database
- Transaction signatures include Solscan URLs for public verification
- If SPL tokens distributed, Associated Token Account (ATA) addresses recorded
- Swap route ID and slippage recorded if Jupiter swap used

**Verification**:
```bash
# View distribution transactions
curl http://localhost:4000/api/v1/history/round/{roundId}

# Verify transaction on Solscan
# Visit: https://solscan.io/tx/{signature}?cluster=devnet

# Verify on-chain
solana confirm {signature} --url {rpc-endpoint}
```

---

## Audit Trail

### Database Records

All lottery operations create immutable records in PostgreSQL:

1. **LotteryConfig**: Operator-submitted parameters
2. **Round**: High-level round information (dates, prize pool, winners)
3. **Snapshot**: Snapshot execution metadata (status, start/completion times)
4. **Participant**: Every token holder captured (wallet, balance, tier, eligibility)
5. **Drawing**: Drawing execution metadata (seed, blockhash, slot)

### On-Chain Verification

Every critical operation is anchored to the Solana blockchain:

- **Snapshot**: Token holder balances verifiable via on-chain queries
- **Drawing**: Blockhash and slot verifiable on-chain
- **Distribution**: Transaction signatures verifiable on Solscan

### CSV Exports

Public CSV exports available for audit:

```bash
# All rounds history
curl http://localhost:4000/api/v1/history/export -o rounds.csv

# All participants across all rounds
curl http://localhost:4000/api/v1/history/export/participants -o participants.csv

# Full audit trail for specific round
curl http://localhost:4000/api/v1/history/export/round/{roundId}/full -o round_full.csv
```

---

## Security Measures

### Authentication

- **JWT tokens** issued after wallet signature verification
- Operator endpoints protected by `requireJwt` middleware
- Public endpoints (history, exports) accessible without auth

### Private Key Management

- Operator private key stored in `.env` file (never in code)
- Private key loaded only when needed for transactions
- Recommended: Use hardware wallet or HSM in production

### Blacklist System

Two-tier blacklist approach:

1. **Permanent Blacklist** (`HARD_BLACKLIST` env var)
   - Applied to ALL rounds automatically
   - Prevents known bad actors from participating
   - Examples: Exploiters, bots, team wallets

2. **Per-Round Blacklist** (Control form)
   - Operator can add addresses for specific round
   - Merged with permanent blacklist
   - Transparent: Full effective blacklist returned in API response

### Rate Limiting

- RPC service includes automatic retry and fallback
- Rate limiting recommended for production API endpoints
- Health checks available: `/api/v1/health/rpc`

---

## Transparency Endpoint

### Real-Time Operational Data

The `/api/v1/transparency` endpoint provides a live dashboard of backend operations:

**Available Data**:
- **System Status**: Database, RPC, and Alchemy health
- **Source Code**: Repository links and git commit hash
- **Last Drawing**: Most recent lottery results with audit data
- **Recent Operations**: Last 10 snapshots, drawings, and distributions
- **On-Chain Transactions**: Recent prize distribution transactions with Solscan links

**Example**:
```bash
curl http://localhost:4000/api/v1/transparency
```

**Response**:
```json
{
  "systemStatus": {
    "rpc": "healthy",
    "database": "healthy",
    "alchemy": "healthy",
    "timestamp": "2025-10-12T10:30:00.000Z"
  },
  "sourceCode": {
    "repository": "https://github.com/solottodev/solotto-lottery-dapp",
    "backend": "https://github.com/solottodev/solotto-lottery-dapp/tree/main/apps/backend",
    "commitHash": "a828d70",
    "buildDate": "2025-10-12T08:00:00.000Z"
  },
  "lastDrawing": {
    "roundId": "cm2abc123",
    "drawingDate": "2025-10-11T20:00:00.000Z",
    "prizePoolSol": 0.13,
    "eligibleParticipants": 42,
    "winners": {
      "t1": "6fjt...gteA",
      "t2": "8Kmo...xYz2",
      "t3": "9Lpq...zAb3",
      "t4": "4Nrs...wCd4"
    },
    "audit": {
      "blockhash": "8YG5t...j3K2",
      "slot": 298765432
    }
  },
  "recentOperations": [...],
  "onChainTransactions": [...]
}
```

---

## Production Deployment Recommendations

### Environment Variables

Required configuration for production:

```bash
# Database
DATABASE_URL="postgresql://..."
DATABASE_URL_RO="postgresql://..."

# Solana
SOLANA_NETWORK="mainnet-beta"
PRIMARY_RPC_ENDPOINT="https://mainnet.helius-rpc.com/?api-key={key}"
FALLBACK_RPC_ENDPOINT="https://api.mainnet-beta.solana.com"

# Operator Wallet (CRITICAL: Keep secure!)
OPERATOR_PRIVATE_KEY="[1,2,3,...,64]"

# Token Configuration
LOTTO_MINT_ADDRESS="token_mint_address_here"
LOTTO_DECIMALS="6"

# Alchemy (for pricing)
ALCHEMY_API_KEY="your_alchemy_key"

# Blacklist (permanent)
HARD_BLACKLIST='["address1","address2"]'

# Transparency
GIT_COMMIT_HASH="abc123..."
BUILD_DATE="2025-10-12T08:00:00.000Z"
```

### IPFS/Arweave Code Publishing (Future)

**Planned for mainnet launch**:
- CI/CD pipeline publishes source code to IPFS on each release
- IPFS hash stored in smart contract or displayed in UI
- Users can verify deployed backend matches published code

**Implementation**:
```bash
# Add to GitHub Actions workflow
- name: Publish to IPFS
  run: |
    ipfs add -r apps/backend/src
    echo "IPFS_HASH=$(ipfs add -r apps/backend/src | tail -n1 | awk '{print $2}')" >> $GITHUB_ENV
```

---

## Developer Access

### Local Development

1. Clone repository:
   ```bash
   git clone https://github.com/solottodev/solotto-lottery-dapp.git
   cd solotto-lottery-dapp/apps/backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

5. Start development server:
   ```bash
   npm run dev
   ```

6. Access API documentation:
   ```
   http://localhost:4000/api/v1/docs
   ```

### API Testing

All endpoints can be tested via:
- **Swagger UI**: Interactive documentation at `/api/v1/docs`
- **Curl**: Command-line HTTP requests
- **Postman**: Import OpenAPI spec from `/api/v1/docs/swagger.json`

---

## Frequently Asked Questions

### How can users verify the lottery is fair?

1. **Source Code**: Inspect the drawing algorithm in [drawing.service.ts](https://github.com/solottodev/solotto-lottery-dapp/blob/main/apps/backend/src/services/drawing.service.ts)
2. **Blockhash**: Verify the blockhash used as randomness source exists on-chain at the specified slot
3. **Participants**: Download CSV export to verify your wallet was included in the snapshot
4. **Transactions**: Check prize distribution transactions on Solscan

### Can the operator manipulate the drawing?

**No**, for several reasons:

1. **Blockhash is unpredictable**: Solana validators generate blockhashes through consensus (not controllable by operator)
2. **Timestamp prevents pre-computation**: Even if blockhash were known in advance, the timestamp adds entropy
3. **Deterministic algorithm**: Given the seed (blockhash + timestamp), the winner selection is deterministic and verifiable
4. **Audit trail**: All seeds, blockhashes, and slots are stored and publicly queryable

### What if the backend goes offline?

All critical data is stored on-chain or in PostgreSQL:

- **Prize funds**: Held in operator wallet (on-chain)
- **Token holders**: Queryable directly from Solana RPC
- **Past results**: Stored in PostgreSQL with CSV export backups

A backup operator could restore from:
1. Database backups (automated in production)
2. On-chain transaction history
3. CSV exports downloaded by users

### How do I verify my participation?

```bash
# Search for your wallet
curl "http://localhost:4000/api/v1/history/wallet/{yourWalletAddress}"

# Or search partial address
curl "http://localhost:4000/api/v1/history/search?q={first8chars}"
```

### Where can I see the source code?

- **GitHub**: [https://github.com/solottodev/solotto-lottery-dapp](https://github.com/solottodev/solotto-lottery-dapp)
- **Backend**: [apps/backend](https://github.com/solottodev/solotto-lottery-dapp/tree/main/apps/backend)
- **Frontend**: [apps/frontend](https://github.com/solottodev/solotto-lottery-dapp/tree/main/apps/frontend)

---

## Contact & Support

- **GitHub Issues**: [https://github.com/solottodev/solotto-lottery-dapp/issues](https://github.com/solottodev/solotto-lottery-dapp/issues)
- **Documentation**: [https://github.com/solottodev/solotto-lottery-dapp](https://github.com/solottodev/solotto-lottery-dapp)

---

## License

MIT License - See [LICENSE](https://github.com/solottodev/solotto-lottery-dapp/blob/main/LICENSE) file for details.

---

**Last Updated**: 2025-10-12
**Backend Version**: 1.0.0
**Git Commit**: a828d70
