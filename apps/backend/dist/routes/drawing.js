"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const requireJwt_1 = require("../middleware/requireJwt");
const prisma_1 = __importDefault(require("../prisma"));
const drawing_service_1 = require("../services/drawing.service");
const router = express_1.default.Router();
// POST /drawing/run { roundId }
router.post('/run', requireJwt_1.requireJwt, async (req, res) => {
    try {
        const { roundId } = req.body || {};
        if (!roundId)
            return res.status(400).json({ error: 'Missing roundId' });
        // Verify round exists
        const round = await prisma_1.default.round.findUnique({ where: { id: roundId } });
        if (!round)
            return res.status(404).json({ error: 'Round not found' });
        // Create drawing record
        const startedAt = new Date();
        const draw = await prisma_1.default.drawing.create({
            data: { roundId, status: 'RUNNING', startedAt }
        });
        console.log(`\n🎰 Starting drawing ${draw.id} for round ${roundId}`);
        try {
            // Get the snapshot for this round to include in audit trail
            const snapshot = await prisma_1.default.snapshot.findFirst({
                where: { roundId },
                orderBy: { createdAt: 'desc' }
            });
            // Use DrawingService for cryptographically secure winner selection
            const drawingService = (0, drawing_service_1.getDrawingService)();
            const result = await drawingService.runDrawing(roundId);
            const completedAt = new Date();
            // Update drawing with results and audit trail
            await prisma_1.default.drawing.update({
                where: { id: draw.id },
                data: {
                    status: 'COMPLETED',
                    completedAt,
                    seed: result.audit.seed,
                    blockhash: result.audit.blockhash,
                    slot: result.audit.slot,
                }
            });
            console.log(`✅ Drawing ${draw.id} completed successfully\n`);
            return res.json({
                drawingId: draw.id,
                startedAt,
                completedAt,
                winners: result.winners,
                eligibleCounts: result.eligibleCounts,
                audit: {
                    seed: result.audit.seed,
                    blockhash: result.audit.blockhash,
                    slot: result.audit.slot,
                    snapshotId: snapshot?.id || null,
                }
            });
        }
        catch (drawingError) {
            // Update drawing to IDLE (failed)
            await prisma_1.default.drawing.update({
                where: { id: draw.id },
                data: { status: 'IDLE' }
            });
            console.error('❌ Drawing failed:', drawingError);
            throw drawingError;
        }
    }
    catch (e) {
        console.error('drawing/run failed', e);
        return res.status(500).json({
            error: 'Internal server error',
            details: e instanceof Error ? e.message : String(e)
        });
    }
});
// POST /drawing/confirm { drawingId }
router.post('/confirm', requireJwt_1.requireJwt, async (req, res) => {
    try {
        const { drawingId } = req.body || {};
        if (!drawingId)
            return res.status(400).json({ error: 'Missing drawingId' });
        const draw = await prisma_1.default.drawing.findUnique({ where: { id: drawingId } });
        if (!draw)
            return res.status(404).json({ error: 'Drawing not found' });
        if (draw.status !== 'COMPLETED') {
            return res.status(400).json({ error: 'Drawing must be completed before confirmation' });
        }
        console.log(`\n✅ Confirming drawing ${drawingId}`);
        // Get winners from participants table (marked during drawing)
        const winners = await prisma_1.default.participant.findMany({
            where: { roundId: draw.roundId, isWinner: true },
            select: { wallet: true, tier: true }
        });
        const tierWinners = {
            t1: winners.find(w => w.tier === 1)?.wallet || null,
            t2: winners.find(w => w.tier === 2)?.wallet || null,
            t3: winners.find(w => w.tier === 3)?.wallet || null,
            t4: winners.find(w => w.tier === 4)?.wallet || null,
        };
        console.log(`   Tier 1 Winner: ${tierWinners.t1?.slice(0, 8) || 'None'}`);
        console.log(`   Tier 2 Winner: ${tierWinners.t2?.slice(0, 8) || 'None'}`);
        console.log(`   Tier 3 Winner: ${tierWinners.t3?.slice(0, 8) || 'None'}`);
        console.log(`   Tier 4 Winner: ${tierWinners.t4?.slice(0, 8) || 'None'}`);
        // Update round with winners and drawing date
        await prisma_1.default.round.update({
            where: { id: draw.roundId },
            data: {
                tierWinners,
                drawingDate: new Date()
            }
        });
        // Mark drawing as confirmed
        await prisma_1.default.drawing.update({
            where: { id: drawingId },
            data: { status: 'CONFIRMED' }
        });
        console.log(`✅ Drawing confirmed successfully\n`);
        return res.json({
            ok: true,
            winners: tierWinners
        });
    }
    catch (e) {
        console.error('drawing/confirm failed', e);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
