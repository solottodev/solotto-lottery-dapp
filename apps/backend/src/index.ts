import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';

import authRouter from "./routes/auth";
import protectedRouter from "./routes/protected";
import controlRoutes from './routes/control';
import harvestRoutes from './routes/harvest';
import distributionRoutes from './routes/distribution';
import historyRoutes from './routes/history';
import snapshotRoutes from './routes/snapshot';
import drawingRoutes from './routes/drawing';
import transparencyRoutes from './routes/transparency';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// API Documentation
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Solotto API Documentation',
  customfavIcon: '/favicon.ico'
}));

// Versioned API (v1)
app.use('/api/v1/control', controlRoutes);
app.use('/api/v1/harvest', harvestRoutes);
app.use('/api/v1/distribution', distributionRoutes);
app.use('/api/v1/history', historyRoutes);
app.use('/api/v1/snapshot', snapshotRoutes);
app.use('/api/v1/drawing', drawingRoutes);
app.use('/api/v1/transparency', transparencyRoutes);

// Keep auth endpoints unversioned for now (can add /api/v1 later)
app.use("/auth", authRouter);
app.use('/api/v1/auth', authRouter);
app.use("/protected", protectedRouter);

// Basic health route
import { prismaRO } from './prisma';
import { getRPCService } from './services/rpc.service';
import { getJupiterService } from './services/jupiter.service';
import { getAlchemyClient } from './services/alchemy.client';

/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: System health check
 *     description: Verifies backend services are operational (database connectivity)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 database:
 *                   type: string
 *                   example: healthy
 *       500:
 *         description: System is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 database:
 *                   type: string
 *                   example: unhealthy
 */
app.get('/api/v1/health', async (_req, res) => {
  try {
    await prismaRO.$queryRaw`SELECT 1`;
    return res.json({ ok: true, database: 'healthy' });
  } catch (e) {
    console.error('Health check failed', e);
    return res.status(500).json({ ok: false, database: 'unhealthy' });
  }
});

/**
 * @swagger
 * /api/v1/health/rpc:
 *   get:
 *     summary: RPC connection health check
 *     description: Tests primary and fallback Solana RPC connections
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: RPC connection status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 connections:
 *                   type: object
 *                   properties:
 *                     primary:
 *                       type: object
 *                       properties:
 *                         healthy:
 *                           type: boolean
 *                         endpoint:
 *                           type: string
 *                     fallback:
 *                       type: object
 *                       properties:
 *                         healthy:
 *                           type: boolean
 *                         endpoint:
 *                           type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: RPC health check failed
 */
app.get('/api/v1/health/rpc', async (_req, res) => {
  try {
    const rpcService = getRPCService();
    const health = await rpcService.testConnections();

    const allHealthy = health.primary.healthy && health.fallback.healthy;

    return res.json({
      ok: allHealthy,
      connections: health,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('RPC health check failed', e);
    return res.status(500).json({ ok: false, error: 'RPC health check failed' });
  }
});

/**
 * @swagger
 * /api/v1/health/alchemy:
 *   get:
 *     summary: Alchemy API health check
 *     description: Tests connection to Alchemy Enhanced API for pricing data
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Alchemy connection status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Alchemy not configured or unhealthy
 */
app.get('/api/v1/health/alchemy', async (_req, res) => {
  try {
    const alchemyClient = getAlchemyClient();
    const healthy = await alchemyClient.testConnection();

    return res.json({
      ok: healthy,
      timestamp: new Date().toISOString()
    });
  } catch (e) {
    console.error('Alchemy health check failed', e);
    return res.status(500).json({ ok: false, error: 'Alchemy not configured or unhealthy' });
  }
});

/**
 * @swagger
 * /api/v1/health/jupiter:
 *   get:
 *     summary: Jupiter API health check
 *     description: Checks Jupiter configuration and DNS resolution for the API host
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Jupiter health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 configured:
 *                   type: boolean
 *                 diagnostics:
 *                   type: object
 *       500:
 *         description: Jupiter health check failed
 */
app.get('/api/v1/health/jupiter', async (_req, res) => {
  try {
    const jupiter = getJupiterService();
    const diag = await jupiter.diagnostics();
    const ok = diag.dns.ok;
    return res.json({ ok, configured: diag.configured, diagnostics: diag, timestamp: new Date().toISOString() });
  } catch (e) {
    console.error('Jupiter health check failed', e);
    return res.status(500).json({ ok: false, error: 'Jupiter health check failed' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
