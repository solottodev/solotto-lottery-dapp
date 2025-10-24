"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const prisma_1 = __importStar(require("../prisma"));
const requireJwt_1 = require("../middleware/requireJwt");
const router = express_1.default.Router();
const runParticipantQuery = async (runner) => {
    try {
        return await runner(prisma_1.prismaRO);
    }
    catch (error) {
        if (isParticipantPermissionError(error)) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn('Participant query fallback to primary client:', message);
            return runner(prisma_1.default);
        }
        throw error;
    }
};
const isParticipantPermissionError = (error) => {
    if (!error)
        return false;
    const info = String(error?.message ?? '') + String(error?.cause?.message ?? '');
    return info.includes('permission denied for table') || info.includes('42501');
};
// GET /history/stats - dashboard statistics with network filtering
router.get('/stats', async (req, res) => {
    try {
        // Get network from environment or query parameter
        const network = process.env.SOLANA_NETWORK || 'devnet';
        // Build where clause for network filtering
        const where = {
            network,
            drawingDate: { not: null } // Only count completed rounds
        };
        // Get all rounds for this network to calculate aggregate stats
        const rounds = await prisma_1.prismaRO.round.findMany({
            where,
            select: {
                prizePoolSol: true,
                tierPayouts: true,
            }
        });
        // Calculate metrics
        const totalRounds = rounds.length;
        // Calculate total SOL distributed (sum of all tier payouts)
        let totalSolDistributed = 0;
        rounds.forEach(round => {
            const payouts = round.tierPayouts || {};
            totalSolDistributed += (payouts.t1 || 0) + (payouts.t2 || 0) + (payouts.t3 || 0) + (payouts.t4 || 0);
        });
        // Calculate total winners (count participants where isWinner = true for this network's rounds)
        const roundIds = await prisma_1.prismaRO.round.findMany({
            where,
            select: { id: true }
        });
        const totalWinners = await prisma_1.prismaRO.participant.count({
            where: {
                roundId: { in: roundIds.map(r => r.id) },
                isWinner: true
            }
        });
        // Calculate average prize pool
        const avgPrizePool = totalRounds > 0
            ? rounds.reduce((sum, r) => sum + (r.prizePoolSol || 0), 0) / totalRounds
            : 0;
        return res.json({
            network,
            totalRounds,
            totalSolDistributed: parseFloat(totalSolDistributed.toFixed(4)),
            totalWinners,
            avgPrizePool: parseFloat(avgPrizePool.toFixed(4)),
            lastUpdated: new Date().toISOString()
        });
    }
    catch (e) {
        console.error('GET /history/stats failed', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /history/rounds - recent rounds list
router.get('/rounds', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1')) || 1);
        const size = Math.max(1, Math.min(100, parseInt(String(req.query.size || '20')) || 20));
        const skip = (page - 1) * size;
        const [total, rounds] = await Promise.all([
            prisma_1.prismaRO.round.count(),
            // Sort by drawingDate desc (most recent first), nulls last, then createdAt desc as fallback
            prisma_1.prismaRO.round.findMany({
                orderBy: [
                    { drawingDate: { sort: 'desc', nulls: 'last' } },
                    { createdAt: 'desc' }
                ],
                skip,
                take: size
            }),
        ]);
        return res.json({ rounds, meta: { page, size, total, pages: Math.ceil(total / size) } });
    }
    catch (e) {
        console.error('GET /history/rounds failed', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /history/round/:id - round detail (public)
router.get('/round/:id', async (req, res) => {
    const id = String(req.params.id || '');
    if (!id)
        return res.status(400).json({ error: 'Missing id' });
    try {
        const round = await prisma_1.prismaRO.round.findUnique({ where: { id } });
        if (!round)
            return res.status(404).json({ error: 'Not found' });
        const winners = round.tierWinners || {};
        const payouts = round.tierPayouts || {};
        // Load all participants so downstream exports see full counts
        const participants = await prisma_1.prismaRO.participant.findMany({
            where: { roundId: id },
            orderBy: [{ tier: 'asc' }, { wallet: 'asc' }],
        });
        const audit = {
            txSignatures: round.distributionTxSignatures || [],
            ataAddresses: round.distributionAtaAddresses || {},
            swapToLotto: round.swapToLotto,
            swapRouteId: round.swapRouteId,
            swapSlippage: round.swapSlippage,
        };
        return res.json({ round, winners, payouts, participants, audit });
    }
    catch (e) {
        console.error('GET /history/round/:id failed', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /history/wallet/:address - all entries for a wallet across rounds
router.get('/wallet/:address', async (req, res) => {
    const address = String(req.params.address || '').trim();
    if (!address)
        return res.status(400).json({ error: 'Missing address' });
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1')) || 1);
        const size = Math.max(1, Math.min(100, parseInt(String(req.query.size || '20')) || 20));
        const skip = (page - 1) * size;
        const where = { wallet: address };
        const [total, entries] = await Promise.all([
            prisma_1.prismaRO.participant.count({ where }),
            prisma_1.prismaRO.participant.findMany({ where, orderBy: { createdAt: 'desc' }, include: { Round: true }, skip, take: size }),
        ]);
        return res.json({ address, entries, meta: { page, size, total, pages: Math.ceil(total / size) } });
    }
    catch (e) {
        console.error('GET /history/wallet failed', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /history/export - CSV of rounds
router.get('/export', async (_req, res) => {
    try {
        const rounds = await prisma_1.prismaRO.round.findMany({ orderBy: { createdAt: 'desc' } });
        const headers = [
            'Round ID',
            'Round Start Date',
            'Round End Date',
            'Drawing Date',
            'Distribution Date',
            'Prize Pool (SOL)',
            'Prize Distribution %',
            'Prize Source Wallet',
            'Prize Source Balance (SOL)',
            'Total Participants',
            'Eligible Participants',
            'Tier',
            'Prize Tier Won',
            'Wallet Address',
            'Prize Amount (SOL)',
            'Tier 1 Payout (SOL)',
            'Tier 2 Payout (SOL)',
            'Tier 3 Payout (SOL)',
            'Tier 4 Payout (SOL)',
            'Transaction Signature'
        ];
        const rows = [];
        for (const r of rounds) {
            const winners = r.tierWinners || {};
            const payouts = r.tierPayouts || {};
            const txSignatures = r.distributionTxSignatures || [];
            const tiers = ['t1', 't2', 't3', 't4'];
            for (let i = 0; i < tiers.length; i++) {
                const t = tiers[i];
                rows.push([
                    r.id,
                    r.startDate?.toISOString?.() || '',
                    r.endDate?.toISOString?.() || '',
                    r.drawingDate?.toISOString?.() || '',
                    r.distributionDate?.toISOString?.() || '',
                    String(r.prizePoolSol ?? ''),
                    String(r.prizeDistributionPercent ?? ''),
                    r.prizeSourceWallet || '',
                    String(r.prizeSourceBalanceSol ?? ''),
                    String(r.totalParticipants ?? 0),
                    String(r.eligibleParticipants ?? 0),
                    t.toUpperCase(),
                    winners?.[t] ? `TIER ${i + 1}` : '',
                    winners?.[t] || '',
                    payouts?.[t]?.toString?.() || '',
                    String(payouts?.t1 ?? ''),
                    String(payouts?.t2 ?? ''),
                    String(payouts?.t3 ?? ''),
                    String(payouts?.t4 ?? ''),
                    txSignatures[i] || '',
                ]);
            }
        }
        const csv = [headers, ...rows]
            .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        // Generate filename with date: solotto_rounds_YYYY-MM-DD.csv
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `solotto_rounds_${dateStr}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(csv);
    }
    catch (e) {
        console.error('GET /history/export failed', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /history/export/participants - CSV of all participants
router.get('/export/participants', async (_req, res) => {
    try {
        const participants = await prisma_1.prismaRO.participant.findMany({ include: { Round: true } });
        const headers = [
            'Round ID',
            'Participant ID',
            'Wallet Address',
            'Round Start Date',
            'Round End Date',
            'Drawing Date',
            'Token LOTTO Balance',
            'Token USD Balance',
            'Tier',
            'Eligibility Score',
            'Is Eligible',
            'Is Winner',
            'Is Blacklisted'
        ];
        const rows = participants.map((p) => [
            p.roundId,
            p.id,
            p.wallet,
            p.Round?.startDate?.toISOString?.() || '',
            p.Round?.endDate?.toISOString?.() || '',
            p.Round?.drawingDate?.toISOString?.() || '',
            p.tokenLottoBalanceEnd?.toString?.() || '',
            p.tokenUsdBalance?.toString?.() || '',
            p.tier?.toString?.() || '',
            p.eligibilityScore?.toString?.() || '', // Trading activity %
            p.isEligible ? 'TRUE' : 'FALSE',
            p.isWinner ? 'TRUE' : 'FALSE',
            'FALSE', // Blacklisted wallets are excluded from participants table
        ]);
        const csv = [headers, ...rows]
            .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        // Generate filename with date: solotto_participants_YYYY-MM-DD.csv
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `solotto_participants_${dateStr}.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(csv);
    }
    catch (e) {
        console.error('GET /history/export/participants failed', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ADMIN: Export JSON of rounds (+ participants)
router.get('/admin/export/json', requireJwt_1.requireJwt, async (req, res) => {
    try {
        const roundId = req.query.roundId ? String(req.query.roundId) : null;
        const rounds = roundId
            ? await prisma_1.default.round.findMany({ where: { id: roundId }, orderBy: { createdAt: 'desc' } })
            : await prisma_1.default.round.findMany({ orderBy: { createdAt: 'desc' } });
        const roundIds = rounds.map((r) => r.id);
        const participants = await prisma_1.default.participant.findMany({ where: { roundId: { in: roundIds } } });
        return res.json({ rounds, participants });
    }
    catch (e) {
        console.error('GET /history/admin/export/json failed', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// ADMIN: Import JSON of rounds and participants
router.post('/admin/import/json', requireJwt_1.requireJwt, async (req, res) => {
    try {
        const { rounds = [], participants = [] } = req.body || {};
        // Basic upsert behavior: if id provided, try create and ignore conflicts
        for (const r of rounds) {
            await prisma_1.default.round.upsert({
                where: { id: r.id ?? '' },
                update: {
                    startDate: r.startDate ? new Date(r.startDate) : undefined,
                    endDate: r.endDate ? new Date(r.endDate) : undefined,
                    drawingDate: r.drawingDate ? new Date(r.drawingDate) : undefined,
                    distributionDate: r.distributionDate ? new Date(r.distributionDate) : undefined,
                    prizePoolSol: r.prizePoolSol,
                    totalParticipants: r.totalParticipants,
                    eligibleParticipants: r.eligibleParticipants,
                    tierWinners: r.tierWinners,
                    tierPayouts: r.tierPayouts,
                    distributionTxSignatures: r.distributionTxSignatures,
                    distributionAtaAddresses: r.distributionAtaAddresses,
                    swapToLotto: r.swapToLotto,
                    swapRouteId: r.swapRouteId,
                    swapSlippage: r.swapSlippage,
                },
                create: {
                    id: r.id,
                    startDate: new Date(r.startDate),
                    endDate: new Date(r.endDate),
                    drawingDate: r.drawingDate ? new Date(r.drawingDate) : null,
                    distributionDate: r.distributionDate ? new Date(r.distributionDate) : null,
                    prizePoolSol: r.prizePoolSol ?? 0,
                    totalParticipants: r.totalParticipants ?? 0,
                    eligibleParticipants: r.eligibleParticipants ?? 0,
                    tierWinners: r.tierWinners ?? {},
                    tierPayouts: r.tierPayouts ?? {},
                    distributionTxSignatures: r.distributionTxSignatures ?? [],
                    distributionAtaAddresses: r.distributionAtaAddresses ?? {},
                    swapToLotto: !!r.swapToLotto,
                    swapRouteId: r.swapRouteId ?? null,
                    swapSlippage: r.swapSlippage ?? null,
                },
            });
        }
        for (const p of participants) {
            await prisma_1.default.participant.upsert({
                where: { id: p.id ?? '' },
                update: {
                    roundId: p.roundId,
                    wallet: p.wallet,
                    tokenLottoBalanceStart: p.tokenLottoBalanceStart,
                    tokenLottoBalanceEnd: p.tokenLottoBalanceEnd,
                    tokenUsdBalance: p.tokenUsdBalance,
                    tier: p.tier,
                    eligibilityScore: p.eligibilityScore,
                    isWinner: !!p.isWinner,
                },
                create: {
                    id: p.id,
                    roundId: p.roundId,
                    wallet: p.wallet,
                    tokenLottoBalanceStart: p.tokenLottoBalanceStart ?? null,
                    tokenLottoBalanceEnd: p.tokenLottoBalanceEnd ?? null,
                    tokenUsdBalance: p.tokenUsdBalance ?? null,
                    tier: p.tier ?? null,
                    eligibilityScore: p.eligibilityScore ?? null,
                    isWinner: !!p.isWinner,
                },
            });
        }
        return res.json({ ok: true });
    }
    catch (e) {
        console.error('POST /history/admin/import/json failed', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// POST /history/round/:id/audit/distribution - persist on-chain audit for distribution
router.post('/round/:id/audit/distribution', requireJwt_1.requireJwt, async (req, res) => {
    const id = String(req.params.id || '');
    if (!id)
        return res.status(400).json({ error: 'Missing id' });
    const { txSignatures = [], ataAddresses = {}, swapToLotto = false, routeId = null, slippage = null } = req.body || {};
    try {
        const updated = await prisma_1.default.round.update({
            where: { id },
            data: {
                distributionTxSignatures: txSignatures,
                distributionAtaAddresses: ataAddresses,
                swapToLotto: !!swapToLotto,
                swapRouteId: routeId,
                swapSlippage: slippage,
                distributionDate: new Date(),
            },
        });
        return res.json({ ok: true, roundId: updated.id });
    }
    catch (e) {
        console.error('POST /history/round/:id/audit/distribution failed', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /history/search?q=partialAddress - partial match search
router.get('/search', async (req, res) => {
    const q = String(req.query.q || '').trim();
    if (!q || q.length < 3)
        return res.json({ entries: [] });
    try {
        const page = Math.max(1, parseInt(String(req.query.page || '1')) || 1);
        const size = Math.max(1, Math.min(100, parseInt(String(req.query.size || '20')) || 20));
        const skip = (page - 1) * size;
        const where = { wallet: { contains: q } };
        const [total, entries] = await Promise.all([
            prisma_1.prismaRO.participant.count({ where }),
            prisma_1.prismaRO.participant.findMany({ where, orderBy: { createdAt: 'desc' }, include: { Round: true }, skip, take: size }),
        ]);
        return res.json({ entries, meta: { page, size, total, pages: Math.ceil(total / size) } });
    }
    catch (e) {
        console.error('GET /history/search failed', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
// GET /history/export/round/:id/full - Consolidated CSV export for a complete round
router.get('/export/round/:id/full', async (req, res) => {
    const roundId = String(req.params.id || '');
    if (!roundId)
        return res.status(400).json({ error: 'Missing round ID' });
    try {
        // Get round with all related data (use prisma instead of prismaRO for full access)
        const round = await prisma_1.default.round.findUnique({
            where: { id: roundId },
            include: {
                Participant: true,
                Snapshot: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                },
                Drawing: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            }
        });
        if (!round)
            return res.status(404).json({ error: 'Round not found' });
        const snapshot = round.Snapshot[0];
        const drawing = round.Drawing[0];
        const winners = round.tierWinners || {};
        const payouts = round.tierPayouts || {};
        const txSignatures = round.distributionTxSignatures || [];
        const ataAddresses = round.distributionAtaAddresses || {};
        // Get network from environment for Solscan URLs
        const network = process.env.SOLANA_NETWORK || 'devnet';
        const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`;
        // CSV Headers (updated with trading activity fields)
        const headers = [
            'Round ID',
            'Wallet Address',
            'Participant ID',
            'Round Start Date',
            'Round End Date',
            'Drawing Date',
            'Distribution Date',
            'Prize Pool (SOL)',
            'Prize Distribution %',
            'Prize Source Wallet',
            'Prize Source Balance (SOL)',
            'Total Participants',
            'Eligible Participants',
            'Snapshot ID',
            'Snapshot Started At',
            'Snapshot Completed At',
            'Drawing ID',
            'Drawing Started At',
            'Drawing Completed At',
            'Drawing Seed',
            'Drawing Blockhash',
            'Drawing Slot',
            'Token LOTTO Balance Start', // NEW: For trading activity transparency
            'Token LOTTO Balance End', // RENAMED: Was "Token LOTTO Balance"
            'Token USD Balance',
            'Tier',
            'Trading Activity %', // RENAMED: Was "Eligibility Score"
            'Is Eligible',
            'Is Winner',
            'Is Blacklisted',
            'Prize Tier Won',
            'Prize Amount (SOL)',
            'Tier 1 Payout (SOL)',
            'Tier 2 Payout (SOL)',
            'Tier 3 Payout (SOL)',
            'Tier 4 Payout (SOL)',
            'Transaction Signature',
            'Solscan URL',
            'ATA Address',
            'Swapped To LOTTO',
            'Swap Route ID',
            'Swap Slippage %'
        ];
        // Build rows - one per participant
        const rows = [];
        for (const participant of round.Participant) {
            // Determine if participant is a winner and which tier
            let prizeTierWon = '';
            let prizeAmount = '';
            let txSignature = '';
            let solscanUrl = '';
            let ataAddress = '';
            if (participant.isWinner) {
                const tiers = ['t1', 't2', 't3', 't4'];
                for (let i = 0; i < tiers.length; i++) {
                    const tierKey = tiers[i];
                    if (winners[tierKey] === participant.wallet) {
                        prizeTierWon = `TIER ${i + 1}`;
                        prizeAmount = payouts[tierKey]?.toString() || '';
                        // Handle transaction signature mapping
                        // In SOL mode: single transaction for all winners (length = 1)
                        // In swap mode: one transaction per winner (length = number of winners)
                        if (txSignatures.length === 1) {
                            // SOL mode - all winners share the same transaction
                            txSignature = txSignatures[0] || '';
                        }
                        else {
                            // Swap mode - map each winner to their transaction by position
                            // Count how many winners exist before this tier
                            let sigIndex = 0;
                            for (let j = 0; j < i; j++) {
                                if (winners[tiers[j]])
                                    sigIndex++;
                            }
                            txSignature = txSignatures[sigIndex] || '';
                        }
                        if (txSignature) {
                            solscanUrl = `https://solscan.io/tx/${txSignature}${cluster}`;
                        }
                        ataAddress = ataAddresses[tierKey] || '';
                        break;
                    }
                }
            }
            rows.push([
                round.id,
                participant.wallet,
                participant.id,
                round.startDate?.toISOString() || '',
                round.endDate?.toISOString() || '',
                round.drawingDate?.toISOString() || '',
                round.distributionDate?.toISOString() || '',
                round.prizePoolSol?.toString() || '',
                round.prizeDistributionPercent?.toString() || '',
                round.prizeSourceWallet || '',
                round.prizeSourceBalanceSol?.toString() || '',
                round.totalParticipants?.toString() || '',
                round.eligibleParticipants?.toString() || '',
                snapshot?.id || '',
                snapshot?.startedAt?.toISOString() || '',
                snapshot?.completedAt?.toISOString() || '',
                drawing?.id || '',
                drawing?.startedAt?.toISOString() || '',
                drawing?.completedAt?.toISOString() || '',
                drawing?.seed || '',
                drawing?.blockhash || '',
                drawing?.slot?.toString() || '',
                participant.tokenLottoBalanceStart?.toString() || '0', // NEW: START balance for trading activity
                participant.tokenLottoBalanceEnd?.toString() || '0', // END balance (determines tier)
                participant.tokenUsdBalance?.toString() || '0',
                participant.tier?.toString() || '',
                participant.eligibilityScore?.toString() || '0', // Trading activity %
                participant.isEligible ? 'TRUE' : 'FALSE',
                participant.isWinner ? 'TRUE' : 'FALSE',
                'FALSE', // is_blacklisted - blacklisted wallets are excluded from participants table
                prizeTierWon,
                prizeAmount,
                payouts.t1?.toString() || '',
                payouts.t2?.toString() || '',
                payouts.t3?.toString() || '',
                payouts.t4?.toString() || '',
                txSignature,
                solscanUrl,
                ataAddress,
                round.swapToLotto ? 'TRUE' : 'FALSE',
                round.swapRouteId || '',
                round.swapSlippage?.toString() || ''
            ]);
        }
        // Generate CSV
        const csv = [headers, ...rows]
            .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        // Filename: solotto_round_{date}_{roundId-first8}.csv
        const dateStr = round.drawingDate
            ? round.drawingDate.toISOString().split('T')[0]
            : round.createdAt.toISOString().split('T')[0];
        const roundIdShort = round.id.slice(0, 8);
        const filename = `solotto_round_${dateStr}_${roundIdShort}_full.csv`;
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        return res.send(csv);
    }
    catch (e) {
        console.error('GET /history/export/round/:id/full failed', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
