# Solotto On-Chain Lottery Drawing Machine
## Comprehensive Testing & Quality Assurance Plan

**Document Version:** 1.0  
**Last Updated:** September 30, 2025  
**Status:** Ready for Implementation  
**Project:** Solotto Lottery Drawing Machine Rebuild

---

## Table of Contents

1. [Testing Strategy Overview](#1-testing-strategy-overview)
2. [Test Environment Setup](#2-test-environment-setup)
3. [Unit Testing](#3-unit-testing)
4. [Integration Testing](#4-integration-testing)
5. [End-to-End Testing](#5-end-to-end-testing)
6. [Security Testing](#6-security-testing)
7. [Performance & Load Testing](#7-performance--load-testing)
8. [User Acceptance Testing](#8-user-acceptance-testing)
9. [Test Data Management](#9-test-data-management)
10. [Quality Gates & Criteria](#10-quality-gates--criteria)
11. [Bug Tracking & Resolution](#11-bug-tracking--resolution)
12. [Testing Schedule & Milestones](#12-testing-schedule--milestones)

---

## 1. Testing Strategy Overview

### 1.1 Testing Philosophy

**Goals:**
- Ensure 100% reliability for financial transactions
- Verify cryptographic security and randomness
- Validate business logic accuracy
- Confirm blockchain integration stability
- Guarantee public transparency and auditability

**Testing Pyramid:**
```
                    /\
                   /  \  E2E Tests (10%)
                  /    \  Manual & Exploratory
                 /------\
                /        \  Integration Tests (30%)
               /          \  API, Database, Blockchain
              /------------\
             /              \  Unit Tests (60%)
            /________________\  Functions, Components, Utils
```

### 1.2 Testing Scope

**In Scope:**
- All 6 core modules (Control, Snapshot, Drawing, Harvest, Distribution, History)
- Authentication and authorization flows
- Database operations and migrations
- Blockchain interactions (RPC, VRF, transactions)
- API endpoints and WebSocket events
- Frontend components and user workflows
- Error handling and recovery mechanisms
- Performance under load (10k+ wallets)

**Out of Scope:**
- Third-party service internals (Helius, Switchboard, Jupiter)
- Solana blockchain consensus mechanisms
- Browser compatibility beyond Chrome/Firefox/Safari latest versions
- Mobile app testing (web-responsive only)

### 1.3 Testing Tools & Frameworks

**Unit & Integration Testing:**
- Jest 29+ (test runner)
- React Testing Library (component tests)
- Supertest (API testing)
- ts-mockito (mocking)

**E2E Testing:**
- Playwright (browser automation)
- Solana Test Validator (local blockchain)

**Performance Testing:**
- k6 (load testing)
- Apache JMeter (stress testing)

**Security Testing:**
- OWASP ZAP (vulnerability scanning)
- npm audit (dependency vulnerabilities)
- Solana security best practices checklist

**Quality Monitoring:**
- SonarQube (code quality)
- Codecov (coverage reporting)
- ESLint + Prettier (code standards)

---

## 2. Test Environment Setup

### 2.1 Environment Configurations

**Local Development:**
```bash
Environment: development
Database: PostgreSQL (Docker container)
Blockchain: Solana Test Validator (localnet)
RPC: http://localhost:8899
Redis: Local instance
Wallets: Test keypairs (funded with test SOL)
```

**CI/CD (GitHub Actions):**
```bash
Environment: test
Database: PostgreSQL (ephemeral container)
Blockchain: Solana Devnet
RPC: https://api.devnet.solana.com
Redis: Redis container
Wallets: Automated test wallets
```

**Staging:**
```bash
Environment: staging
Database: PostgreSQL (managed service)
Blockchain: Solana Devnet
RPC: Helius Devnet RPC
Redis: Upstash Redis
Wallets: Staging operator wallets
```

**Production:**
```bash
Environment: production
Database: PostgreSQL (managed with replicas)
Blockchain: Solana Mainnet
RPC: Helius Mainnet RPC (with fallbacks)
Redis: Upstash Redis (production tier)
Wallets: Production operator wallets (hardware wallet)
```

### 2.2 Test Data Setup

**Database Seeding Script:**
```typescript
// test/seeds/lottery-data.seed.ts
import { PrismaClient } from '@prisma/client';

export async function seedTestData() {
  const prisma = new PrismaClient();
  
  // Create test operators
  await prisma.operator.createMany({
    data: [
      { publicKey: TEST_ADMIN_KEY, role: 'ADMIN', enabled: true },
      { publicKey: TEST_OPERATOR_KEY, role: 'OPERATOR', enabled: true },
      { publicKey: TEST_AUDITOR_KEY, role: 'AUDITOR', enabled: true }
    ]
  });
  
  // Create test config
  const config = await prisma.lotteryConfig.create({
    data: {
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-01-07'),
      tradeThresholdPercent: 50,
      infraAllocationPercent: 70,
      blacklistedWallets: [KNOWN_BOT_WALLET],
      slippageTolerancePercent: 1.0,
      operatorPublicKey: TEST_OPERATOR_KEY,
      operatorSignature: 'test-sig',
      status: 'VALIDATED'
    }
  });
  
  // Create test snapshot with 100 wallets
  const snapshot = await prisma.snapshot.create({
    data: {
      configId: config.id,
      snapshotHash: 'test-hash-123',
      totalWallets: 100,
      eligibleWallets: 100,
      tier1Count: 5,
      tier2Count: 15,
      tier3Count: 30,
      tier4Count: 50,
      status: 'COMPLETE'
    }
  });
  
  // Generate test wallets
  for (let i = 0; i < 100; i++) {
    const tier = i < 5 ? 1 : i < 20 ? 2 : i < 50 ? 3 : 4;
    await prisma.snapshotWallet.create({
      data: {
        snapshotId: snapshot.id,
        walletAddress: generateTestWallet(i),
        balance: BigInt((5 - tier) * 10000),
        tier: tier,
        tradeVolume: BigInt(50000)
      }
    });
  }
}
```

**Blockchain Test Setup:**
```bash
# Start local Solana test validator
solana-test-validator \
  --reset \
  --quiet \
  --ledger /tmp/test-ledger \
  --bpf-program <PROGRAM_ID> <PROGRAM_SO_PATH>

# Airdrop test SOL to wallets
solana airdrop 100 <TEST_WALLET_ADDRESS> --url localhost

# Deploy test token mint
spl-token create-token --url localhost
spl-token create-account <MINT_ADDRESS> --url localhost
spl-token mint <MINT_ADDRESS> 1000000 --url localhost
```

---

## 3. Unit Testing

### 3.1 Test Coverage Requirements

**Minimum Coverage Targets:**
- Overall: 85%
- Critical paths (financial operations): 100%
- Utility functions: 90%
- API controllers: 80%
- React components: 75%

### 3.2 Authentication Service Tests

```typescript
// __tests__/unit/auth.service.test.ts
describe('AuthService', () => {
  let authService: AuthService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  
  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    authService = new AuthService(mockPrisma);
  });
  
  describe('verifySignature', () => {
    it('should verify valid wallet signature', async () => {
      const message = 'Solotto auth: 1234567890';
      const signature = signMessage(message, TEST_KEYPAIR);
      
      const result = await authService.verifySignature(
        message,
        signature,
        TEST_KEYPAIR.publicKey.toString()
      );
      
      expect(result).toBe(true);
    });
    
    it('should reject expired signature', async () => {
      const oldMessage = 'Solotto auth: 1000000000'; // Old timestamp
      const signature = signMessage(oldMessage, TEST_KEYPAIR);
      
      await expect(
        authService.verifySignature(oldMessage, signature, TEST_KEYPAIR.publicKey.toString())
      ).rejects.toThrow('Signature expired');
    });
    
    it('should reject invalid signature', async () => {
      const message = 'Solotto auth: 1234567890';
      const invalidSignature = 'invalid-sig';
      
      const result = await authService.verifySignature(
        message,
        invalidSignature,
        TEST_KEYPAIR.publicKey.toString()
      );
      
      expect(result).toBe(false);
    });
    
    it('should reject unauthorized wallet', async () => {
      const message = 'Solotto auth: 1234567890';
      const signature = signMessage(message, UNAUTHORIZED_KEYPAIR);
      
      mockPrisma.operator.findUnique.mockResolvedValue(null);
      
      await expect(
        authService.verifySignature(message, signature, UNAUTHORIZED_KEYPAIR.publicKey.toString())
      ).rejects.toThrow('Unauthorized operator');
    });
  });
  
  describe('checkPermissions', () => {
    it('should allow admin to access operator endpoints', async () => {
      mockPrisma.operator.findUnique.mockResolvedValue({
        publicKey: TEST_ADMIN_KEY,
        role: 'ADMIN',
        enabled: true
      });
      
      const result = await authService.checkPermissions(TEST_ADMIN_KEY, 'OPERATOR');
      expect(result).toBe(true);
    });
    
    it('should deny auditor access to operator endpoints', async () => {
      mockPrisma.operator.findUnique.mockResolvedValue({
        publicKey: TEST_AUDITOR_KEY,
        role: 'AUDITOR',
        enabled: true
      });
      
      const result = await authService.checkPermissions(TEST_AUDITOR_KEY, 'OPERATOR');
      expect(result).toBe(false);
    });
  });
});
```

### 3.3 Control Module Tests

```typescript
// __tests__/unit/control.module.test.ts
describe('ControlModule', () => {
  let controlModule: ControlModule;
  
  describe('validateConfig', () => {
    it('should accept valid configuration', async () => {
      const config = {
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-07T00:00:00Z',
        tradeThresholdPercent: 50,
        infraAllocationPercent: 70,
        blacklistedWallets: [],
        slippageTolerancePercent: 1.0
      };
      
      const result = await controlModule.validateConfig(config);
      
      expect(result.status).toBe('validated');
      expect(result.configId).toBeDefined();
    });
    
    it('should reject end date before start date', async () => {
      const config = {
        startDate: '2025-01-07T00:00:00Z',
        endDate: '2025-01-01T00:00:00Z',
        tradeThresholdPercent: 50,
        infraAllocationPercent: 70
      };
      
      await expect(controlModule.validateConfig(config))
        .rejects.toThrow('End date must be after start date');
    });
    
    it('should reject future end date', async () => {
      const config = {
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2026-01-01T00:00:00Z',
        tradeThresholdPercent: 50,
        infraAllocationPercent: 70
      };
      
      await expect(controlModule.validateConfig(config))
        .rejects.toThrow('End date must be in the past');
    });
    
    it('should reject trade threshold below 50%', async () => {
      const config = {
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-07T00:00:00Z',
        tradeThresholdPercent: 30,
        infraAllocationPercent: 70
      };
      
      await expect(controlModule.validateConfig(config))
        .rejects.toThrow('Trade threshold must be between 50 and 100');
    });
    
    it('should reject invalid wallet addresses in blacklist', async () => {
      const config = {
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-01-07T00:00:00Z',
        tradeThresholdPercent: 50,
        infraAllocationPercent: 70,
        blacklistedWallets: ['invalid-wallet-address']
      };
      
      await expect(controlModule.validateConfig(config))
        .rejects.toThrow('Invalid wallet address format');
    });
    
    it('should prevent overlapping active configs', async () => {
      // Create existing active config
      await prisma.lotteryConfig.create({
        data: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-07'),
          status: 'ACTIVE',
          // ... other fields
        }
      });
      
      const config = {
        startDate: '2025-01-05T00:00:00Z',
        endDate: '2025-01-10T00:00:00Z',
        tradeThresholdPercent: 50,
        infraAllocationPercent: 70
      };
      
      await expect(controlModule.validateConfig(config))
        .rejects.toThrow('Another lottery is already active');
    });
  });
});
```

### 3.4 Snapshot Module Tests

```typescript
// __tests__/unit/snapshot.module.test.ts
describe('SnapshotModule', () => {
  let snapshotModule: SnapshotModule;
  let mockHelius: jest.Mocked<HeliusClient>;
  let mockConnection: jest.Mocked<Connection>;
  
  describe('createSnapshot', () => {
    it('should create valid snapshot with correct tier distribution', async () => {
      // Mock 100 token holders
      mockHelius.getTokenAccounts.mockResolvedValue(
        generateMockHolders(100)
      );
      
      const snapshot = await snapshotModule.createSnapshot(TEST_CONFIG_ID);
      
      expect(snapshot.totalWallets).toBe(100);
      expect(snapshot.tiers.tier1.count).toBe(5);  // 5%
      expect(snapshot.tiers.tier2.count).toBe(15); // 15%
      expect(snapshot.tiers.tier3.count).toBe(30); // 30%
      expect(snapshot.tiers.tier4.count).toBe(50); // 50%
    });
    
    it('should filter blacklisted wallets', async () => {
      const holders = generateMockHolders(100);
      holders[0].owner = BLACKLISTED_WALLET;
      
      mockHelius.getTokenAccounts.mockResolvedValue(holders);
      
      const snapshot = await snapshotModule.createSnapshot(TEST_CONFIG_ID);
      
      expect(snapshot.totalWallets).toBe(99);
      expect(snapshot.wallets).not.toContain(
        expect.objectContaining({ address: BLACKLISTED_WALLET })
      );
    });
    
    it('should filter wallets below minimum threshold', async () => {
      const holders = generateMockHolders(100);
      holders[0].amount = 100; // Below $50 equivalent
      
      mockHelius.getTokenAccounts.mockResolvedValue(holders);
      
      const snapshot = await snapshotModule.createSnapshot(TEST_CONFIG_ID);
      
      expect(snapshot.eligibleWallets).toBeLessThan(100);
    });
    
    it('should filter wallets with insufficient trading activity', async () => {
      mockHelius.getTokenAccounts.mockResolvedValue(
        generateMockHolders(100)
      );
      
      // Mock transaction history showing no trades
      mockConnection.getSignaturesForAddress.mockResolvedValue([]);
      
      const snapshot = await snapshotModule.createSnapshot(TEST_CONFIG_ID);
      
      expect(snapshot.eligibleWallets).toBe(0);
    });
    
    it('should generate reproducible snapshot hash', async () => {
      mockHelius.getTokenAccounts.mockResolvedValue(
        generateMockHolders(100)
      );
      
      const snapshot1 = await snapshotModule.createSnapshot(TEST_CONFIG_ID);
      const snapshot2 = await snapshotModule.createSnapshot(TEST_CONFIG_ID);
      
      expect(snapshot1.snapshotHash).toBe(snapshot2.snapshotHash);
    });
    
    it('should fallback to RPC on Helius failure', async () => {
      mockHelius.getTokenAccounts.mockRejectedValue(
        new Error('Helius API error')
      );
      
      mockConnection.getProgramAccounts.mockResolvedValue(
        generateMockProgramAccounts(100)
      );
      
      const snapshot = await snapshotModule.createSnapshot(TEST_CONFIG_ID);
      
      expect(snapshot.totalWallets).toBe(100);
      expect(mockConnection.getProgramAccounts).toHaveBeenCalled();
    });
  });
  
  describe('calculateTiers', () => {
    it('should correctly sort wallets by balance', () => {
      const wallets = [
        { address: 'wallet1', balance: 1000 },
        { address: 'wallet2', balance: 5000 },
        { address: 'wallet3', balance: 3000 }
      ];
      
      const tiers = snapshotModule.calculateTiers(wallets);
      
      expect(tiers.tier1[0].address).toBe('wallet2');
    });
    
    it('should handle edge case with fewer wallets than tier percentages', () => {
      const wallets = [
        { address: 'wallet1', balance: 1000 },
        { address: 'wallet2', balance: 2000 }
      ];
      
      const tiers = snapshotModule.calculateTiers(wallets);
      
      // With only 2 wallets, 5% = 0.1 rounds to 0
      expect(tiers.tier1.length).toBe(0);
      expect(tiers.tier4.length).toBeGreaterThan(0);
    });
  });
});
```

### 3.5 Drawing Module Tests

```typescript
// __tests__/unit/drawing.module.test.ts
describe('DrawingModule', () => {
  let drawingModule: DrawingModule;
  let mockVRF: jest.Mocked<VRFAccount>;
  
  describe('executeDrawing', () => {
    it('should select one winner per tier', async () => {
      const tiers = {
        tier1: generateMockWallets(5),
        tier2: generateMockWallets(15),
        tier3: generateMockWallets(30),
        tier4: generateMockWallets(50)
      };
      
      mockVRF.loadData.mockResolvedValue({
        status: { kind: 'StatusCallbackSuccess' },
        currentRound: { result: new BN(12345) }
      });
      
      const result = await drawingModule.executeDrawing(tiers);
      
      expect(result.winners).toHaveLength(4);
      expect(result.winners[0].tier).toBe(1);
      expect(result.winners[3].tier).toBe(4);
    });
    
    it('should prevent duplicate winners across tiers', async () => {
      const duplicateWallet = 'DuplicateWalletAddress123';
      const tiers = {
        tier1: [{ address: duplicateWallet, balance: 10000 }],
        tier2: [{ address: duplicateWallet, balance: 5000 }],
        tier3: [{ address: 'other1', balance: 3000 }],
        tier4: [{ address: 'other2', balance: 1000 }]
      };
      
      mockVRF.loadData.mockResolvedValue({
        status: { kind: 'StatusCallbackSuccess' },
        currentRound: { result: new BN(0) } // Always select first
      });
      
      const result = await drawingModule.executeDrawing(tiers);
      
      const winnerAddresses = result.winners.map(w => w.address);
      const uniqueAddresses = new Set(winnerAddresses);
      
      expect(uniqueAddresses.size).toBe(winnerAddresses.length);
    });
    
    it('should skip empty tiers', async () => {
      const tiers = {
        tier1: generateMockWallets(5),
        tier2: [], // Empty tier
        tier3: generateMockWallets(30),
        tier4: generateMockWallets(50)
      };
      
      const result = await drawingModule.executeDrawing(tiers);
      
      expect(result.winners).toHaveLength(3);
      expect(result.winners.find(w => w.tier === 2)).toBeUndefined();
    });
    
    it('should retry on VRF timeout', async () => {
      mockVRF.loadData
        .mockResolvedValueOnce({ status: { kind: 'StatusRequested' } })
        .mockResolvedValueOnce({ status: { kind: 'StatusRequested' } })
        .mockResolvedValueOnce({
          status: { kind: 'StatusCallbackSuccess' },
          currentRound: { result: new BN(12345) }
        });
      
      const result = await drawingModule.executeDrawing({ tier1: generateMockWallets(5) });
      
      expect(mockVRF.loadData).toHaveBeenCalledTimes(3);
      expect(result.winners).toHaveLength(1);
    });
    
    it('should throw error after max VRF timeout attempts', async () => {
      mockVRF.loadData.mockResolvedValue({
        status: { kind: 'StatusRequested' }
      });
      
      await expect(
        drawingModule.executeDrawing({ tier1: generateMockWallets(5) })
      ).rejects.toThrow('VRF request timed out');
    });
  });
});
```

### 3.6 Distribution Module Tests

```typescript
// __tests__/unit/distribution.module.test.ts
describe('DistributionModule', () => {
  let distributionModule: DistributionModule;
  
  describe('calculateTierAllocations', () => {
    it('should allocate standard percentages with all tiers', () => {
      const prizePool = 100;
      const winners = [
        { tier: 1, address: 'w1' },
        { tier: 2, address: 'w2' },
        { tier: 3, address: 'w3' },
        { tier: 4, address: 'w4' }
      ];
      
      const allocations = distributionModule.calculateTierAllocations(
        prizePool,
        winners
      );
      
      expect(allocations.tier1).toBe(40);
      expect(allocations.tier2).toBe(30);
      expect(allocations.tier3).toBe(20);
      expect(allocations.tier4).toBe(10);
    });
    
    it('should redistribute when tier 2 is empty', () => {
      const prizePool = 100;
      const winners = [
        { tier: 1, address: 'w1' },
        { tier: 3, address: 'w3' },
        { tier: 4, address: 'w4' }
      ];
      
      const allocations = distributionModule.calculateTierAllocations(
        prizePool,
        winners
      );
      
      // T1: 40/(40+20+10) = 57.14%
      expect(allocations.tier1).toBeCloseTo(57.14, 1);
      // T3: 20/(40+20+10) = 28.57%
      expect(allocations.tier3).toBeCloseTo(28.57, 1);
      // T4: 10/(40+20+10) = 14.29%
      expect(allocations.tier4).toBeCloseTo(14.29, 1);
      
      // Tier 2 should not exist
      expect(allocations.tier2).toBeUndefined();
      
      // Total should equal prize pool
      const total = Object.values(allocations).reduce((sum, val) => sum + val, 0);
      expect(total).toBeCloseTo(100, 1);
    });
    
    it('should redistribute when multiple tiers are empty', () => {
      const prizePool = 100;
      const winners = [
        { tier: 1, address: 'w1' },
        { tier: 4, address: 'w4' }
      ];
      
      const allocations = distributionModule.calculateTierAllocations(
        prizePool,
        winners
      );
      
      // T1: 40/(40+10) = 80%
      expect(allocations.tier1).toBeCloseTo(80, 1);
      // T4: 10/(40+10) = 20%
      expect(allocations.tier4).toBeCloseTo(20, 1);
    });
  });
  
  describe('executeDistribution', () => {
    it('should send SOL to all winners successfully', async () => {
      mockConnection.sendTransaction.mockResolvedValue('tx-hash-123');
      mockConnection.confirmTransaction.mockResolvedValue({ value: { err: null } });
      
      const harvest = {
        prizePoolAmount: BigInt(100 * LAMPORTS_PER_SOL),
        prizeAsset: 'SOL'
      };
      
      const winners = [
        { tier: 1, address: WALLET_1 },
        { tier: 2, address: WALLET_2 },
        { tier: 3, address: WALLET_3 },
        { tier: 4, address: WALLET_4 }
      ];
      
      const result = await distributionModule.executeDistribution(harvest, winners);
      
      expect(result.distributions).toHaveLength(4);
      expect(result.failedDistributions).toHaveLength(0);
      expect(mockConnection.sendTransaction).toHaveBeenCalledTimes(4);
    });
    
    it('should handle failed transaction and mark for retry', async () => {
      mockConnection.sendTransaction
        .mockResolvedValueOnce('tx-hash-1')
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce('tx-hash-3')
        .mockResolvedValueOnce('tx-hash-4');
      
      const result = await distributionModule.executeDistribution(harvest, winners);
      
      expect(result.distributions).toHaveLength(3);
      expect(result.failedDistributions).toHaveLength(1);
      expect(result.failedDistributions[0].tier).toBe(2);
      expect(result.failedDistributions[0].retryable).toBe(true);
    });
    
    it('should throw error if recipient has no token account', async () => {
      mockConnection.getAccountInfo.mockResolvedValue(null);
      
      const harvest = {
        prizePoolAmount: BigInt(100 * LAMPORTS_PER_SOL),
        prizeAsset: 'LOTTO'
      };
      
      await expect(
        distributionModule.executeDistribution(harvest, winners)
      ).rejects.toThrow('does not have a $LOTTO token account');
    });
  });
});
```

---

## 4. Integration Testing

### 4.1 API Integration Tests

```typescript
// __tests__/integration/api.test.ts
describe('API Integration Tests', () => {
  let app: Express;
  let authToken: string;
  
  beforeAll(async () => {
    app = await createTestApp();
    authToken = await getTestAuthToken();
  });
  
  describe('Complete Lottery Flow', () => {
    it('should execute full lottery cycle from config to distribution', async () => {
      // Step 1: Create config
      const configResponse = await request(app)
        .post('/api/control/configure')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          startDate: '2025-01-01T00:00:00Z',
          endDate: '2025-01-07T00:00:00Z',
          tradeThresholdPercent: 50,
          infraAllocationPercent: 70,
          slippageTolerancePercent: 1.0
        });
      
      expect(configResponse.status).toBe(200);
      const configId = configResponse.body.configId;
      
      // Step 2: Create snapshot
      const snapshotResponse = await request(app)
        .post('/api/snapshot/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ configId });
      
      expect(snapshotResponse.status).toBe(200);
      const snapshotId = snapshotResponse.body.snapshotId;
      
      // Wait for snapshot to complete
      await waitForStatus(app, authToken, `/api/snapshot/${snapshotId}`, 'complete');
      
      // Step 3: Execute drawing
      const drawingResponse = await request(app)
        .post('/api/drawing/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ snapshotId });
      
      expect(drawingResponse.status).toBe(200);
      const drawingId = drawingResponse.body.drawingId;
      
      // Step 4: Calculate prize pool
      const harvestResponse = await request(app)
        .post('/api/harvest/calculate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          drawingId,
          prizeAsset: 'SOL',
          dexPreference: 'jupiter'
        });
      
      expect(harvestResponse.status).toBe(200);
      const harvestId = harvestResponse.body.harvestId;
      
      // Step 5: Execute distribution
      const distributionResponse = await request(app)
        .post('/api/distribution/execute')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ harvestId });
      
      expect(distributionResponse.status).toBe(200);
      expect(distributionResponse.body.status).toBe('complete');
      
      // Step 6: Verify history
      const historyResponse = await request(app)
        .get(`/api/history/rounds/${configId}`);
      
      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.round.winners).toHaveLength(4);
      expect(historyResponse.body.round.status).toBe('complete');
    });
  });
  
  describe('Authentication Flow', () => {
    it('should complete full wallet authentication', async () => {
      // Get challenge
      const challengeResponse = await request(app)
        .post('/api/auth/challenge')
        .send({ publicKey: TEST_OPERATOR_KEY });
      
      expect(challengeResponse.status).toBe(200);
      const { message } = challengeResponse.body;
      
      // Sign message
      const signature = signMessageWithKeypair(message, TEST_KEYPAIR);
      
      // Verify and get JWT
      const verifyResponse = await request(app)
        .post('/api/auth/verify')
        .send({
          publicKey: TEST_OPERATOR_KEY,
          message,
          signature
        });
      
      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body.token).toBeDefined();
      expect(verifyResponse.body.expiresIn).toBe(3600);
    });
    
    it('should reject unauthorized wallet', async () => {
      const challengeResponse = await request(app)
        .post('/api/auth/challenge')
        .send({ publicKey: UNAUTHORIZED_WALLET });
      
      const { message } = challengeResponse.body;
      const signature = signMessageWithKeypair(message, UNAUTHORIZED_KEYPAIR);
      
      const verifyResponse = await request(app)
        .post('/api/auth/verify')
        .send({
          publicKey: UNAUTHORIZED_WALLET,
          message,
          signature
        });
      
      expect(verifyResponse.status).toBe(401);
      expect(verifyResponse.body.error).toContain('Unauthorized');
    });
  });
  
  describe('Role-Based Access Control', () => {
    it('should allow operator to execute lottery operations', async () => {
      const operatorToken = await getTestAuthToken('OPERATOR');
      
      const response = await request(app)
        .post('/api/control/configure')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(validConfig);
      
      expect(response.status).toBe(200);
    });
    
    it('should deny auditor from executing lottery operations', async () => {
      const auditorToken = await getTestAuthToken('AUDITOR');
      
      const response = await request(app)
        .post('/api/control/configure')
        .set('Authorization', `Bearer ${auditorToken}`)
        .send(validConfig);
      
      expect(response.status).toBe(403);
    });
    
    it('should allow auditor to view history', async () => {
      const auditorToken = await getTestAuthToken('AUDITOR');
      
      const response = await request(app)
        .get('/api/history/rounds')
        .set('Authorization', `Bearer ${auditorToken}`);
      
      expect(response.status).toBe(200);
    });
  });
});
```

### 4.2 Database Integration Tests

```typescript
// __tests__/integration/database.test.ts
describe('Database Integration Tests', () => {
  let prisma: PrismaClient;
  
  beforeAll(async () => {
    prisma = new PrismaClient();
    await seedTestData();
  });
  
  afterAll(async () => {
    await cleanupTestData();
    await prisma.$disconnect();
  });
  
  describe('Lottery Config CRUD', () => {
    it('should create and retrieve lottery config', async () => {
      const config = await prisma.lotteryConfig.create({
        data: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-07'),
          tradeThresholdPercent: 50,
          infraAllocationPercent: 70,
          operatorPublicKey: TEST_OPERATOR_KEY,
          operatorSignature: 'test-sig',
          status: 'PENDING'
        }
      });
      
      const retrieved = await prisma.lotteryConfig.findUnique({
        where: { id: config.id }
      });
      
      expect(retrieved).toBeDefined();
      expect(retrieved.startDate).toEqual(config.startDate);
    });
    
    it('should enforce date constraint', async () => {
      await expect(
        prisma.lotteryConfig.create({
          data: {
            startDate: new Date('2025-01-07'),
            endDate: new Date('2025-01-01'), // Before start
            tradeThresholdPercent: 50,
            infraAllocationPercent: 70,
            operatorPublicKey: TEST_OPERATOR_KEY,
            operatorSignature: 'test-sig'
          }
        })
      ).rejects.toThrow();
    });
  });
  
  describe('Snapshot with Wallets', () => {
    it('should create snapshot with 1000+ wallet records', async () => {
      const config = await createTestConfig();
      
      const snapshot = await prisma.snapshot.create({
        data: {
          configId: config.id,
          snapshotHash: 'hash-123',
          totalWallets: 1000,
          eligibleWallets: 1000,
          tier1Count: 50,
          tier2Count: 150,
          tier3Count: 300,
          tier4Count: 500,
          status: 'COMPLETE'
        }
      });
      
      // Bulk create wallets
      const wallets = [];
      for (let i = 0; i < 1000; i++) {
        wallets.push({
          snapshotId: snapshot.id,
          walletAddress: generateTestWallet(i),
          balance: BigInt(1000000),
          tier: i < 50 ? 1 : i < 200 ? 2 : i < 500 ? 3 : 4,
          tradeVolume: BigInt(500000)
        });
      }
      
      await prisma.snapshotWallet.createMany({ data: wallets });
      
      const count = await prisma.snapshotWallet.count({
        where: { snapshotId: snapshot.id }
      });
      
      expect(count).toBe(1000);
    });
    
    it('should query wallets by tier efficiently', async () => {
      const snapshot = await createTestSnapshotWithWallets(1000);
      
      const startTime = Date.now();
      
      const tier1Wallets = await prisma.snapshotWallet.findMany({
        where: {
          snapshotId: snapshot.id,
          tier: 1
        }
      });
      
      const queryTime = Date.now() - startTime;
      
      expect(tier1Wallets.length).toBe(50);
      expect(queryTime).toBeLessThan(100); // Should be fast with index
    });
  });
  
  describe('Transaction Atomicity', () => {
    it('should rollback on failure', async () => {
      const initialCount = await prisma.lotteryConfig.count();
      
      try {
        await prisma.$transaction(async (tx) => {
          await tx.lotteryConfig.create({
            data: validConfigData
          });
          
          // Force error
          throw new Error('Simulated error');
        });
      } catch (error) {
        // Expected
      }
      
      const finalCount = await prisma.lotteryConfig.count();
      expect(finalCount).toBe(initialCount);
    });
  });
});
```

### 4.3 Blockchain Integration Tests

```typescript
// __tests__/integration/blockchain.test.ts
describe('Blockchain Integration Tests', () => {
  let connection: Connection;
  let testWallet: Keypair;
  
  beforeAll(async () => {
    // Start local test validator
    await startTestValidator();
    connection = new Connection('http://localhost:8899', 'confirmed');
    testWallet = await createAndFundTestWallet(connection);
  });
  
  afterAll(async () => {
    await stopTestValidator();
  });
  
  describe('RPC Operations', () => {
    it('should fetch wallet balance', async () => {
      const balance = await connection.getBalance(testWallet.publicKey);
      
      expect(balance).toBeGreaterThan(0);
    });
    
    it('should get token accounts for wallet', async () => {
      const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
        testWallet.publicKey,
        { programId: TOKEN_PROGRAM_ID }
      );
      
      expect(tokenAccounts.value).toBeDefined();
    });
    
    it('should handle RPC timeout gracefully', async () => {
      const slowConnection = new Connection('http://slow-endpoint', {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 1000
      });
      
      await expect(
        slowConnection.getBalance(testWallet.publicKey)
      ).rejects.toThrow();
    });
  });
  
  describe('SOL Transfers', () => {
    it('should send SOL to recipient', async () => {
      const recipient = Keypair.generate();
      const amount = 0.1 * LAMPORTS_PER_SOL;
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: testWallet.publicKey,
          toPubkey: recipient.publicKey,
          lamports: amount
        })
      );
      
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [testWallet]
      );
      
      expect(signature).toBeDefined();
      
      const balance = await connection.getBalance(recipient.publicKey);
      expect(balance).toBe(amount);
    });
    
    it('should fail with insufficient funds', async () => {
      const poorWallet = Keypair.generate();
      const recipient = Keypair.generate();
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: poorWallet.publicKey,
          toPubkey: recipient.publicKey,
          lamports: 1 * LAMPORTS_PER_SOL
        })
      );
      
      await expect(
        sendAndConfirmTransaction(connection, transaction, [poorWallet])
      ).rejects.toThrow();
    });
  });
  
  describe('VRF Integration', () => {
    it('should request and receive VRF result', async () => {
      const program = await loadSwitchboardProgram('localnet', connection);
      const queue = new OracleQueueAccount(program, TEST_ORACLE_QUEUE);
      
      const [vrfAccount] = await queue.createVrf({
        callback: {
          programId: program.programId,
          accounts: [],
          ixData: Buffer.from([])
        },
        authority: testWallet.publicKey,
        enable: true
      });
      
      await vrfAccount.requestRandomness();
      
      // Wait for result
      let result;
      for (let i = 0; i < 30; i++) {
        const state = await vrfAccount.loadData();
        if (state.status.kind === 'StatusCallbackSuccess') {
          result = state.currentRound.result;
          break;
        }
        await sleep(1000);
      }
      
      expect(result).toBeDefined();
      expect(result.gt(new BN(0))).toBe(true);
    }, 60000);
  });
});
```

---

## 5. End-to-End Testing

### 5.1 E2E Test Setup with Playwright

```typescript
// __tests__/e2e/lottery-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Complete Lottery Flow E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
  });
  
  test('operator can execute complete lottery cycle', async ({ page }) => {
    // Step 1: Connect wallet
    await page.click('button:has-text("Connect Wallet")');
    
    // Mock wallet approval
    await page.evaluate(() => {
      window.solana = {
        isPhantom: true,
        publicKey: { toString: () => 'TestOperatorWallet123' },
        signMessage: async () => 'mock-signature'
      };
    });
    
    await expect(page.locator('text=Owner Connected')).toBeVisible();
    
    // Step 2: Configure lottery
    await page.click('button:has-text("Configure Parameters")');
    
    await page.fill('input[name="startDate"]', '2025-01-01');
    await page.fill('input[name="endDate"]', '2025-01-07');
    await page.fill('input[name="tradeThreshold"]', '50');
    await page.fill('input[name="infraAllocation"]', '70');
    
    await page.click('button:has-text("Validate Parameters")');
    
    await expect(page.locator('text=Configuration validated')).toBeVisible();
    
    // Step 3: Create snapshot
    await page.click('button:has-text("Create Snapshot")');
    
    // Wait for snapshot to complete (with progress indicator)
    await expect(page.locator('text=Snapshot complete')).toBeVisible({
      timeout: 60000
    });
    
    // Step 4: Execute drawing
    await page.click('button:has-text("Execute VRF Drawing")');
    
    await expect(page.locator('text=Drawing complete')).toBeVisible({
      timeout: 30000
    });
    
    // Verify winners displayed
    await expect(page.locator('text=Tier 1:')).toBeVisible();
    await expect(page.locator('text=Tier 4:')).toBeVisible();
    
    // Step 5: Harvest prize pool
    await page.click('button:has-text("Harvest Prize Pool")');
    
    await expect(page.locator('text=Prize pool harvested')).toBeVisible();
    
    // Step 6: Execute distribution
    await page.click('button:has-text("Execute Distribution")');
    
    await expect(page.locator('text=Distribution complete')).toBeVisible({
      timeout: 30000
    });
    
    // Verify Solscan links present
    const solscanLinks = await page.locator('a[href*="solscan.io"]').count();
    expect(solscanLinks).toBeGreaterThanOrEqual(4);
  });
  
  test('public user can view lottery history', async ({ page }) => {
    await page.goto('http://localhost:3000/history');
    
    // Should see rounds without authentication
    await expect(page.locator('text=SOLOTTO LOTTERY HISTORY')).toBeVisible();
    await expect(page.locator('text=Round #')).toBeVisible();
    
    // Click on round to expand
    await page.click('text=Round #339000');
    
    await expect(page.locator('text=Winners:')).toBeVisible();
    await expect(page.locator('text=Tier 1')).toBeVisible();
    
    // Test wallet search
    await page.fill('input[placeholder="Search wallet"]', '9WzDXw...YtAWWM');
    await page.click('button:has-text("Search")');
    
    await expect(page.locator('text=Participation History')).toBeVisible();
  });
  
  test('operator sees real-time updates via WebSocket', async ({ page }) => {
    await connectWallet(page);
    
    // Start snapshot
    await page.click('button:has-text("Create Snapshot")');
    
    // Should see progress updates
    await expect(page.locator('text=Processing: 25%')).toBeVisible();
    await expect(page.locator('text=Processing: 50%')).toBeVisible();
    await expect(page.locator('text=Processing: 75%')).toBeVisible();
    await expect(page.locator('text=Processing: 100%')).toBeVisible();
  });
});
```

### 5.2 Error Handling E2E Tests

```typescript
// __tests__/e2e/error-handling.spec.ts
test.describe('Error Handling', () => {
  test('should handle RPC failure gracefully', async ({ page }) => {
    // Mock RPC failure
    await page.route('**/api/snapshot/create', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'RPC connection failed' })
      });
    });
    
    await connectWallet(page);
    await page.click('button:has-text("Create Snapshot")');
    
    await expect(page.locator('text=RPC connection failed')).toBeVisible();
    await expect(page.locator('button:has-text("Retry")')).toBeVisible();
  });
  
  test('should handle VRF timeout', async ({ page }) => {
    await connectWallet(page);
    await createSnapshot(page);
    
    // Mock VRF timeout
    await page.route('**/api/drawing/execute', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'VRF request timed out' })
      });
    });
    
    await page.click('button:has-text("Execute VRF Drawing")');
    
    await expect(page.locator('text=VRF request timed out')).toBeVisible();
    await expect(page.locator('text=Please try again')).toBeVisible();
  });
  
  test('should handle distribution failure and show retry option', async ({ page }) => {
    await connectWallet(page);
    await completeUpToDistribution(page);
    
    // Mock partial distribution failure
    await page.route('**/api/distribution/execute', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          distributions: [
            { tier: 1, status: 'confirmed' },
            { tier: 2, status: 'failed', error: 'Network error' },
            { tier: 3, status: 'confirmed' },
            { tier: 4, status: 'confirmed' }
          ],
          status: 'partial_failure'
        })
      });
    });
    
    await page.click('button:has-text("Execute Distribution")');
    
    await expect(page.locator('text=Tier 2: Failed')).toBeVisible();
    await expect(page.locator('button:has-text("Retry Failed Transactions")')).toBeVisible();
  });
});
```

---

## 6. Security Testing

### 6.1 Authentication Security Tests

```typescript
// __tests__/security/auth.test.ts
describe('Authentication Security', () => {
  test('should prevent replay attacks', async () => {
    const { message, signature } = await getValidAuth();
    
    // First request succeeds
    const response1 = await request(app)
      .post('/api/auth/verify')
      .send({ publicKey: TEST_OPERATOR_KEY, message, signature });
    
    expect(response1.status).toBe(200);
    
    // Replay same credentials
    await sleep(6000); // Wait past 5-minute validity
    
    const response2 = await request(app)
      .post('/api/auth/verify')
      .send({ publicKey: TEST_OPERATOR_KEY, message, signature });
    
    expect(response2.status).toBe(401);
    expect(response2.body.error).toContain('expired');
  });
  
  test('should prevent signature forgery', async () => {
    const message = 'Solotto auth: 1234567890';
    const wrongKeySignature = signMessageWithKeypair(message, WRONG_KEYPAIR);
    
    const response = await request(app)
      .post('/api/auth/verify')
      .send({
        publicKey: TEST_OPERATOR_KEY,
        message,
        signature: wrongKeySignature
      });
    
    expect(response.status).toBe(401);
  });
  
  test('should rate limit authentication attempts', async () => {
    const promises = [];
    
    // Make 10 rapid authentication attempts
    for (let i = 0; i < 10; i++) {
      promises.push(
        request(app)
          .post('/api/auth/challenge')
          .send({ publicKey: TEST_OPERATOR_KEY })
      );
    }
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r.status === 429);
    
    expect(rateLimited.length).toBeGreaterThan(0);
  });
});
```

### 6.2 Input Validation Security Tests

```typescript
// __tests__/security/injection.test.ts
describe('Injection Attack Prevention', () => {
  test('should sanitize SQL injection attempts', async () => {
    const maliciousInput = {
      startDate: "2025-01-01'; DROP TABLE lottery_configs; --",
      endDate: '2025-01-07',
      tradeThresholdPercent: 50,
      infraAllocationPercent: 70
    };
    
    const response = await request(app)
      .post('/api/control/configure')
      .set('Authorization', `Bearer ${authToken}`)
      .send(maliciousInput);
    
    expect(response.status).toBe(400);
    
    // Verify table still exists
    const configs = await prisma.lotteryConfig.findMany();
    expect(configs).toBeDefined();
  });
  
  test('should reject XSS attempts in blacklist', async () => {
    const maliciousInput = {
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-01-07T00:00:00Z',
      tradeThresholdPercent: 50,
      infraAllocationPercent: 70,
      blacklistedWallets: ['<script>alert("xss")</script>']
    };
    
    const response = await request(app)
      .post('/api/control/configure')
      .set('Authorization', `Bearer ${authToken}`)
      .send(maliciousInput);
    
    expect(response.status).toBe(400);
    expect(response.body.error).toContain('Invalid wallet address');
  });
});
```

### 6.3 Authorization Security Tests

```typescript
// __tests__/security/authorization.test.ts
describe('Authorization Security', () => {
  test('should prevent privilege escalation', async () => {
    const auditorToken = await getTestAuthToken('AUDITOR');
    
    // Try to execute operator-only action
    const response = await request(app)
      .post('/api/distribution/execute')
      .set('Authorization', `Bearer ${auditorToken}`)
      .send({ harvestId: 'test-id' });
    
    expect(response.status).toBe(403);
  });
  
  test('should prevent JWT tampering', async () => {
    const validToken = await getTestAuthToken('OPERATOR');
    
    // Tamper with token payload
    const [header, payload, signature] = validToken.split('.');
    const decodedPayload = JSON.parse(Buffer.from(payload, 'base64').toString());
    decodedPayload.role = 'ADMIN'; // Try to escalate
    
    const tamperedPayload = Buffer.from(JSON.stringify(decodedPayload)).toString('base64');
    const tamperedToken = `${header}.${tamperedPayload}.${signature}`;
    
    const response = await request(app)
      .post('/api/control/configure')
      .set('Authorization', `Bearer ${tamperedToken}`)
      .send(validConfig);
    
    expect(response.status).toBe(401);
  });
});
```

### 6.4 OWASP ZAP Vulnerability Scan

```bash
# Run automated vulnerability scan
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000 \
  -r zap-report.html

# Check for common vulnerabilities:
# - SQL Injection
# - XSS
# - CSRF
# - Security Headers
# - SSL/TLS Configuration
```

---

## 7. Performance & Load Testing

### 7.1 Load Testing with k6

```javascript
// __tests__/load/lottery-load.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 10 },  // Ramp up to 10 users
    { duration: '5m', target: 10 },  // Stay at 10 for 5 minutes
    { duration: '2m', target: 50 },  // Ramp to 50 users
    { duration: '5m', target: 50 },  // Stay at 50
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Less than 1% errors
  },
};

export default function () {
  const authToken = __ENV.AUTH_TOKEN;
  
  const params = {
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  };
  
  // Test history endpoint (public)
  const historyRes = http.get('http://localhost:3000/api/history/rounds', params);
  check(historyRes, {
    'history status is 200': (r) => r.status === 200,
    'history response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

### 7.2 Snapshot Performance Test

```typescript
// __tests__/performance/snapshot.test.ts
describe('Snapshot Performance', () => {
  test('should process 10,000 wallets in under 2 minutes', async () => {
    const startTime = Date.now();
    
    const config = await createTestConfig();
    const snapshot = await snapshotModule.createSnapshot(config.id);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // seconds
    
    expect(snapshot.totalWallets).toBe(10000);
    expect(duration).toBeLessThan(120); // 2 minutes
  }, 150000);
  
  test('should handle concurrent snapshot requests', async () => {
    const configs = await Promise.all([
      createTestConfig(),
      createTestConfig(),
      createTestConfig()
    ]);
    
    const startTime = Date.now();
    
    const snapshots = await Promise.all(
      configs.map(c => snapshotModule.createSnapshot(c.id))
    );
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    expect(snapshots).toHaveLength(3);
    expect(duration).toBeLessThan(180); // 3 minutes total
  }, 200000);
});
```

### 7.3 Database Performance Test

```typescript
// __tests__/performance/database.test.ts
describe('Database Performance', () => {
  test('should query 100k snapshot wallets in under 1 second', async () => {
    const snapshot = await createLargeSnapshot(100000);
    
    const startTime = Date.now();
    
    const wallets = await prisma.snapshotWallet.findMany({
      where: { snapshotId: snapshot.id, tier: 1 },
      take: 1000
    });
    
    const queryTime = Date.now() - startTime;
    
    expect(wallets.length).toBeGreaterThan(0);
    expect(queryTime).toBeLessThan(1000);
  });
  
  test('should handle high concurrent read operations', async () => {
    const snapshot = await createTestSnapshotWithWallets(10000);
    
    const queries = [];
    for (let i = 0; i < 100; i++) {
      queries.push(
        prisma.snapshotWallet.findMany({
          where: { snapshotId: snapshot.id },
          take: 100,
          skip: i * 100
        })
      );
    }
    
    const startTime = Date.now();
    const results = await Promise.all(queries);
    const duration = Date.now() - startTime;
    
    expect(results.length).toBe(100);
    expect(duration).toBeLessThan(5000); // 5 seconds for 100 queries
  });
});
```

---

## 8. User Acceptance Testing

### 8.1 UAT Test Scenarios

**Operator UAT Checklist:**

```markdown
## Lottery Configuration
- [ ] Can connect wallet successfully
- [ ] Can input all configuration parameters
- [ ] Receives clear validation errors for invalid inputs
- [ ] Can see configuration saved confirmation
- [ ] Can view previous configurations

## Snapshot Creation
- [ ] Can trigger snapshot creation
- [ ] Sees progress indicator during snapshot
- [ ] Receives notification when snapshot completes
- [ ] Can view tier distribution summary
- [ ] Can download tier wallet lists

## Drawing Execution
- [ ] Can execute VRF drawing
- [ ] Sees VRF request confirmation
- [ ] Views winners for all tiers
- [ ] Can verify VRF proof on-chain
- [ ] Receives Solscan links for verification

## Prize Distribution
- [ ] Can calculate prize pool
- [ ] Sees current infrastructure wallet balance
- [ ] Can opt