"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const requireJwt_1 = require("../middleware/requireJwt");
const prisma_1 = __importDefault(require("../prisma"));
const snapshot_service_1 = require("../services/snapshot.service");
const router = express_1.default.Router();
// POST /snapshot/run { roundId }
router.post('/run', requireJwt_1.requireJwt, async (req, res) => {
    try {
        const { roundId } = req.body || {};
        if (!roundId)
            return res.status(400).json({ error: 'Missing roundId' });
        // Get the round to access dates
        const round = await prisma_1.default.round.findUnique({ where: { id: roundId } });
        if (!round)
            return res.status(404).json({ error: 'Round not found' });
        // Get the lottery config for this round
        const config = await prisma_1.default.lotteryConfig.findFirst({
            where: {
                snapshotStart: round.startDate,
                snapshotEnd: round.endDate,
            },
            orderBy: { createdAt: 'desc' },
        });
        if (!config) {
            return res.status(404).json({ error: 'Lottery config not found for this round' });
        }
        // Create snapshot record with RUNNING status
        const snap = await prisma_1.default.snapshot.create({
            data: { roundId, status: 'RUNNING', startedAt: new Date() },
        });
        console.log(`\n🚀 Starting snapshot ${snap.id} for round ${roundId}`);
        try {
            // Get snapshot service
            const snapshotService = (0, snapshot_service_1.getSnapshotService)();
            // Parse blacklist from config
            const blacklist = Array.isArray(config.blacklist)
                ? config.blacklist
                : [];
            // Create snapshot by querying blockchain
            const result = await snapshotService.createSnapshot(roundId, config.tokenMint, blacklist);
            // Update snapshot to COMPLETED
            const completed = await prisma_1.default.snapshot.update({
                where: { id: snap.id },
                data: { status: 'COMPLETED', completedAt: new Date() },
            });
            console.log(`✅ Snapshot ${snap.id} completed successfully`);
            return res.json({
                snapshotId: completed.id,
                startedAt: completed.startedAt,
                completedAt: completed.completedAt,
                totalHolders: result.totalHolders,
                blacklisted: result.blacklisted,
                validParticipants: result.participants.length,
                participantCounts: result.tierCounts,
            });
        }
        catch (snapshotError) {
            // Update snapshot to IDLE (failed)
            await prisma_1.default.snapshot.update({
                where: { id: snap.id },
                data: { status: 'IDLE' },
            });
            console.error('❌ Snapshot failed:', snapshotError);
            throw snapshotError;
        }
    }
    catch (e) {
        console.error('snapshot/run failed', e);
        return res.status(500).json({
            error: 'Internal server error',
            details: e instanceof Error ? e.message : String(e)
        });
    }
});
// POST /snapshot/confirm { snapshotId }
router.post('/confirm', requireJwt_1.requireJwt, async (req, res) => {
    try {
        const { snapshotId } = req.body || {};
        if (!snapshotId)
            return res.status(400).json({ error: 'Missing snapshotId' });
        const snap = await prisma_1.default.snapshot.findUnique({ where: { id: snapshotId } });
        if (!snap)
            return res.status(404).json({ error: 'Snapshot not found' });
        // Get the round to access control requirements
        const round = await prisma_1.default.round.findUnique({ where: { id: snap.roundId } });
        if (!round)
            return res.status(404).json({ error: 'Round not found' });
        // Get the lottery config for this round to check requirements
        const config = await prisma_1.default.lotteryConfig.findFirst({
            where: {
                snapshotStart: round.startDate,
                snapshotEnd: round.endDate,
            },
            orderBy: { createdAt: 'desc' },
        });
        const minUsdLotto = config?.minUsdLottoRequired ?? 50.0;
        const minTradePercent = config?.tradePercentage ?? 0;
        console.log(`Eligibility requirements: minUsdLotto=${minUsdLotto}, minTradePercent=${minTradePercent}`);
        // Get all participants and calculate eligibility
        const allParticipants = await prisma_1.default.participant.findMany({ where: { roundId: snap.roundId } });
        // Calculate eligibility for each participant
        // Two-part eligibility check:
        // 1. USD Balance: tokenUsdBalance >= minUsdLotto (e.g., $50)
        // 2. Trading Activity: Balance change >= minTradePercent (e.g., 50%)
        for (const p of allParticipants) {
            const usdBalance = p.tokenUsdBalance ?? p.tokenLottoBalanceEnd ?? 0;
            const startBalance = p.tokenLottoBalanceStart ?? 0;
            const endBalance = p.tokenLottoBalanceEnd ?? 0;
            // Calculate trading activity percentage
            // tradePercent = |((end - start) / start)| × 100
            let tradePercent = 0;
            if (startBalance > 0) {
                tradePercent = Math.abs((endBalance - startBalance) / startBalance) * 100;
            }
            else if (endBalance > 0) {
                // If start balance is 0 but end balance exists, treat as 100% increase
                tradePercent = 100;
            }
            // ⚠️ DEVNET TESTING NOTE ⚠️
            // Currently, startBalance === endBalance (we don't fetch historical data yet)
            // So tradePercent will be 0 for most wallets unless we implement:
            // 1. Historical balance fetching at round START date
            // 2. Current balance fetching at round END date
            //
            // For devnet testing, if eligibilityScore is null and balance exists, assume 100%
            if (p.eligibilityScore === null && endBalance > 0) {
                tradePercent = 100; // DEVNET ONLY: Assume trading activity
                console.log(`  🧪 DEVNET: ${p.wallet.slice(0, 8)}... assumed 100% trade activity`);
            }
            else {
                console.log(`  📊 ${p.wallet.slice(0, 8)}... calculated ${tradePercent.toFixed(2)}% trade activity (${startBalance} → ${endBalance})`);
            }
            // Check both eligibility criteria
            const meetsUsdThreshold = usdBalance >= minUsdLotto;
            const meetsTradeThreshold = tradePercent >= minTradePercent;
            const isEligible = meetsUsdThreshold && meetsTradeThreshold;
            console.log(`  ${isEligible ? '✅' : '❌'} ${p.wallet.slice(0, 8)}... - USD: $${usdBalance.toFixed(2)} ${meetsUsdThreshold ? '✓' : '✗'}, Trade: ${tradePercent.toFixed(1)}% ${meetsTradeThreshold ? '✓' : '✗'}`);
            await prisma_1.default.participant.update({
                where: { id: p.id },
                data: {
                    isEligible,
                    eligibilityScore: tradePercent, // Store calculated trading % for audit
                },
            });
        }
        // Count total and eligible participants
        const totalParticipants = allParticipants.length;
        const eligibleParticipants = await prisma_1.default.participant.count({
            where: { roundId: snap.roundId, isEligible: true }
        });
        console.log(`Total participants: ${totalParticipants}, Eligible: ${eligibleParticipants}`);
        // Get tier counts for eligible participants only
        const tierCounts = await prisma_1.default.participant.groupBy({
            where: { roundId: snap.roundId, isEligible: true },
            by: ['tier'],
            _count: { _all: true },
        });
        const participantCounts = {
            t1: tierCounts.find(t => t.tier === 1)?._count._all ?? 0,
            t2: tierCounts.find(t => t.tier === 2)?._count._all ?? 0,
            t3: tierCounts.find(t => t.tier === 3)?._count._all ?? 0,
            t4: tierCounts.find(t => t.tier === 4)?._count._all ?? 0,
        };
        console.log('Snapshot confirm - eligibleParticipantCounts:', participantCounts);
        await prisma_1.default.round.update({
            where: { id: snap.roundId },
            data: { totalParticipants, eligibleParticipants },
        });
        await prisma_1.default.snapshot.update({ where: { id: snapshotId }, data: { status: 'CONFIRMED' } });
        const updatedRound = await prisma_1.default.round.findUnique({ where: { id: snap.roundId } });
        const response = {
            ok: true,
            snapshotId,
            totals: { total: updatedRound?.totalParticipants, eligible: updatedRound?.eligibleParticipants },
            participantCounts
        };
        console.log('Snapshot confirm - response:', JSON.stringify(response, null, 2));
        return res.json(response);
    }
    catch (e) {
        console.error('snapshot/confirm failed', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /snapshot/:snapshotId/participants - Get all participants as JSON
router.get('/:snapshotId/participants', requireJwt_1.requireJwt, async (req, res) => {
    try {
        const { snapshotId } = req.params;
        if (!snapshotId)
            return res.status(400).json({ error: 'Missing snapshotId' });
        const snap = await prisma_1.default.snapshot.findUnique({ where: { id: snapshotId } });
        if (!snap)
            return res.status(404).json({ error: 'Snapshot not found' });
        const participants = await prisma_1.default.participant.findMany({
            where: { roundId: snap.roundId },
            orderBy: [
                { tier: 'asc' },
                { tokenLottoBalanceEnd: 'desc' }
            ]
        });
        // Get round info for drawing date
        const round = await prisma_1.default.round.findUnique({ where: { id: snap.roundId } });
        const participantList = participants.map(p => ({
            roundId: snap.roundId,
            wallet: p.wallet,
            tokenLottoBalance: p.tokenLottoBalanceEnd ?? 0,
            tokenUsdBalance: p.tokenUsdBalance ?? 0,
            assignedTier: p.tier,
            tradingActivityPercent: p.eligibilityScore ?? 0, // Calculated from start/end balances
            isEligible: p.isEligible,
            isWinner: p.isWinner,
            drawingDate: round?.drawingDate ?? null,
            distributionTransaction: null // Will be populated after distribution
        }));
        return res.json({
            snapshotId,
            roundId: snap.roundId,
            totalParticipants: participants.length,
            eligibleParticipants: participants.filter(p => p.isEligible).length,
            participants: participantList
        });
    }
    catch (e) {
        console.error('snapshot/:snapshotId/participants failed', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /snapshot/:snapshotId/participants/export - Export participants as CSV
router.get('/:snapshotId/participants/export', requireJwt_1.requireJwt, async (req, res) => {
    try {
        const { snapshotId } = req.params;
        if (!snapshotId)
            return res.status(400).json({ error: 'Missing snapshotId' });
        const snap = await prisma_1.default.snapshot.findUnique({ where: { id: snapshotId } });
        if (!snap)
            return res.status(404).json({ error: 'Snapshot not found' });
        const participants = await prisma_1.default.participant.findMany({
            where: { roundId: snap.roundId },
            orderBy: [
                { tier: 'asc' },
                { tokenLottoBalanceEnd: 'desc' }
            ]
        });
        // Get round info for drawing date
        const round = await prisma_1.default.round.findUnique({ where: { id: snap.roundId } });
        // Build CSV
        const headers = [
            'Round ID',
            'Wallet Address',
            'Participant ID',
            'Round Start Date',
            'Round End Date',
            'Snapshot ID',
            'Snapshot Started At',
            'Snapshot Completed At',
            'Token LOTTO Balance',
            'Token USD Balance',
            'Tier',
            'Eligibility Score',
            'Is Eligible',
            'Is Blacklisted'
        ];
        const rows = participants.map(p => {
            return [
                snap.roundId,
                p.wallet,
                p.id,
                round?.startDate?.toISOString() || '',
                round?.endDate?.toISOString() || '',
                snap.id,
                snap.startedAt?.toISOString() || '',
                snap.completedAt?.toISOString() || '',
                p.tokenLottoBalanceEnd ?? 0, // END balance determines tier
                p.tokenUsdBalance ?? 0,
                p.tier ?? 0,
                p.eligibilityScore ?? 0, // Trading activity %
                p.isEligible ? 'TRUE' : 'FALSE',
                'FALSE' // Blacklisted wallets are excluded from participants table
            ];
        });
        // Convert to CSV format
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => {
                // Escape cells containing commas or quotes
                const cellStr = String(cell);
                if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                    return `"${cellStr.replace(/"/g, '""')}"`;
                }
                return cellStr;
            }).join(','))
        ].join('\n');
        // Generate filename with date: solotto_snapshot_YYYY-MM-DD.csv
        const dateStr = snap.completedAt
            ? snap.completedAt.toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0];
        const filename = `solotto_snapshot_${dateStr}.csv`;
        // Set response headers for file download
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(csvContent);
    }
    catch (e) {
        console.error('snapshot/:snapshotId/participants/export failed', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
