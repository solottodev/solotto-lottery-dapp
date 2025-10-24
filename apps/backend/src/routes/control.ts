// apps/backend/src/routes/control.ts
import express from 'express';
import { requireJwt } from '../middleware/requireJwt';
import prisma from '../prisma';
import { lotteryConfigSchema } from '../utils/zodSchemas';
import { ConfigStatus } from '@prisma/client';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getRPCService } from '../services/rpc.service';
import { getTradingActivityService } from '../services/trading-activity.service';


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
        issues: parsed.error.issues.map((e) => ({
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
      prizeDistributionPercent,
      slippageTolerancePercent,
      blacklist,
      prizeSourceWallet,
      prizeSourceBalanceSol,
      lottoUsdPrice, // 🆕 LOTTO price in USD
    } = parsed.data;

    // 💵 Log LOTTO price if provided
    if (lottoUsdPrice) {
      console.log(`💵 LOTTO Price provided: $${lottoUsdPrice} USD`);
    } else {
      console.warn('⚠️  No LOTTO price provided - USD values will be inaccurate');
    }

    // ✅ NEW: Validate prize source wallet balance on-chain
    try {
      const rpcService = getRPCService();
      const walletPubkey = new PublicKey(prizeSourceWallet);

      console.log(`🔍 Validating balance for wallet: ${prizeSourceWallet}`);

      const actualBalanceLamports = await rpcService.getBalance(walletPubkey);
      const actualBalanceSol = actualBalanceLamports / LAMPORTS_PER_SOL;

      console.log(`   User provided: ${prizeSourceBalanceSol} SOL`);
      console.log(`   Actual on-chain: ${actualBalanceSol} SOL`);

      // Allow 0.01 SOL tolerance for transaction fees
      const tolerance = 0.01;
      if (Math.abs(actualBalanceSol - prizeSourceBalanceSol) > tolerance) {
        return res.status(400).json({
          error: 'Prize source wallet balance mismatch',
          provided: prizeSourceBalanceSol,
          actual: actualBalanceSol,
          message: `The wallet balance you provided (${prizeSourceBalanceSol} SOL) does not match the on-chain balance (${actualBalanceSol} SOL)`
        });
      }

      console.log(`✅ Wallet balance validated successfully`);
    } catch (walletError) {
      console.error('❌ Failed to validate wallet balance:', walletError);
      return res.status(400).json({
        error: 'Invalid prize source wallet',
        message: walletError instanceof Error ? walletError.message : 'Could not query wallet balance'
      });
    }

    const userId = (req as any)?.user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // ✅ BLACKLIST SYSTEM: Two-tier approach
    // 1. HARD_BLACKLIST (env var): Permanent blacklist enforced across ALL rounds
    // 2. Control Form blacklist: Per-round blacklist submitted by operator
    // Both lists are merged and deduplicated before snapshot

    // Validate submitted blacklist entries from Control Form (basic check)
    const submitted = Array.isArray(blacklist) ? blacklist : [];
    const invalidSubmitted = submitted.filter((a) => !isLikelySolAddress(a));
    if (invalidSubmitted.length > 0) {
      return res.status(400).json({
        error: 'Invalid blacklist entries',
        addresses: invalidSubmitted,
      });
    }

    // Always-enforced hard blacklist from env (permanently blocks specific wallets)
    const hard = parseHardBlacklist();
    const invalidHard = hard.filter((a) => !isLikelySolAddress(a));
    if (invalidHard.length > 0) {
      console.warn('HARD_BLACKLIST contains invalid entries; they will be ignored:', invalidHard);
    }
    const effectiveHard = hard.filter((a) => isLikelySolAddress(a));

    // Merge: submitted + hardcoded, unique
    // Note: Hard blacklist wallets are ALWAYS included, even if not in form
    const combined = Array.from(new Set<string>([...submitted, ...effectiveHard]));

    console.log(`🔒 Blacklist Summary:
       - Hard blacklist (env): ${effectiveHard.length} wallets
       - Control form blacklist: ${submitted.length} wallets
       - Total combined (unique): ${combined.length} wallets`);

    const config = await prisma.lotteryConfig.create({
      data: {
        tokenMint,
        tokenDecimals,
        snapshotStart: new Date(snapshotStart),
        snapshotEnd: new Date(snapshotEnd),
        ...(drawTime ? { drawTime: new Date(drawTime) } : {}),
        tradePercentage,
        minUsdLottoRequired,
        prizeDistributionPercent,
        slippageTolerancePercent,
        blacklist: combined,
        lottoUsdPrice, // 🆕 Store LOTTO price for USD calculations
        status: ConfigStatus.PENDING,
        createdById: userId,
      },
    });

    // Create a new Round linked to this control window
    const ratio = Math.max(0, Math.min(100, prizeDistributionPercent)) / 100
    const prizePoolSolRaw = prizeSourceBalanceSol * ratio
    const prizePoolSol = Number(prizePoolSolRaw.toFixed(6))

    // Get network from environment for tracking
    const network = process.env.SOLANA_NETWORK || 'devnet'

    const round = await prisma.round.create({
      data: {
        network,
        startDate: new Date(snapshotStart),
        endDate: new Date(snapshotEnd),
        prizePoolSol,
        prizeDistributionPercent,
        prizeSourceWallet,
        prizeSourceBalanceSol,
        totalParticipants: 0,
        eligibleParticipants: 0,
        tierWinners: {},
        tierPayouts: {},
      },
    })

    // ✅ CROSS-ROUND BALANCE TRACKING: Inherit previous round's END as START
    // This enables accurate week-over-week trading activity measurement
    try {
      console.log(`\n📋 Setting up START balances for round ${round.id}...`);
      const tradingService = getTradingActivityService();

      // Find previous round with END balances
      const previousRoundId = await tradingService.findPreviousRound(
        round.createdAt,
        tokenMint
      );

      if (previousRoundId) {
        // Inherit previous round's END balances as START
        console.log(`   Using cross-round inheritance from previous round`);
        const result = await tradingService.inheritPreviousEndBalances(
          round.id,
          previousRoundId
        );
        console.log(`✅ Inherited ${result.inherited} START balances from previous round\n`);
      } else {
        // First round or no previous data - capture fresh START balances
        console.log(`   No previous round found - capturing fresh START balances`);
        await tradingService.captureStartBalances(round.id, tokenMint);
        console.log(`✅ START balances captured successfully\n`);
      }
    } catch (balanceError) {
      // Log warning but don't fail the request - this is a non-critical error
      // The round can still be created, but trading activity won't be calculated
      console.warn('⚠️  Failed to set up START balances (non-critical):', balanceError);
      console.warn('   Trading activity calculation may not work for this round');
    }

    return res.status(201).json({ message: 'Config saved', config, effectiveBlacklist: combined, roundId: round.id, prizePoolSol });
  } catch (err) {
    console.error('Error in POST /control:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
