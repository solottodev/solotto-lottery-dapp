// apps/backend/src/routes/control.ts
import express from 'express';
import { requireJwt } from '../middleware/requireJwt';
import prisma from '../prisma';
import { lotteryConfigSchema } from '../utils/zodSchemas';
import { ConfigStatus } from '@prisma/client';
import type { ZodIssue } from 'zod';


const router = express.Router();

// Basic base58 and length check for Solana addresses
const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
function isLikelySolAddress(s: string) {
  const len = s?.length ?? 0;
  return typeof s === 'string' && base58Regex.test(s) && len >= 32 && len <= 44;
}

function parseHardBlacklist(): string[] {
  const raw = process.env.HARD_BLACKLIST;
  if (!raw) return [];
  try {
    // Support JSON array or comma-separated list
    const parsed = raw.trim().startsWith('[') ? (JSON.parse(raw) as unknown) : (raw.split(',') as unknown);
    const list = Array.isArray(parsed) ? parsed : [];
    const cleaned = list
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .filter((v) => v.length > 0);
    return Array.from(new Set(cleaned));
  } catch (e) {
    console.error('Invalid HARD_BLACKLIST env var. Expect JSON array or comma-separated string.', e);
    return [];
  }
}

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
      tokenMint,
      tokenDecimals,
      snapshotStart,
      snapshotEnd,
      drawTime,
      tradePercentage,
      minUsdLottoRequired,
      infraAllocationPercent,
      slippageTolerancePercent,
      blacklist,
    } = parsed.data;

    const userId = (req as any)?.user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate submitted blacklist entries (basic check)
    const submitted = Array.isArray(blacklist) ? blacklist : [];
    const invalidSubmitted = submitted.filter((a) => !isLikelySolAddress(a));
    if (invalidSubmitted.length > 0) {
      return res.status(400).json({
        error: 'Invalid blacklist entries',
        addresses: invalidSubmitted,
      });
    }

    // Always-enforced hard blacklist from env
    const hard = parseHardBlacklist();
    const invalidHard = hard.filter((a) => !isLikelySolAddress(a));
    if (invalidHard.length > 0) {
      console.warn('HARD_BLACKLIST contains invalid entries; they will be ignored:', invalidHard);
    }
    const effectiveHard = hard.filter((a) => isLikelySolAddress(a));

    // Union submitted + hardcoded, unique
    const combined = Array.from(new Set<string>([...submitted, ...effectiveHard]));

    const config = await prisma.lotteryConfig.create({
      data: {
        tokenMint,
        tokenDecimals,
        snapshotStart: new Date(snapshotStart),
        snapshotEnd: new Date(snapshotEnd),
        ...(drawTime ? { drawTime: new Date(drawTime) } : {}),
        tradePercentage,
        minUsdLottoRequired,
        infraAllocationPercent,
        slippageTolerancePercent,
        blacklist: combined,
        status: ConfigStatus.PENDING,
        createdById: userId,
      },
    });

    return res.status(201).json({ message: 'Config saved', config, effectiveBlacklist: combined });
  } catch (err) {
    console.error('Error in POST /control:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
