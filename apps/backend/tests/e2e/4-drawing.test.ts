import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../helpers/app.helper';
import { getAuthToken, cleanupTestUsers } from '../helpers/auth.helper';
import { Keypair } from '@solana/web3.js';

const prisma = new PrismaClient();
const app = createTestApp();

describe('Drawing Module E2E Tests', () => {
  let authToken: string;
  let roundId: string;
  let drawingId: string;

  beforeAll(async () => {
    // Setup test data
    await cleanupTestUsers();
    authToken = await getAuthToken(app, 'drawing-test@example.com', 'password123');

    // Create a test round with participants
    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const round = await prisma.round.create({
      data: {
        network: process.env.SOLANA_NETWORK || 'devnet',
        startDate: now,
        endDate: futureDate,
        prizePoolSol: 5,
        prizeDistributionPercent: 50,
        prizeSourceWallet: Keypair.generate().publicKey.toBase58(),
        prizeSourceBalanceSol: 10,
        totalParticipants: 4,
        eligibleParticipants: 4,
        tierWinners: {},
        tierPayouts: {},
      },
    });

    roundId = round.id;

    // Create test participants (eligible winners)
    await prisma.participant.createMany({
      data: [
        {
          roundId,
          wallet: Keypair.generate().publicKey.toBase58(),
          tier: 1,
          tokenLottoBalanceEnd: 1000000,
          tokenUsdBalance: 100,
          isEligible: true,
          isWinner: false,
        },
        {
          roundId,
          wallet: Keypair.generate().publicKey.toBase58(),
          tier: 2,
          tokenLottoBalanceEnd: 500000,
          tokenUsdBalance: 50,
          isEligible: true,
          isWinner: false,
        },
        {
          roundId,
          wallet: Keypair.generate().publicKey.toBase58(),
          tier: 3,
          tokenLottoBalanceEnd: 250000,
          tokenUsdBalance: 25,
          isEligible: true,
          isWinner: false,
        },
        {
          roundId,
          wallet: Keypair.generate().publicKey.toBase58(),
          tier: 4,
          tokenLottoBalanceEnd: 100000,
          tokenUsdBalance: 10,
          isEligible: true,
          isWinner: false,
        },
      ],
    });
  });

  afterAll(async () => {
    // Clean up
    await prisma.drawing.deleteMany({ where: { roundId } });
    await prisma.participant.deleteMany({ where: { roundId } });
    await prisma.round.deleteMany({ where: { id: roundId } });
    await cleanupTestUsers();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/drawing/run', () => {
    it('should reject unauthenticated requests', async () => {
      await request(app)
        .post('/api/v1/drawing/run')
        .send({ roundId })
        .expect(401);
    });

    it('should reject drawing with missing roundId', async () => {
      await request(app)
        .post('/api/v1/drawing/run')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('should reject drawing for non-existent round', async () => {
      await request(app)
        .post('/api/v1/drawing/run')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ roundId: 'non-existent-round' })
        .expect(404);
    });

    it('should run drawing and select winners', async () => {
      const response = await request(app)
        .post('/api/v1/drawing/run')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ roundId })
        .expect(200);

      expect(response.body).toHaveProperty('drawingId');
      expect(response.body).toHaveProperty('startedAt');
      expect(response.body).toHaveProperty('completedAt');
      expect(response.body).toHaveProperty('winners');
      expect(response.body).toHaveProperty('audit');

      // Verify audit trail
      expect(response.body.audit).toHaveProperty('seed');
      expect(response.body.audit).toHaveProperty('blockhash');
      expect(response.body.audit).toHaveProperty('slot');

      drawingId = response.body.drawingId;

      // Verify drawing was created in database
      const drawing = await prisma.drawing.findUnique({
        where: { id: drawingId },
      });

      expect(drawing).toBeTruthy();
      expect(drawing?.roundId).toBe(roundId);
      expect(drawing?.status).toBe('COMPLETED');
      expect(drawing?.seed).toBeTruthy();
      expect(drawing?.blockhash).toBeTruthy();
      expect(drawing?.slot).toBeGreaterThan(0);

      // Verify winners were marked in database
      const winners = await prisma.participant.findMany({
        where: { roundId, isWinner: true },
      });

      expect(winners.length).toBeGreaterThan(0);
      expect(winners.length).toBeLessThanOrEqual(4); // Max 4 tiers
    });
  });

  describe('POST /api/v1/drawing/confirm', () => {
    it('should reject unauthenticated requests', async () => {
      await request(app)
        .post('/api/v1/drawing/confirm')
        .send({ drawingId: 'test-id' })
        .expect(401);
    });

    it('should reject confirm with missing drawingId', async () => {
      await request(app)
        .post('/api/v1/drawing/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('should reject confirm for non-existent drawing', async () => {
      await request(app)
        .post('/api/v1/drawing/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ drawingId: 'non-existent-drawing' })
        .expect(404);
    });

    if (drawingId) {
      it('should confirm drawing and update round with winners', async () => {
        const response = await request(app)
          .post('/api/v1/drawing/confirm')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ drawingId })
          .expect(200);

        expect(response.body.ok).toBe(true);
        expect(response.body).toHaveProperty('winners');
        expect(response.body.winners).toHaveProperty('t1');
        expect(response.body.winners).toHaveProperty('t2');
        expect(response.body.winners).toHaveProperty('t3');
        expect(response.body.winners).toHaveProperty('t4');

        // Verify drawing status updated
        const drawing = await prisma.drawing.findUnique({
          where: { id: drawingId },
        });

        expect(drawing?.status).toBe('CONFIRMED');

        // Verify round was updated with winners
        const round = await prisma.round.findUnique({
          where: { id: roundId },
        });

        expect(round?.tierWinners).toBeTruthy();
        expect(round?.drawingDate).toBeTruthy();

        const tierWinners = round?.tierWinners as any;
        const winnerValues = Object.values(tierWinners).filter(w => w !== null);
        expect(winnerValues.length).toBeGreaterThan(0);
      });
    }
  });
});
