// apps/backend/src/routes/control.ts
import express from 'express';
import { requireJwt } from '../middleware/requireJwt';
import prisma from '../prisma';
import { lotteryConfigSchema } from '../utils/zodSchemas';
import { ConfigStatus } from '@prisma/client';
import type { ZodIssue } from 'zod';


const router = express.Router();

router.post('/', requireJwt, async (req, res) => {
  try {
    const parsed = lotteryConfigSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: 'Invalid input',
        issues: parsed.error.issues.map((e: ZodIssue) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    const {
      name,
      tokenMint,
      tokenDecimals,
      snapshotStart,
      snapshotEnd,
      drawTime,
      tradePercentage,
      minUsdLottoRequired,
      blacklist,
    } = parsed.data;

    const userId = (req as any)?.user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = await prisma.lotteryConfig.create({
      data: {
        name,
        tokenMint,
        tokenDecimals,
        snapshotStart: new Date(snapshotStart),
        snapshotEnd: new Date(snapshotEnd),
        ...(drawTime ? { drawTime: new Date(drawTime) } : {}),
        tradePercentage,
        minUsdLottoRequired,
        blacklist: Array.isArray(blacklist) ? blacklist : [],
        status: ConfigStatus.PENDING,
        createdById: userId,
      },
    });

    return res.status(201).json({ message: 'Config saved', config });
  } catch (err) {
    console.error('Error in POST /control:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
