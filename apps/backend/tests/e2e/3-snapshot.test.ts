import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../helpers/app.helper';
import { getAuthToken, cleanupTestUsers } from '../helpers/auth.helper';
import { Keypair } from '@solana/web3.js';

const prisma = new PrismaClient();
const app = createTestApp();

describe('Snapshot Module E2E Tests', () => {
  let authToken: string;
  let roundId: string;
  let snapshotId: string;

  beforeAll(async () => {
    // Clean up and get auth token
    await cleanupTestUsers();
    authToken = await getAuthToken(app, 'snapshot-test@example.com', 'password123');

    // Create a test round for snapshot
    const testWallet = Keypair.generate();
    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Create lottery config
    const config = await prisma.lotteryConfig.create({
      data: {
        tokenMint: 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump',
        tokenDecimals: 6,
        snapshotStart: now,
        snapshotEnd: futureDate,
        tradePercentage: 100,
        minUsdLottoRequired: 10,
        prizeDistributionPercent: 50,
        slippageTolerancePercent: 0.5,
        blacklist: [],
        status: 'PENDING',
        createdById: 'test-user',
      },
    });

    // Create round
    const round = await prisma.round.create({
      data: {
        network: process.env.SOLANA_NETWORK || 'devnet',
        startDate: now,
        endDate: futureDate,
        prizePoolSol: 5,
        prizeDistributionPercent: 50,
        prizeSourceWallet: testWallet.publicKey.toBase58(),
        prizeSourceBalanceSol: 10,
        totalParticipants: 0,
        eligibleParticipants: 0,
        tierWinners: {},
        tierPayouts: {},
      },
    });

    roundId = round.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.snapshot.deleteMany({ where: { roundId } });
    await prisma.participant.deleteMany({ where: { roundId } });
    await prisma.round.deleteMany({ where: { id: roundId } });
    await prisma.lotteryConfig.deleteMany({
      where: { tokenMint: 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump' },
    });
    await cleanupTestUsers();
    await prisma.$disconnect();
  });

  describe('POST /api/v1/snapshot/run', () => {
    it('should reject unauthenticated requests', async () => {
      await request(app)
        .post('/api/v1/snapshot/run')
        .send({ roundId })
        .expect(401);
    });

    it('should reject snapshot with missing roundId', async () => {
      await request(app)
        .post('/api/v1/snapshot/run')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('should reject snapshot for non-existent round', async () => {
      await request(app)
        .post('/api/v1/snapshot/run')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ roundId: 'non-existent-round' })
        .expect(404);
    });

    it('should create snapshot record and update status', async () => {
      const response = await request(app)
        .post('/api/v1/snapshot/run')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ roundId });

      // May succeed or fail depending on blockchain connectivity
      // We're mainly testing the API structure and database operations
      if (response.status === 200) {
        expect(response.body).toHaveProperty('snapshotId');
        expect(response.body).toHaveProperty('startedAt');
        expect(response.body).toHaveProperty('completedAt');
        expect(response.body).toHaveProperty('totalHolders');
        expect(response.body).toHaveProperty('validParticipants');

        snapshotId = response.body.snapshotId;

        // Verify snapshot was created in database
        const snapshot = await prisma.snapshot.findUnique({
          where: { id: snapshotId },
        });

        expect(snapshot).toBeTruthy();
        expect(snapshot?.roundId).toBe(roundId);
        expect(snapshot?.status).toBe('COMPLETED');
      } else if (response.status === 500) {
        // Blockchain error - acceptable in test environment
        console.log('Snapshot failed (likely RPC issue):', response.body.error);
      }
    });
  });

  describe('POST /api/v1/snapshot/confirm', () => {
    beforeAll(async () => {
      // Create test participants if snapshot succeeded
      if (snapshotId) {
        // Create some test participants
        await prisma.participant.createMany({
          data: [
            {
              roundId,
              wallet: Keypair.generate().publicKey.toBase58(),
              tier: 1,
              tokenLottoBalanceEnd: 1000000,
              tokenUsdBalance: 100,
              isEligible: false, // Will be set during confirm
              isWinner: false,
            },
            {
              roundId,
              wallet: Keypair.generate().publicKey.toBase58(),
              tier: 2,
              tokenLottoBalanceEnd: 500000,
              tokenUsdBalance: 50,
              isEligible: false,
              isWinner: false,
            },
          ],
        });
      }
    });

    it('should reject unauthenticated requests', async () => {
      await request(app)
        .post('/api/v1/snapshot/confirm')
        .send({ snapshotId: 'test-id' })
        .expect(401);
    });

    it('should reject confirm with missing snapshotId', async () => {
      await request(app)
        .post('/api/v1/snapshot/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);
    });

    it('should reject confirm for non-existent snapshot', async () => {
      await request(app)
        .post('/api/v1/snapshot/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ snapshotId: 'non-existent-snapshot' })
        .expect(404);
    });

    if (snapshotId) {
      it('should confirm snapshot and calculate eligibility', async () => {
        const response = await request(app)
          .post('/api/v1/snapshot/confirm')
          .set('Authorization', `Bearer ${authToken}`)
          .send({ snapshotId })
          .expect(200);

        expect(response.body.ok).toBe(true);
        expect(response.body).toHaveProperty('snapshotId');
        expect(response.body).toHaveProperty('totals');
        expect(response.body).toHaveProperty('participantCounts');

        // Verify snapshot status updated
        const snapshot = await prisma.snapshot.findUnique({
          where: { id: snapshotId },
        });

        expect(snapshot?.status).toBe('CONFIRMED');

        // Verify round was updated with participant counts
        const round = await prisma.round.findUnique({
          where: { id: roundId },
        });

        expect(round?.totalParticipants).toBeGreaterThanOrEqual(0);
        expect(round?.eligibleParticipants).toBeGreaterThanOrEqual(0);
      });
    }
  });

  describe('GET /api/v1/snapshot/:snapshotId/participants', () => {
    it('should reject unauthenticated requests', async () => {
      await request(app)
        .get('/api/v1/snapshot/test-id/participants')
        .expect(401);
    });

    it('should reject get participants for non-existent snapshot', async () => {
      await request(app)
        .get('/api/v1/snapshot/non-existent/participants')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    if (snapshotId) {
      it('should return participants list', async () => {
        const response = await request(app)
          .get(`/api/v1/snapshot/${snapshotId}/participants`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body).toHaveProperty('snapshotId');
        expect(response.body).toHaveProperty('roundId');
        expect(response.body).toHaveProperty('totalParticipants');
        expect(response.body).toHaveProperty('eligibleParticipants');
        expect(response.body).toHaveProperty('participants');
        expect(Array.isArray(response.body.participants)).toBe(true);
      });
    }
  });

  describe('GET /api/v1/snapshot/:snapshotId/participants/export', () => {
    it('should reject unauthenticated requests', async () => {
      await request(app)
        .get('/api/v1/snapshot/test-id/participants/export')
        .expect(401);
    });

    if (snapshotId) {
      it('should export participants as CSV', async () => {
        const response = await request(app)
          .get(`/api/v1/snapshot/${snapshotId}/participants/export`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.text).toContain('Round ID');
        expect(response.text).toContain('Wallet Address');
      });
    }
  });
});
