"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// apps/backend/src/routes/control.ts
const express_1 = __importDefault(require("express"));
const requireJwt_1 = require("../middleware/requireJwt");
const prisma_1 = __importDefault(require("../prisma"));
const zodSchemas_1 = require("../utils/zodSchemas");
const client_1 = require("@prisma/client");
const web3_js_1 = require("@solana/web3.js");
const rpc_service_1 = require("../services/rpc.service");
const trading_activity_service_1 = require("../services/trading-activity.service");
const router = express_1.default.Router();
// Basic base58 and length check for Solana addresses
const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
function isLikelySolAddress(s) {
    const len = s?.length ?? 0;
    return typeof s === 'string' && base58Regex.test(s) && len >= 32 && len <= 44;
}
function parseHardBlacklist() {
    const raw = process.env.HARD_BLACKLIST;
    if (!raw)
        return [];
    try {
        // Support JSON array or comma-separated list
        const parsed = raw.trim().startsWith('[') ? JSON.parse(raw) : raw.split(',');
        const list = Array.isArray(parsed) ? parsed : [];
        const cleaned = list
            .map((v) => (typeof v === 'string' ? v.trim() : ''))
            .filter((v) => v.length > 0);
        return Array.from(new Set(cleaned));
    }
    catch (e) {
        console.error('Invalid HARD_BLACKLIST env var. Expect JSON array or comma-separated string.', e);
        return [];
    }
}
router.post('/', requireJwt_1.requireJwt, async (req, res) => {
    try {
        const parsed = zodSchemas_1.lotteryConfigSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: 'Invalid input',
                issues: parsed.error.issues.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                })),
            });
        }
        const { tokenMint, tokenDecimals, snapshotStart, snapshotEnd, drawTime, tradePercentage, minUsdLottoRequired, prizeDistributionPercent, slippageTolerancePercent, blacklist, prizeSourceWallet, prizeSourceBalanceSol, } = parsed.data;
        // ✅ NEW: Validate prize source wallet balance on-chain
        try {
            const rpcService = (0, rpc_service_1.getRPCService)();
            const walletPubkey = new web3_js_1.PublicKey(prizeSourceWallet);
            console.log(`🔍 Validating balance for wallet: ${prizeSourceWallet}`);
            const actualBalanceLamports = await rpcService.getBalance(walletPubkey);
            const actualBalanceSol = actualBalanceLamports / web3_js_1.LAMPORTS_PER_SOL;
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
        }
        catch (walletError) {
            console.error('❌ Failed to validate wallet balance:', walletError);
            return res.status(400).json({
                error: 'Invalid prize source wallet',
                message: walletError instanceof Error ? walletError.message : 'Could not query wallet balance'
            });
        }
        const userId = req?.user?.id;
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
        const combined = Array.from(new Set([...submitted, ...effectiveHard]));
        console.log(`🔒 Blacklist Summary:
       - Hard blacklist (env): ${effectiveHard.length} wallets
       - Control form blacklist: ${submitted.length} wallets
       - Total combined (unique): ${combined.length} wallets`);
        const config = await prisma_1.default.lotteryConfig.create({
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
                status: client_1.ConfigStatus.PENDING,
                createdById: userId,
            },
        });
        // Create a new Round linked to this control window
        const ratio = Math.max(0, Math.min(100, prizeDistributionPercent)) / 100;
        const prizePoolSolRaw = prizeSourceBalanceSol * ratio;
        const prizePoolSol = Number(prizePoolSolRaw.toFixed(6));
        // Get network from environment for tracking
        const network = process.env.SOLANA_NETWORK || 'devnet';
        const round = await prisma_1.default.round.create({
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
        });
        // ✅ CROSS-ROUND BALANCE TRACKING: Inherit previous round's END as START
        // This enables accurate week-over-week trading activity measurement
        try {
            console.log(`\n📋 Setting up START balances for round ${round.id}...`);
            const tradingService = (0, trading_activity_service_1.getTradingActivityService)();
            // Find previous round with END balances
            const previousRoundId = await tradingService.findPreviousRound(round.createdAt, tokenMint);
            if (previousRoundId) {
                // Inherit previous round's END balances as START
                console.log(`   Using cross-round inheritance from previous round`);
                const result = await tradingService.inheritPreviousEndBalances(round.id, previousRoundId);
                console.log(`✅ Inherited ${result.inherited} START balances from previous round\n`);
            }
            else {
                // First round or no previous data - capture fresh START balances
                console.log(`   No previous round found - capturing fresh START balances`);
                await tradingService.captureStartBalances(round.id, tokenMint);
                console.log(`✅ START balances captured successfully\n`);
            }
        }
        catch (balanceError) {
            // Log warning but don't fail the request - this is a non-critical error
            // The round can still be created, but trading activity won't be calculated
            console.warn('⚠️  Failed to set up START balances (non-critical):', balanceError);
            console.warn('   Trading activity calculation may not work for this round');
        }
        return res.status(201).json({ message: 'Config saved', config, effectiveBlacklist: combined, roundId: round.id, prizePoolSol });
    }
    catch (err) {
        console.error('Error in POST /control:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
