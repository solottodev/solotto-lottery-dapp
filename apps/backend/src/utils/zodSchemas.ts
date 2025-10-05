// apps/backend/src/utils/zodSchemas.ts
import { z } from 'zod';

// Aligned with Prisma model `LotteryConfig` in schema.prisma
export const lotteryConfigSchema = z.object({
  tokenMint: z.string().min(1, 'tokenMint is required'),
  tokenDecimals: z.number().int().min(0).max(12),
  snapshotStart: z.string().datetime({ message: 'snapshotStart must be a valid datetime' }),
  snapshotEnd: z.string().datetime({ message: 'snapshotEnd must be a valid datetime' }),
  drawTime: z.string().datetime().optional(),
  tradePercentage: z.number().min(0).max(100),
  minUsdLottoRequired: z.number().min(0, 'Minimum USD holding must be non-negative'),
  infraAllocationPercent: z.number().min(0).max(100),
  slippageTolerancePercent: z.number().min(0).max(100),
  blacklist: z.array(z.string().min(1)).optional().default([]),
});
