import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRouter from "./routes/auth";
import protectedRouter from "./routes/protected";
import controlRoutes from './routes/control';
import harvestRoutes from './routes/harvest';
import distributionRoutes from './routes/distribution';
import historyRoutes from './routes/history';
import snapshotRoutes from './routes/snapshot';
import drawingRoutes from './routes/drawing';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Versioned API (v1)
app.use('/api/v1/control', controlRoutes);
app.use('/api/v1/harvest', harvestRoutes);
app.use('/api/v1/distribution', distributionRoutes);
app.use('/api/v1/history', historyRoutes);
app.use('/api/v1/snapshot', snapshotRoutes);
app.use('/api/v1/drawing', drawingRoutes);

// Keep auth endpoints unversioned for now (can add /api/v1 later)
app.use("/auth", authRouter);
app.use('/api/v1/auth', authRouter);
app.use("/protected", protectedRouter);

// Basic health route
import { prismaRO } from './prisma';
import { getRPCService } from './services/rpc.service';
import { getAlchemyClient } from './services/alchemy.client';

app.get('/api/v1/health', async (_req, res) => {
  try {
    await prismaRO.$queryRaw`SELECT 1`;
    return res.json({ ok: true, database: 'healthy' });
  } catch (e) {
    console.error('Health check failed', e);
    return res.status(500).json({ ok: false, database: 'unhealthy' });
  }
});

// RPC health check
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

// Alchemy health check
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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
