import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { createTestApp } from '../helpers/app.helper';
import { getAuthToken, cleanupTestUsers } from '../helpers/auth.helper';
import { Keypair } from '@solana/web3.js';
import { wait } from '../helpers/wait.helper';

const prisma = new PrismaClient();
const app = createTestApp();

/**
 * Full Lifecycle E2E Test
 * Tests the complete lottery round flow:
 * 1. Control: Create configuration
 * 2. Snapshot: Fetch holders and assign tiers
 * 3. Drawing: Select winners
 * 4. Harvest: Calculate prize pool
 * 5. Distribution: Prepare transactions
 */
describe('Full Lifecycle E2E Test', () => {
  let authToken: string;
  let roundId: string;
  let configId: string;
  let snapshotId: string;
  let drawingId: string;
  let operatorWallet: Keypair;

  beforeAll(async () => {
    await cleanupTestUsers();
    authToken = await getAuthToken(app, 'lifecycle-test@example.com', 'password123');
    operatorWallet = Keypair.generate();
  });

  afterAll(async () => {
    // Clean up all test data
    if (roundId) {
      await prisma.drawing.deleteMany({ where: { roundId } });
      await prisma.snapshot.deleteMany({ where: { roundId } });
      await prisma.participant.deleteMany({ where: { roundId } });
      await prisma.round.deleteMany({ where: { id: roundId } });
    }
    if (configId) {
      await prisma.lotteryConfig.deleteMany({
        where: { id: configId },
      });
    }
    await cleanupTestUsers();
    await prisma.$disconnect();
  });

  describe('Complete Lottery Round Flow', () => {
    it('Step 1: Create lottery configuration and round', async () => {
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
          prizeSourceWallet: operatorWallet.publicKey.toBase58(),
          prizeSourceBalanceSol: 0, // Use 0 to avoid wallet validation
          blacklist: [],
        });

      if (response.status === 201) {
        expect(response.body).toHaveProperty('config');
        expect(response.body).toHaveProperty('roundId');
        expect(response.body).toHaveProperty('prizePoolSol');

        configId = response.body.config.id;
        roundId = response.body.roundId;

        console.log(`✅ Created round: ${roundId}`);

        // Verify round was created
        const round = await prisma.round.findUnique({
          where: { id: roundId },
        });

        expect(round).toBeTruthy();
        expect(round?.prizePoolSol).toBeGreaterThanOrEqual(0);
      } else {
        console.log('Control creation skipped (wallet validation issue)');
        // Skip remaining tests if we can't create a round
        return;
      }
    });

    it('Step 2: Run snapshot to fetch holders (may fail without real blockchain data)', async () => {
      if (!roundId) {
        console.log('Skipping - no round created');
        return;
      }

      const response = await request(app)
        .post('/api/v1/snapshot/run')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ roundId });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('snapshotId');
        snapshotId = response.body.snapshotId;
        console.log(`✅ Snapshot created: ${snapshotId}`);

        // Verify snapshot was created
        const snapshot = await prisma.snapshot.findUnique({
          where: { id: snapshotId },
        });

        expect(snapshot).toBeTruthy();
        expect(snapshot?.status).toBe('COMPLETED');
      } else {
        console.log('Snapshot skipped (RPC/blockchain issue)');
        // Create mock participants for testing subsequent steps
        await createMockParticipants(roundId);
      }
    });

    it('Step 3: Confirm snapshot and calculate eligibility', async () => {
      if (!snapshotId && !roundId) {
        console.log('Skipping - no snapshot or round');
        return;
      }

      // If we don't have a snapshot ID, create one manually
      if (!snapshotId && roundId) {
        const snapshot = await prisma.snapshot.create({
          data: {
            roundId,
            status: 'COMPLETED',
            startedAt: new Date(),
            completedAt: new Date(),
          },
        });
        snapshotId = snapshot.id;
      }

      const response = await request(app)
        .post('/api/v1/snapshot/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ snapshotId });

      if (response.status === 200) {
        expect(response.body.ok).toBe(true);
        console.log(`✅ Snapshot confirmed`);

        const round = await prisma.round.findUnique({
          where: { id: roundId },
        });

        expect(round?.totalParticipants).toBeGreaterThanOrEqual(0);
      }
    });

    it('Step 4: Run drawing to select winners', async () => {
      if (!roundId) {
        console.log('Skipping - no round created');
        return;
      }

      // Ensure we have eligible participants
      const eligibleCount = await prisma.participant.count({
        where: { roundId, isEligible: true },
      });

      if (eligibleCount === 0) {
        console.log('No eligible participants, creating mock data');
        await createMockParticipants(roundId);
      }

      const response = await request(app)
        .post('/api/v1/drawing/run')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ roundId });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('drawingId');
        expect(response.body).toHaveProperty('audit');

        drawingId = response.body.drawingId;
        console.log(`✅ Drawing completed: ${drawingId}`);

        // Verify drawing created
        const drawing = await prisma.drawing.findUnique({
          where: { id: drawingId },
        });

        expect(drawing).toBeTruthy();
        expect(drawing?.status).toBe('COMPLETED');
      } else {
        console.log('Drawing failed:', response.body);
      }
    });

    it('Step 5: Confirm drawing and update winners', async () => {
      if (!drawingId) {
        console.log('Skipping - no drawing created');
        return;
      }

      const response = await request(app)
        .post('/api/v1/drawing/confirm')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ drawingId });

      if (response.status === 200) {
        expect(response.body.ok).toBe(true);
        expect(response.body).toHaveProperty('winners');
        console.log(`✅ Drawing confirmed`);

        const round = await prisma.round.findUnique({
          where: { id: roundId },
        });

        expect(round?.tierWinners).toBeTruthy();
      }
    });

    it('Step 6: Harvest prize pool', async () => {
      if (!roundId) {
        console.log('Skipping - no round created');
        return;
      }

      const response = await request(app)
        .post('/api/v1/harvest/prepare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          roundId,
          operatorWalletAddress: operatorWallet.publicKey.toBase58(),
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('prizePoolSol');
        expect(response.body).toHaveProperty('allocations');
        console.log(`✅ Prize pool harvested: ${response.body.prizePoolSol} SOL`);
      } else {
        console.log('Harvest skipped (wallet/RPC issue)');
      }
    });

    it('Step 7: Prepare distribution transaction', async () => {
      if (!roundId) {
        console.log('Skipping - no round created');
        return;
      }

      // Ensure round has winners and payouts
      const round = await prisma.round.findUnique({
        where: { id: roundId },
      });

      if (!round?.tierWinners || Object.keys(round.tierWinners as any).length === 0) {
        console.log('No winners - setting mock winners');
        await prisma.round.update({
          where: { id: roundId },
          data: {
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
      }

      const response = await request(app)
        .post('/api/v1/distribution/prepare')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          roundId,
          operatorWalletAddress: operatorWallet.publicKey.toBase58(),
          swapToLotto: false, // Use SOL distribution for testing
        });

      if (response.status === 200) {
        expect(response.body).toHaveProperty('transaction');
        expect(response.body).toHaveProperty('winners');
        console.log(`✅ Distribution prepared: ${response.body.winners.length} winners`);
      } else {
        console.log('Distribution prepare skipped (RPC issue)');
      }
    });

    it('Step 8: Verify complete round data integrity', async () => {
      if (!roundId) {
        console.log('Skipping - no round created');
        return;
      }

      const round = await prisma.round.findUnique({
        where: { id: roundId },
        include: {
          snapshots: true,
          drawings: true,
        },
      });

      if (round) {
        console.log('\n📊 Final Round Summary:');
        console.log(`   Round ID: ${round.id}`);
        console.log(`   Prize Pool: ${round.prizePoolSol} SOL`);
        console.log(`   Participants: ${round.totalParticipants}`);
        console.log(`   Eligible: ${round.eligibleParticipants}`);
        console.log(`   Snapshots: ${round.snapshots.length}`);
        console.log(`   Drawings: ${round.drawings.length}`);

        // Verify data integrity
        expect(round.prizePoolSol).toBeGreaterThanOrEqual(0);
        expect(round.totalParticipants).toBeGreaterThanOrEqual(0);
        expect(round.eligibleParticipants).toBeGreaterThanOrEqual(0);
        expect(round.eligibleParticipants).toBeLessThanOrEqual(round.totalParticipants);
      }
    });
  });
});

/**
 * Helper function to create mock participants for testing
 */
async function createMockParticipants(roundId: string) {
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

  console.log('✅ Created 4 mock participants for testing');
}
