"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const requireJwt_1 = require("../middleware/requireJwt");
const prisma_1 = __importDefault(require("../prisma"));
const rpc_service_1 = require("../services/rpc.service");
const wallet_service_1 = require("../services/wallet.service");
const web3_js_1 = require("@solana/web3.js");
const router = express_1.default.Router();
const BASE_PCT = { t1: 0.40, t2: 0.30, t3: 0.20, t4: 0.10 };
router.post('/prepare', requireJwt_1.requireJwt, async (req, res) => {
    try {
        const { roundId } = req.body || {};
        if (!roundId)
            return res.status(400).json({ error: 'Missing roundId' });
        console.log(`\n📊 Harvesting prizes for round ${roundId}`);
        const round = await prisma_1.default.round.findUnique({ where: { id: roundId } });
        if (!round)
            return res.status(404).json({ error: 'Round not found' });
        const winners = round.tierWinners || {};
        const qualifying = ['t1', 't2', 't3', 't4'].filter((t) => winners?.[t]);
        const prizeDistributionPercent = round.prizeDistributionPercent ?? 0;
        console.log(`   Distribution %: ${prizeDistributionPercent}%`);
        console.log(`   Qualifying Tiers: ${qualifying.join(', ')}`);
        // 🌾 HARVEST: Query operator wallet balance and calculate prize pool
        const rpcService = (0, rpc_service_1.getRPCService)();
        const walletService = (0, wallet_service_1.getWalletService)();
        // Load operator wallet (which IS the prize source wallet)
        let operatorKeypair;
        try {
            operatorKeypair = walletService.loadOperatorKeypair();
        }
        catch (error) {
            return res.status(500).json({
                error: 'Operator wallet not configured',
                details: error instanceof Error ? error.message : String(error)
            });
        }
        console.log(`   Prize Source (Operator): ${operatorKeypair.publicKey.toBase58().slice(0, 8)}...`);
        // Query CURRENT wallet balance (this is the harvest)
        const actualBalanceLamports = await rpcService.getBalance(operatorKeypair.publicKey);
        const actualBalanceSol = actualBalanceLamports / web3_js_1.LAMPORTS_PER_SOL;
        console.log(`   Current Wallet Balance: ${actualBalanceSol.toFixed(4)} SOL`);
        // Calculate prize pool based on distribution percentage
        const ratio = Math.max(0, Math.min(100, prizeDistributionPercent)) / 100;
        const prizePoolSol = Number((actualBalanceSol * ratio).toFixed(6));
        if (prizePoolSol <= 0) {
            return res.status(400).json({
                error: 'Prize pool is zero',
                details: `Wallet balance: ${actualBalanceSol} SOL, Distribution %: ${prizeDistributionPercent}%`
            });
        }
        console.log(`   🏆 Prize Pool: ${prizePoolSol} SOL (${(ratio * 100).toFixed(1)}% of ${actualBalanceSol.toFixed(4)} SOL)`);
        // Calculate tier allocations from the prize pool
        const baseSum = qualifying.reduce((sum, t) => sum + BASE_PCT[t], 0);
        const allocations = { t1: 0, t2: 0, t3: 0, t4: 0 };
        if (baseSum > 0) {
            let totalAssigned = 0;
            qualifying.forEach((t, idx) => {
                const tierRatio = BASE_PCT[t] / baseSum;
                let amount = Number((prizePoolSol * tierRatio).toFixed(6));
                // ensure sum matches pool by adjusting final tier
                if (idx === qualifying.length - 1) {
                    amount = Number((prizePoolSol - totalAssigned).toFixed(6));
                }
                allocations[t] = amount;
                totalAssigned = Number((totalAssigned + amount).toFixed(6));
                console.log(`   ${t.toUpperCase()}: ${amount} SOL (${(tierRatio * 100).toFixed(1)}%)`);
            });
        }
        // Update round with harvested prize pool and allocations
        await prisma_1.default.round.update({
            where: { id: roundId },
            data: {
                prizePoolSol, // Store the harvested pool amount
                tierPayouts: allocations
            }
        });
        // Capture blockchain state for audit trail
        const connection = rpcService.getConnection();
        const latestBlockhash = await rpcService.getLatestBlockhash();
        const slot = await connection.getSlot();
        const preparedAt = new Date().toISOString();
        const audit = {
            blockhash: latestBlockhash.blockhash,
            slot,
            txSignatures: [],
            ataAddresses: {},
        };
        console.log(`\n✅ Prize harvest complete`);
        console.log(`   Blockhash: ${audit.blockhash.slice(0, 16)}...`);
        console.log(`   Slot: ${audit.slot}`);
        return res.json({
            preparedAt,
            prizePoolSol,
            allocations,
            audit,
        });
    }
    catch (e) {
        console.error('harvest/prepare failed', e);
        return res.status(500).json({
            error: 'Internal server error',
            details: e instanceof Error ? e.message : String(e)
        });
    }
});
exports.default = router;
