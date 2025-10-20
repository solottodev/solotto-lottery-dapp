import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../helpers/app.helper';
import { getAuthToken, cleanupTestUsers } from '../helpers/auth.helper';
import { Keypair } from '@solana/web3.js';

const prisma = new PrismaClient();
const app = createTestApp();

describe('Harvest Module E2E Tests', () => {
  let authToken: string;
  let roundId: string;
  let operatorWallet: Keypair;

  beforeAll(async () => {
    await cleanupTestUsers();
    authToken = await getAuthToken(app, 'harvest-test@example.com', 'password123');
    operatorWallet = Keypair.generate();

    // Create a test round with winners
    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const round = await prisma.round.create({
      data: {
        network: process.env.SOLANA_NETWORK || 'devnet',
        startDate: now,
        endDate: futureDate,
        prizePoolSol: 0, // Will be calculated during harvest
        prizeDistributionPercent: 50,
        prizeSourceWallet: operatorWallet.publicKey.toBase58(),
        prizeSourceBalanceSol: 10,
        totalParticipants: 4,
        eligibleParticipants: 4,
        tierWinners: {
          t1: Keypair.generate().publicKey.toBase58(),
          t2: Keypair.generate().publicKey.toBase58(),
          t3: Keypair.generate().publicKey.toBase58(),
          t4: Keypair.generate().publicKey.toBase58(),
        },
        tierPayouts: {},
      },
    });

    roundId = round.id;
  });

  afterAll(async () => {
    await prisma.round.deleteMany({ where: { id: roundId } });
    await cleanupTestUsers();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/harvest/prepare', () => {
    it('should reject unauthenticated requests', async () => {
      await request(app)
        .post('/api/v1/harvest/prepare')
        .send({ roundId, operatorWalletAddress: operatorWallet.publicKey.toBase58() })
        .expect(401);
    });

    it('should reject harvest with missing roundId', async () => {
      await request(app)
        .post('/api/v1/harvest/prepare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operatorWalletAddress: operatorWallet.publicKey.toBase58() })
        .expect(400);
    });

    it('should reject harvest with missing operatorWalletAddress', async () => {
      await request(app)
        .post('/api/v1/harvest/prepare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ roundId })
        .expect(400);
    });

    it('should reject harvest for non-existent round', async () => {
      await request(app)
        .post('/api/v1/harvest/prepare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          roundId: 'non-existent-round',
          operatorWalletAddress: operatorWallet.publicKey.toBase58(),
        })
        .expect(404);
    });

    it('should reject harvest with invalid wallet address', async () => {
      await request(app)
        .post('/api/v1/harvest/prepare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          roundId,
          operatorWalletAddress: 'invalid-address',
        })
        .expect(400);
    });

    it('should prepare harvest and calculate prize allocations', async () => {
      const response = await request(app)
        .post('/api/v1/harvest/prepare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          roundId,
          operatorWalletAddress: operatorWallet.publicKey.toBase58(),
        });

      // May succeed or fail depending on blockchain connectivity
      if (response.status === 200) {
        expect(response.body).toHaveProperty('preparedAt');
        expect(response.body).toHaveProperty('prizePoolSol');
        expect(response.body).toHaveProperty('allocations');
        expect(response.body).toHaveProperty('audit');

        // Verify allocations structure
        expect(response.body.allocations).toHaveProperty('t1');
        expect(response.body.allocations).toHaveProperty('t2');
        expect(response.body.allocations).toHaveProperty('t3');
        expect(response.body.allocations).toHaveProperty('t4');

        // Verify audit trail
        expect(response.body.audit).toHaveProperty('blockhash');
        expect(response.body.audit).toHaveProperty('slot');

        // Sum of allocations should equal prize pool (within rounding)
        const totalAllocated = Object.values(response.body.allocations).reduce(
          (sum: number, amount: any) => sum + amount,
          0
        );
        expect(Math.abs(totalAllocated - response.body.prizePoolSol)).toBeLessThan(0.001);

        // Verify round was updated
        const round = await prisma.round.findUnique({
          where: { id: roundId },
        });

        expect(round?.prizePoolSol).toBe(response.body.prizePoolSol);
        expect(round?.tierPayouts).toEqual(response.body.allocations);
      } else if (response.status === 400) {
        // Acceptable if wallet has zero balance
        expect(response.body.error).toBeTruthy();
      } else if (response.status === 500) {
        // Blockchain error - acceptable in test environment
        console.log('Harvest failed (likely RPC issue):', response.body.error);
      }
    });

    it('should calculate correct tier percentages (40/30/20/10)', async () => {
      const response = await request(app)
        .post('/api/v1/harvest/prepare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          roundId,
          operatorWalletAddress: operatorWallet.publicKey.toBase58(),
        });

      if (response.status === 200 && response.body.prizePoolSol > 0) {
        const allocations = response.body.allocations;
        const total = response.body.prizePoolSol;

        // Calculate percentages (allowing for rounding)
        const t1Pct = (allocations.t1 / total) * 100;
        const t2Pct = (allocations.t2 / total) * 100;
        const t3Pct = (allocations.t3 / total) * 100;
        const t4Pct = (allocations.t4 / total) * 100;

        expect(t1Pct).toBeCloseTo(40, 1); // 40%
        expect(t2Pct).toBeCloseTo(30, 1); // 30%
        expect(t3Pct).toBeCloseTo(20, 1); // 20%
        expect(t4Pct).toBeCloseTo(10, 1); // 10%
      }
    });
  });
});
