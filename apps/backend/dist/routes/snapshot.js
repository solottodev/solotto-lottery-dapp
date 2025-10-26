"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const requireJwt_1 = require("../middleware/requireJwt");
const prisma_1 = __importDefault(require("../prisma"));
const snapshot_service_1 = require("../services/snapshot.service");
const trading_activity_service_1 = require("../services/trading-activity.service");
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
                tieredParticipants: result.participants.filter(p => p.tier !== null).length,
                dustWallets: result.dustWallets,
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
        if (!config) {
            return res.status(404).json({ error: 'Lottery config not found for this round' });
        }
        const minUsdLotto = config.minUsdLottoRequired ?? 50.0;
        const minTradePercent = config.tradePercentage ?? 50;
        console.log(`\n📋 Eligibility Requirements:`);
        console.log(`   - Minimum USD Balance: $${minUsdLotto}`);
        console.log(`   - Minimum Trade Activity: ${minTradePercent}%\n`);
        // ✅ MAINNET FEATURE: Capture END balances and calculate trading activity
        const tradingService = (0, trading_activity_service_1.getTradingActivityService)();
        try {
            console.log('📸 Capturing END balances...');
            await tradingService.captureEndBalances(snap.roundId, config.tokenMint);
            console.log('📊 Calculating trading activity for all participants...');
            await tradingService.updateParticipantEligibility(snap.roundId, minTradePercent);
        }
        catch (activityError) {
            console.error('❌ Failed to calculate trading activity:', activityError);
            return res.status(500).json({
                error: 'Failed to calculate trading activity',
                details: activityError instanceof Error ? activityError.message : String(activityError)
            });
        }
        // Get all participants with updated eligibility scores
        const allParticipants = await prisma_1.default.participant.findMany({
            where: { roundId: snap.roundId }
        });
        // Apply final eligibility rules: BOTH token balance AND trade activity must meet thresholds
        console.log('\n🔍 Final Eligibility Check (USD Balance + Trade Activity):\n');
        // Separate dust wallets from tiered participants for clearer logging
        const dustWallets = allParticipants.filter(p => p.tier === null);
        const tieredParticipants = allParticipants.filter(p => p.tier !== null);
        // Process dust wallets (automatically ineligible) - BATCH UPDATE
        if (dustWallets.length > 0) {
            console.log(`   🗑️  Marking ${dustWallets.length} dust wallets as ineligible...`);
            await prisma_1.default.participant.updateMany({
                where: {
                    id: { in: dustWallets.map(p => p.id) }
                },
                data: { isEligible: false }
            });
            console.log(`   ✅ Processed ${dustWallets.length} dust wallets (marked ineligible)\n`);
        }
        // Process tiered participants (check trading activity) - BATCH UPDATES
        const eligibleIds = [];
        const ineligibleIds = [];
        for (const p of tieredParticipants) {
            const usdBalance = p.tokenUsdBalance ?? 0;
            const tradePercent = p.eligibilityScore ?? 0;
            // ✅ USD threshold already met (since they have a tier)
            // Only need to check trading activity
            const meetsTradeThreshold = tradePercent >= minTradePercent;
            const isEligible = meetsTradeThreshold;
            if (isEligible) {
                eligibleIds.push(p.id);
            }
            else {
                ineligibleIds.push(p.id);
            }
            // Log sample (every 10th participant to reduce noise)
            if (tieredParticipants.indexOf(p) % 10 === 0 || tieredParticipants.indexOf(p) < 5) {
                console.log(`   ${isEligible ? '✅' : '❌'} ${p.wallet.slice(0, 8)}... - ` +
                    `Tier ${p.tier}, Balance: $${usdBalance.toFixed(2)}, ` +
                    `Trade: ${tradePercent.toFixed(1)}% ${meetsTradeThreshold ? '✓' : '✗'}`);
            }
        }
        // Batch update eligible participants
        if (eligibleIds.length > 0) {
            await prisma_1.default.participant.updateMany({
                where: { id: { in: eligibleIds } },
                data: { isEligible: true }
            });
        }
        // Batch update ineligible participants
        if (ineligibleIds.length > 0) {
            await prisma_1.default.participant.updateMany({
                where: { id: { in: ineligibleIds } },
                data: { isEligible: false }
            });
        }
        console.log(`\n   ✅ Processed ${tieredParticipants.length} tiered participants`);
        console.log(`      - Eligible: ${eligibleIds.length}`);
        console.log(`      - Ineligible: ${ineligibleIds.length}`);
        // Count total and eligible participants
        const totalParticipants = allParticipants.length;
        const eligibleParticipants = await prisma_1.default.participant.count({
            where: { roundId: snap.roundId, isEligible: true }
        });
        console.log(`Total participants: ${totalParticipants}, Eligible: ${eligibleParticipants}`);
        // Get tier counts for eligible participants only
        // NOTE: Participants with tier: null (dust wallets) are excluded from groupBy
        const tierCounts = await prisma_1.default.participant.groupBy({
            where: {
                roundId: snap.roundId,
                isEligible: true,
                tier: { not: null } // Explicitly exclude dust wallets
            },
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
            tokenLottoBalanceStart: p.tokenLottoBalanceStart ?? 0, // Balance at round START
            tokenLottoBalanceEnd: p.tokenLottoBalanceEnd ?? 0, // Balance at round END
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
        // Build CSV with all trading activity fields
        const headers = [
            'Round ID',
            'Wallet Address',
            'Participant ID',
            'Round Start Date',
            'Round End Date',
            'Snapshot ID',
            'Snapshot Started At',
            'Snapshot Completed At',
            'Token LOTTO Balance Start',
            'Token LOTTO Balance End',
            'Token USD Balance',
            'Tier',
            'Trading Activity %',
            'Is Eligible',
            'Is Blacklisted',
            'Is Winner'
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
                p.tokenLottoBalanceStart ?? 0, // START balance (from round creation)
                p.tokenLottoBalanceEnd ?? 0, // END balance (determines tier)
                p.tokenUsdBalance ?? 0, // USD value at snapshot time
                p.tier ?? 0,
                p.eligibilityScore ?? 0, // Trading activity percentage
                p.isEligible ? 'TRUE' : 'FALSE',
                'FALSE', // Blacklisted wallets are excluded from participants table
                p.isWinner ? 'TRUE' : 'FALSE'
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
