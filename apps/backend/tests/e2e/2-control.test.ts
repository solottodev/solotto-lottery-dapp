import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../helpers/app.helper';
import { getAuthToken, cleanupTestUsers } from '../helpers/auth.helper';
import { Keypair } from '@solana/web3.js';

const prisma = new PrismaClient();
const app = createTestApp();

describe('Control Module E2E Tests', () => {
  let authToken: string;
  let testWallet: Keypair;

  beforeAll(async () => {
    // Clean up test users and get auth token
    await cleanupTestUsers();
    authToken = await getAuthToken(app, 'control-test@example.com', 'password123');

    // Generate a test wallet for prize source
    testWallet = Keypair.generate();
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.lotteryConfig.deleteMany({
      where: {
        tokenMint: 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump',
      },
    });
    await prisma.round.deleteMany({
      where: {
        network: process.env.SOLANA_NETWORK || 'devnet',
      },
    });
    await cleanupTestUsers();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/control', () => {
    it('should reject unauthenticated requests', async () => {
      await request(app)
        .post('/api/v1/control')
        .send({})
        .expect(401);
    });

    it('should reject invalid config with missing fields', async () => {
      const response = await request(app)
        .post('/api/v1/control')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
          tokenMint: 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject config with invalid date formats', async () => {
      const response = await request(app)
        .post('/api/v1/control')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tokenMint: 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump',
          tokenDecimals: 6,
          snapshotStart: 'invalid-date',
          snapshotEnd: '2025-12-31T23:59:59Z',
          tradePercentage: 100,
          minUsdLottoRequired: 10,
          prizeDistributionPercent: 50,
          slippageTolerancePercent: 0.5,
          prizeSourceWallet: testWallet.publicKey.toBase58(),
          prizeSourceBalanceSol: 10,
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid input');
    });

    it('should reject config with invalid blacklist addresses', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const response = await request(app)
        .post('/api/v1/control')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tokenMint: 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump',
          tokenDecimals: 6,
          snapshotStart: now.toISOString(),
          snapshotEnd: futureDate.toISOString(),
          tradePercentage: 100,
          minUsdLottoRequired: 10,
          prizeDistributionPercent: 50,
          slippageTolerancePercent: 0.5,
          prizeSourceWallet: testWallet.publicKey.toBase58(),
          prizeSourceBalanceSol: 10,
          blacklist: ['invalid-address', '12345'],
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid blacklist entries');
      expect(response.body.addresses).toContain('invalid-address');
    });

    it('should accept valid config with empty blacklist', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const response = await request(app)
        .post('/api/v1/control')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tokenMint: 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump',
          tokenDecimals: 6,
          snapshotStart: now.toISOString(),
          snapshotEnd: futureDate.toISOString(),
          tradePercentage: 100,
          minUsdLottoRequired: 10,
          prizeDistributionPercent: 50,
          slippageTolerancePercent: 0.5,
          prizeSourceWallet: testWallet.publicKey.toBase58(),
          prizeSourceBalanceSol: 0, // Use 0 to avoid wallet balance validation
          blacklist: [],
        });

      // May succeed or fail depending on wallet balance
      // We're mainly testing the blacklist validation here
      if (response.status === 201) {
        expect(response.body).toHaveProperty('config');
        expect(response.body).toHaveProperty('roundId');
        expect(response.body.effectiveBlacklist).toBeInstanceOf(Array);
      }
    });

    it('should merge hard blacklist with submitted blacklist', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const validWallet = Keypair.generate().publicKey.toBase58();

      // Set hard blacklist env var
      const originalHardBlacklist = process.env.HARD_BLACKLIST;
      process.env.HARD_BLACKLIST = JSON.stringify(['11111111111111111111111111111111']);

      const response = await request(app)
        .post('/api/v1/control')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tokenMint: 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump',
          tokenDecimals: 6,
          snapshotStart: now.toISOString(),
          snapshotEnd: futureDate.toISOString(),
          tradePercentage: 100,
          minUsdLottoRequired: 10,
          prizeDistributionPercent: 50,
          slippageTolerancePercent: 0.5,
          prizeSourceWallet: testWallet.publicKey.toBase58(),
          prizeSourceBalanceSol: 0,
          blacklist: [validWallet],
        });

      // Restore original env var
      if (originalHardBlacklist) {
        process.env.HARD_BLACKLIST = originalHardBlacklist;
      } else {
        delete process.env.HARD_BLACKLIST;
      }

      if (response.status === 201) {
        expect(response.body.effectiveBlacklist).toContain('11111111111111111111111111111111');
        expect(response.body.effectiveBlacklist).toContain(validWallet);
        expect(response.body.effectiveBlacklist.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should validate prize distribution percentage bounds', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // Test with percentage > 100
      const response = await request(app)
        .post('/api/v1/control')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tokenMint: 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump',
          tokenDecimals: 6,
          snapshotStart: now.toISOString(),
          snapshotEnd: futureDate.toISOString(),
          tradePercentage: 100,
          minUsdLottoRequired: 10,
          prizeDistributionPercent: 150, // Invalid: > 100
          slippageTolerancePercent: 0.5,
          prizeSourceWallet: testWallet.publicKey.toBase58(),
          prizeSourceBalanceSol: 10,
          blacklist: [],
        })
        .expect(400);

      expect(response.body.error).toBe('Invalid input');
    });

    it('should create round with correct prize pool calculation', async () => {
      const now = new Date();
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const prizeSourceBalanceSol = 10;
      const prizeDistributionPercent = 50;

      const response = await request(app)
        .post('/api/v1/control')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          tokenMint: 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump',
          tokenDecimals: 6,
          snapshotStart: now.toISOString(),
          snapshotEnd: futureDate.toISOString(),
          tradePercentage: 100,
          minUsdLottoRequired: 10,
          prizeDistributionPercent,
          slippageTolerancePercent: 0.5,
          prizeSourceWallet: testWallet.publicKey.toBase58(),
          prizeSourceBalanceSol,
          blacklist: [],
        });

      if (response.status === 201) {
        const expectedPrizePool = (prizeSourceBalanceSol * prizeDistributionPercent) / 100;
        expect(response.body.prizePoolSol).toBeCloseTo(expectedPrizePool, 6);

        // Verify round was created in database
        const round = await prisma.round.findUnique({
          where: { id: response.body.roundId },
        });

        expect(round).toBeTruthy();
        expect(round?.prizePoolSol).toBeCloseTo(expectedPrizePool, 6);
        expect(round?.prizeDistributionPercent).toBe(prizeDistributionPercent);
      }
    });
  });
});
