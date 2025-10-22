/**
 * @swagger
 * /api/v1/transparency:
 *   get:
 *     summary: Transparency dashboard data
 *     description: |
 *       Public endpoint providing real-time operational transparency:
 *       - Recent lottery operations and drawings
 *       - System health status
 *       - Operator actions audit trail
 *       - Git commit hash for source code verification
 *       - Recent on-chain transactions
 *     tags: [History]
 *     responses:
 *       200:
 *         description: Transparency data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 systemStatus:
 *                   type: object
 *                   properties:
 *                     rpc:
 *                       type: string
 *                       example: healthy
 *                     database:
 *                       type: string
 *                       example: healthy
 *                     alchemy:
 *                       type: string
 *                       example: healthy
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                 sourceCode:
 *                   type: object
 *                   properties:
 *                     repository:
 *                       type: string
 *                       example: https://github.com/solottodev/solotto-lottery-dapp
 *                     backend:
 *                       type: string
 *                       example: https://github.com/solottodev/solotto-lottery-dapp/tree/main/apps/backend
 *                     commitHash:
 *                       type: string
 *                       example: a828d70
 *                     buildDate:
 *                       type: string
 *                       format: date-time
 *                 lastDrawing:
 *                   type: object
 *                   nullable: true
 *                   properties:
 *                     roundId:
 *                       type: string
 *                     drawingDate:
 *                       type: string
 *                       format: date-time
 *                     prizePoolSol:
 *                       type: number
 *                     eligibleParticipants:
 *                       type: integer
 *                     winners:
 *                       type: object
 *                     audit:
 *                       type: object
 *                       properties:
 *                         blockhash:
 *                           type: string
 *                         slot:
 *                           type: integer
 *                 recentOperations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       roundId:
 *                         type: string
 *                       action:
 *                         type: string
 *                         enum: [snapshot, drawing, distribution]
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       status:
 *                         type: string
 *                       details:
 *                         type: object
 *                 onChainTransactions:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       signature:
 *                         type: string
 *                       roundId:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [prize_distribution]
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       solscanUrl:
 *                         type: string
 *       500:
 *         description: Error fetching transparency data
 */
import express from 'express';
import prisma, { prismaRO } from '../prisma';
import { getRPCService } from '../services/rpc.service';
import { getAlchemyClient } from '../services/alchemy.client';

const router = express.Router();

// Helper to handle permission errors
const runQuery = async <T>(query: (client: typeof prisma) => Promise<T>): Promise<T> => {
  try {
    return await query(prismaRO);
  } catch (error) {
    const errorMsg = String((error as any)?.message ?? '');
    if (errorMsg.includes('permission denied') || errorMsg.includes('42501')) {
      console.warn('Permission denied, falling back to primary client');
      return query(prisma);
    }
    throw error;
  }
};

router.get('/', async (_req, res) => {
  try {
    // System health checks
    const systemStatus = {
      rpc: 'unknown',
      database: 'unknown',
      alchemy: 'unknown',
      timestamp: new Date().toISOString()
    };

    // Test database
    try {
      await prismaRO.$queryRaw`SELECT 1`;
      systemStatus.database = 'healthy';
    } catch {
      systemStatus.database = 'unhealthy';
    }

    // Test RPC
    try {
      const rpcService = getRPCService();
      const health = await rpcService.testConnections();

      // Determine status based on which connections are healthy
      if (health.primary.healthy && health.fallback.healthy) {
        systemStatus.rpc = 'healthy';
      } else if (health.primary.healthy || health.fallback.healthy) {
        systemStatus.rpc = 'healthy'; // At least one working is sufficient
      } else {
        systemStatus.rpc = 'unhealthy';
      }
    } catch {
      systemStatus.rpc = 'unhealthy';
    }

    // Test Alchemy (optional, may not be configured)
    try {
      const alchemyClient = getAlchemyClient();
      const healthy = await alchemyClient.testConnection();
      systemStatus.alchemy = healthy ? 'healthy' : 'unhealthy';
    } catch {
      systemStatus.alchemy = 'not configured';
    }

    // Source code information
    const sourceCode = {
      repository: 'https://github.com/solottodev/solotto-lottery-dapp',
      backend: 'https://github.com/solottodev/solotto-lottery-dapp/tree/main/apps/backend',
      commitHash: process.env.GIT_COMMIT_HASH || 'unknown',
      buildDate: process.env.BUILD_DATE || null
    };

    // Get last completed drawing
    let lastDrawing = null;
    try {
      const lastRound = await runQuery(client => client.round.findFirst({
        where: {
          drawingDate: { not: null }
        },
        orderBy: { drawingDate: 'desc' }
      }));

      if (lastRound) {
        // Try to get drawing audit data
        let auditData = null;
        try {
          const drawing = await runQuery(client => client.drawing.findFirst({
            where: { roundId: lastRound.id, status: 'CONFIRMED' },
            orderBy: { completedAt: 'desc' }
          }));
          if (drawing) {
            auditData = {
              blockhash: drawing.blockhash || null,
              slot: drawing.slot || null,
              seed: drawing.seed || null
            };
          }
        } catch (err) {
          console.log('Drawing data unavailable, using limited audit info');
        }

        lastDrawing = {
          roundId: lastRound.id,
          drawingDate: lastRound.drawingDate,
          distributionDate: lastRound.distributionDate,
          prizePoolSol: lastRound.prizePoolSol,
          eligibleParticipants: lastRound.eligibleParticipants,
          winners: lastRound.tierWinners,
          audit: auditData
        };
      }
    } catch (err) {
      console.log('Error fetching last drawing:', err);
    }

    // Recent operations (last 10 snapshots, drawings, distributions)
    const recentOperations: any[] = [];

    // Recent snapshots
    try {
      const recentSnapshots = await runQuery(client => client.snapshot.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
      }));

      for (const snap of recentSnapshots) {
        recentOperations.push({
          roundId: snap.roundId,
          action: 'snapshot',
          timestamp: snap.completedAt || snap.startedAt,
          status: snap.status,
          details: {
            id: snap.id,
            startedAt: snap.startedAt,
            completedAt: snap.completedAt
          }
        });
      }
    } catch (err) {
      console.log('Snapshot data unavailable');
    }

    // Recent drawings
    try {
      const recentDrawings = await runQuery(client => client.drawing.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5
      }));

      for (const draw of recentDrawings) {
        recentOperations.push({
          roundId: draw.roundId,
          action: 'drawing',
          timestamp: draw.completedAt || draw.startedAt,
          status: draw.status,
          details: {
            id: draw.id,
            startedAt: draw.startedAt,
            completedAt: draw.completedAt,
            blockhash: draw.blockhash,
            slot: draw.slot
          }
        });
      }
    } catch (err) {
      console.log('Drawing data unavailable');
    }

    // Recent distributions
    try {
      const recentDistributions = await runQuery(client => client.round.findMany({
        where: {
          distributionDate: { not: null }
        },
        orderBy: { distributionDate: 'desc' },
        take: 5
      }));

      for (const dist of recentDistributions) {
        recentOperations.push({
          roundId: dist.id,
          action: 'distribution',
          timestamp: dist.distributionDate,
          status: 'completed',
          details: {
            prizePoolSol: dist.prizePoolSol,
            winners: dist.tierWinners,
            payouts: dist.tierPayouts
          }
        });
      }
    } catch (err) {
      console.log('Distribution data unavailable');
    }

    // Sort all operations by timestamp
    recentOperations.sort((a, b) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    // Get recent on-chain transactions
    const onChainTransactions: any[] = [];
    try {
      const recentTxRounds = await runQuery(client => client.round.findMany({
        where: {
          distributionDate: { not: null }
        },
        orderBy: { distributionDate: 'desc' },
        take: 10
      }));

      const network = process.env.SOLANA_NETWORK || 'devnet';
      const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;

      for (const round of recentTxRounds) {
        const txSignatures = (round.distributionTxSignatures as any) || [];
        for (const sig of txSignatures) {
          if (sig) {
            onChainTransactions.push({
              signature: sig,
              roundId: round.id,
              type: 'prize_distribution',
              timestamp: round.distributionDate,
              solscanUrl: `https://solscan.io/tx/${sig}${cluster}`
            });
          }
        }
      }
    } catch (err) {
      console.log('Transaction data unavailable');
    }

    return res.json({
      systemStatus,
      sourceCode,
      lastDrawing,
      recentOperations: recentOperations.slice(0, 10), // Limit to 10 most recent
      onChainTransactions: onChainTransactions.slice(0, 10)
    });

  } catch (e) {
    console.error('GET /transparency failed', e);
    return res.status(500).json({
      error: 'Error fetching transparency data',
      details: e instanceof Error ? e.message : String(e)
    });
  }
});

export default router;
