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
import prisma, { prismaRO } from './prisma';
app.get('/api/v1/health', async (_req, res) => {
  try {
    await prismaRO.$queryRaw`SELECT 1`;
    return res.json({ ok: true });
  } catch (e) {
    console.error('Health check failed', e);
    return res.status(500).json({ ok: false });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
