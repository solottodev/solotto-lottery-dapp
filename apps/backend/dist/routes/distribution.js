"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const requireJwt_1 = require("../middleware/requireJwt");
const prisma_1 = __importDefault(require("../prisma"));
const transfer_service_1 = require("../services/transfer.service");
const wallet_service_1 = require("../services/wallet.service");
const rpc_service_1 = require("../services/rpc.service");
const router = express_1.default.Router();
// POST /distribution/release { roundId, swapToLotto }
router.post('/release', requireJwt_1.requireJwt, async (req, res) => {
    try {
        const { roundId, swapToLotto } = req.body || {};
        if (!roundId)
            return res.status(400).json({ error: 'Missing roundId' });
        console.log(`\n🎁 Starting prize distribution for round ${roundId}`);
        console.log(`   swapToLotto: ${swapToLotto ? 'Yes' : 'No'}`);
        // Get round with winners and payouts
        const round = await prisma_1.default.round.findUnique({ where: { id: roundId } });
        if (!round)
            return res.status(404).json({ error: 'Round not found' });
        const winners = round.tierWinners || {};
        const payouts = round.tierPayouts || {};
        // Validate we have winners and payouts
        const tiers = ['t1', 't2', 't3', 't4'].filter((t) => winners[t] && payouts[t] > 0);
        if (tiers.length === 0) {
            return res.status(400).json({ error: 'No winners or payouts found' });
        }
        console.log(`   Distributing prizes to ${tiers.length} winners`);
        // Load operator wallet
        const walletService = (0, wallet_service_1.getWalletService)();
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
        // Get transfer service and RPC for audit
        const transferService = (0, transfer_service_1.getTransferService)();
        const rpcService = (0, rpc_service_1.getRPCService)();
        const connection = rpcService.getConnection();
        // Capture blockchain state for audit
        const latestBlockhash = await rpcService.getLatestBlockhash();
        const slot = await connection.getSlot();
        // Distribute prizes to each winner
        const txSignatures = [];
        const ataAddresses = {};
        for (const tier of tiers) {
            const winnerAddress = winners[tier];
            const amount = payouts[tier];
            console.log(`\n   Tier ${tier.toUpperCase()}: ${amount} SOL to ${winnerAddress.slice(0, 8)}...`);
            try {
                if (swapToLotto) {
                    // Transfer as SPL tokens (requires token mint configuration)
                    const tokenMint = process.env.LOTTO_MINT_ADDRESS;
                    const decimals = parseInt(process.env.LOTTO_DECIMALS || '6', 10);
                    if (!tokenMint || tokenMint === 'your_devnet_token_mint_address') {
                        throw new Error('LOTTO_MINT_ADDRESS not configured for token distribution');
                    }
                    // TODO: In production, convert SOL to $LOTTO via Jupiter/DEX first
                    // For now, assume operator wallet has sufficient $LOTTO tokens
                    console.log(`   ⚠️  Note: In production, would swap ${amount} SOL to $LOTTO first`);
                    const result = await transferService.transferSPLToken(operatorKeypair, winnerAddress, tokenMint, amount, // In production, this would be converted amount
                    decimals, 1000 // priority fee
                    );
                    txSignatures.push(result.signature);
                    if (result.ataAddress) {
                        ataAddresses[tier] = result.ataAddress;
                    }
                }
                else {
                    // Transfer as SOL
                    const result = await transferService.transferSOL(operatorKeypair, winnerAddress, amount, 1000 // priority fee
                    );
                    txSignatures.push(result.signature);
                }
                console.log(`   ✅ Prize distributed successfully`);
            }
            catch (error) {
                console.error(`   ❌ Failed to distribute prize to ${tier}:`, error);
                return res.status(500).json({
                    error: `Failed to distribute prize to tier ${tier}`,
                    details: error instanceof Error ? error.message : String(error),
                    partialTxSignatures: txSignatures
                });
            }
        }
        // Update round with distribution data
        const distributionDate = new Date();
        await prisma_1.default.round.update({
            where: { id: roundId },
            data: {
                distributionDate,
                swapToLotto: swapToLotto || false
            }
        });
        console.log(`\n✅ Prize distribution complete for round ${roundId}`);
        console.log(`   Transactions: ${txSignatures.length}`);
        console.log(`   Blockhash: ${latestBlockhash.blockhash.slice(0, 16)}...`);
        return res.json({
            releasedAt: distributionDate.toISOString(),
            txSignatures,
            ataAddresses: Object.keys(ataAddresses).length > 0 ? ataAddresses : undefined,
            audit: {
                blockhash: latestBlockhash.blockhash,
                slot,
            }
        });
    }
    catch (e) {
        console.error('distribution/release failed', e);
        return res.status(500).json({
            error: 'Internal server error',
            details: e instanceof Error ? e.message : String(e)
        });
    }
});
exports.default = router;
