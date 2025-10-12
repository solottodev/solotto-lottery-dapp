"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lotteryConfigSchema = void 0;
// apps/backend/src/utils/zodSchemas.ts
const zod_1 = require("zod");
// Aligned with Prisma model `LotteryConfig` in schema.prisma
exports.lotteryConfigSchema = zod_1.z.object({
    tokenMint: zod_1.z.string().min(1, 'tokenMint is required'),
    tokenDecimals: zod_1.z.number().int().min(0).max(12),
    snapshotStart: zod_1.z.string().datetime({ message: 'snapshotStart must be a valid datetime' }),
    snapshotEnd: zod_1.z.string().datetime({ message: 'snapshotEnd must be a valid datetime' }),
    drawTime: zod_1.z.string().datetime().optional(),
    tradePercentage: zod_1.z.number().min(0).max(100),
    minUsdLottoRequired: zod_1.z.number().min(0, 'Minimum USD holding must be non-negative'),
    prizeDistributionPercent: zod_1.z.number().min(0).max(100),
    slippageTolerancePercent: zod_1.z.number().min(0).max(100),
    blacklist: zod_1.z.array(zod_1.z.string().min(1)).optional().default([]),
    prizeSourceWallet: zod_1.z.string().min(1, 'Source wallet is required'),
    prizeSourceBalanceSol: zod_1.z.number().min(0, 'Source balance must be non-negative'),
});
