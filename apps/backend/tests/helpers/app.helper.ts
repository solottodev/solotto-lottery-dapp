import express, { Express } from 'express';
import cors from 'cors';
import authRouter from '../../src/routes/auth';
import controlRoutes from '../../src/routes/control';
import harvestRoutes from '../../src/routes/harvest';
import distributionRoutes from '../../src/routes/distribution';
import historyRoutes from '../../src/routes/history';
import snapshotRoutes from '../../src/routes/snapshot';
import drawingRoutes from '../../src/routes/drawing';
import transparencyRoutes from '../../src/routes/transparency';

/**
 * Create an Express app instance for testing
 * This mirrors the setup in src/index.ts but doesn't start the server
 */
export function createTestApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // API routes (v1)
  app.use('/api/v1/control', controlRoutes);
  app.use('/api/v1/harvest', harvestRoutes);
  app.use('/api/v1/distribution', distributionRoutes);
  app.use('/api/v1/history', historyRoutes);
  app.use('/api/v1/snapshot', snapshotRoutes);
  app.use('/api/v1/drawing', drawingRoutes);
  app.use('/api/v1/transparency', transparencyRoutes);

  // Auth endpoints (unversioned and versioned)
  app.use('/auth', authRouter);
  app.use('/api/v1/auth', authRouter);

  return app;
}
