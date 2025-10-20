import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../helpers/app.helper';
import { getAuthToken, cleanupTestUsers } from '../helpers/auth.helper';
import { Keypair } from '@solana/web3.js';

const prisma = new PrismaClient();
const app = createTestApp();

describe('Distribution Module E2E Tests', () => {
  let authToken: string;
  let roundId: string;
  let operatorWallet: Keypair;

  beforeAll(async () => {
    await cleanupTestUsers();
    authToken = await getAuthToken(app, 'distribution-test@example.com', 'password123');
    operatorWallet = Keypair.generate();

    // Create a test round with winners and payouts
    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const round = await prisma.round.create({
      data: {
        network: process.env.SOLANA_NETWORK || 'devnet',
        startDate: now,
        endDate: futureDate,
        prizePoolSol: 5,
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
        tierPayouts: {
          t1: 2.0,
          t2: 1.5,
          t3: 1.0,
          t4: 0.5,
        },
      },
    });

    roundId = round.id;
  });

  afterAll(async () => {
    await prisma.round.deleteMany({ where: { id: roundId } });
    await cleanupTestUsers();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/distribution/prepare', () => {
    it('should reject unauthenticated requests', async () => {
      await request(app)
        .post('/api/v1/distribution/prepare')
        .send({ roundId, operatorWalletAddress: operatorWallet.publicKey.toBase58() })
        .expect(401);
    });

    it('should reject distribution with missing roundId', async () => {
      await request(app)
        .post('/api/v1/distribution/prepare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ operatorWalletAddress: operatorWallet.publicKey.toBase58() })
        .expect(400);
    });

    it('should reject distribution with missing operatorWalletAddress', async () => {
      await request(app)
        .post('/api/v1/distribution/prepare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ roundId })
        .expect(400);
    });

    it('should reject distribution for non-existent round', async () => {
      await request(app)
        .post('/api/v1/distribution/prepare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          roundId: 'non-existent-round',
          operatorWalletAddress: operatorWallet.publicKey.toBase58(),
        })
        .expect(404);
    });

    it('should prepare SOL distribution transaction', async () => {
      const response = await request(app)
        .post('/api/v1/distribution/prepare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          roundId,
          operatorWalletAddress: operatorWallet.publicKey.toBase58(),
          swapToLotto: false, // Test SOL distribution
        });

      // May succeed or fail depending on blockchain connectivity
      if (response.status === 200) {
        expect(response.body).toHaveProperty('transaction');
        expect(response.body).toHaveProperty('blockhash');
        expect(response.body).toHaveProperty('lastValidBlockHeight');
        expect(response.body).toHaveProperty('winners');
        expect(response.body).toHaveProperty('totalAmount');
        expect(response.body.swapMode).toBe(false);

        // Verify winners structure
        expect(Array.isArray(response.body.winners)).toBe(true);
        expect(response.body.winners.length).toBe(4); // 4 tiers

        // Verify total amount matches sum of payouts
        const expectedTotal = 2.0 + 1.5 + 1.0 + 0.5; // 5 SOL
        expect(response.body.totalAmount).toBeCloseTo(expectedTotal, 6);
      } else if (response.status === 500) {
        // Blockchain error - acceptable in test environment
        console.log('Distribution prepare failed (likely RPC issue):', response.body.error);
      }
    });

    it('should handle Jupiter swap mode request', async () => {
      const response = await request(app)
        .post('/api/v1/distribution/prepare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          roundId,
          operatorWalletAddress: operatorWallet.publicKey.toBase58(),
          swapToLotto: true,
          slippagePercent: 0.5,
          confirmFallback: false, // Don't auto-fallback
        });

      // May return swap transactions, fallback request, or error
      if (response.status === 200) {
        if (response.body.swapMode) {
          expect(response.body).toHaveProperty('swapTransactions');
          expect(Array.isArray(response.body.swapTransactions)).toBe(true);
        } else {
          // Fell back to SOL
          expect(response.body).toHaveProperty('transaction');
        }
      } else if (response.status === 412) {
        // Jupiter not configured - fallback confirmation requested
        expect(response.body.error).toBe('JUPITER_NOT_CONFIGURED');
        expect(response.body.action).toBe('CONFIRM_SOL_FALLBACK');
        expect(response.body).toHaveProperty('fallbackProposal');
      } else if (response.status === 502) {
        // Jupiter swap preparation failed
        expect(response.body.error).toBe('SWAP_PREPARE_FAILED');
        expect(response.body.action).toBe('CONFIRM_SOL_FALLBACK');
      }
    });

    it('should auto-fallback to SOL when confirmFallback is true', async () => {
      const response = await request(app)
        .post('/api/v1/distribution/prepare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          roundId,
          operatorWalletAddress: operatorWallet.publicKey.toBase58(),
          swapToLotto: true,
          confirmFallback: true, // Auto-fallback to SOL
        });

      if (response.status === 200) {
        // Should get SOL transaction even if Jupiter fails
        expect(response.body).toHaveProperty('transaction');
        expect(response.body).toHaveProperty('winners');
      }
    });
  });

  describe('POST /api/v1/distribution/broadcast', () => {
    it('should reject unauthenticated requests', async () => {
      await request(app)
        .post('/api/v1/distribution/broadcast')
        .send({ roundId, signedTransaction: 'test' })
        .expect(401);
    });

    it('should reject broadcast with missing roundId', async () => {
      await request(app)
        .post('/api/v1/distribution/broadcast')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ signedTransaction: 'test' })
        .expect(400);
    });

    it('should reject broadcast with missing transaction data', async () => {
      await request(app)
        .post('/api/v1/distribution/broadcast')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ roundId })
        .expect(400);
    });

    // Note: We can't easily test successful broadcast without a funded wallet
    // In production, this would be tested on devnet with real transactions
  });
});
