"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TradingActivityService = void 0;
exports.getTradingActivityService = getTradingActivityService;
// apps/backend/src/services/trading-activity.service.ts
const snapshot_service_1 = require("./snapshot.service");
const prisma_1 = __importDefault(require("../prisma"));
/**
 * Service for tracking trading activity and calculating eligibility
 *
 * This service implements the mainnet eligibility requirement:
 * - Wallets must have 50%+ trading activity (buying OR selling) during the round period
 * - Activity is calculated by comparing balance at START vs END of round
 * - Returns the HIGHER of buy% or sell% (wallets can qualify through either)
 */
class TradingActivityService {
    /**
     * Capture START balances for all token holders at round creation
     * This creates the baseline for calculating trading activity later
     */
    async captureStartBalances(roundId, mintAddress) {
        console.log(`📸 Capturing START balances for round ${roundId}...`);
        try {
            const snapshotService = (0, snapshot_service_1.getSnapshotService)();
            const holders = await snapshotService.getTokenHolders(mintAddress);
            console.log(`   Found ${holders.length} token holders at START`);
            // Batch insert for efficiency
            const batchSize = 100;
            let inserted = 0;
            for (let i = 0; i < holders.length; i += batchSize) {
                const batch = holders.slice(i, i + batchSize);
                await prisma_1.default.balanceSnapshot.createMany({
                    data: batch.map(holder => ({
                        roundId,
                        wallet: holder.owner,
                        tokenBalance: holder.balanceUi,
                        snapshotType: 'START',
                    })),
                    skipDuplicates: true, // Prevent duplicate entries
                });
                inserted += batch.length;
                console.log(`   Captured ${inserted}/${holders.length} START balances...`);
            }
            console.log(`✅ Successfully captured ${holders.length} START balances`);
        }
        catch (error) {
            console.error('❌ Failed to capture START balances:', error);
            throw new Error(`Failed to capture START balances: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Capture END balances for all token holders at snapshot confirmation
     * This completes the data needed to calculate trading activity
     */
    async captureEndBalances(roundId, mintAddress) {
        console.log(`📸 Capturing END balances for round ${roundId}...`);
        try {
            const snapshotService = (0, snapshot_service_1.getSnapshotService)();
            const holders = await snapshotService.getTokenHolders(mintAddress);
            console.log(`   Found ${holders.length} token holders at END`);
            // Batch insert for efficiency
            const batchSize = 100;
            let inserted = 0;
            for (let i = 0; i < holders.length; i += batchSize) {
                const batch = holders.slice(i, i + batchSize);
                await prisma_1.default.balanceSnapshot.createMany({
                    data: batch.map(holder => ({
                        roundId,
                        wallet: holder.owner,
                        tokenBalance: holder.balanceUi,
                        snapshotType: 'END',
                    })),
                    skipDuplicates: true, // Prevent duplicate entries
                });
                inserted += batch.length;
                console.log(`   Captured ${inserted}/${holders.length} END balances...`);
            }
            console.log(`✅ Successfully captured ${holders.length} END balances`);
        }
        catch (error) {
            console.error('❌ Failed to capture END balances:', error);
            throw new Error(`Failed to capture END balances: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Calculate trade activity percentage for a single wallet
     *
     * Returns the HIGHER of:
     * - Buy%: ((end - start) / start) × 100
     * - Sell%: ((start - end) / start) × 100
     *
     * This allows wallets to qualify through EITHER buying OR selling activity
     *
     * Special cases:
     * - New wallet (0 → X): 100% buy activity
     * - Closed wallet (X → 0): 100% sell activity
     * - No change (X → X): 0% activity (ineligible)
     */
    async calculateTradeActivity(roundId, wallet) {
        try {
            const startSnapshot = await prisma_1.default.balanceSnapshot.findUnique({
                where: {
                    roundId_wallet_snapshotType: {
                        roundId,
                        wallet,
                        snapshotType: 'START'
                    }
                }
            });
            const endSnapshot = await prisma_1.default.balanceSnapshot.findUnique({
                where: {
                    roundId_wallet_snapshotType: {
                        roundId,
                        wallet,
                        snapshotType: 'END'
                    }
                }
            });
            // Case 1: New wallet (no START balance, has END balance)
            // Going from 0 to any positive amount = 100% buy activity
            if (!startSnapshot && endSnapshot) {
                return endSnapshot.tokenBalance > 0 ? 100 : 0;
            }
            // Case 2: Wallet closed (has START balance, no END balance)
            // Sold everything = 100% sell activity
            if (startSnapshot && !endSnapshot) {
                return 100;
            }
            // Case 3: Wallet existed at both START and END
            if (startSnapshot && endSnapshot) {
                const startBal = startSnapshot.tokenBalance;
                const endBal = endSnapshot.tokenBalance;
                // Edge case: started with 0 tokens
                if (startBal === 0) {
                    return endBal > 0 ? 100 : 0;
                }
                // Calculate buy % and sell %
                const buyPercent = ((endBal - startBal) / startBal) * 100;
                const sellPercent = ((startBal - endBal) / startBal) * 100;
                // Return the HIGHER of the two (allows qualification via either buying OR selling)
                return Math.max(0, buyPercent, sellPercent);
            }
            // Case 4: No data available (shouldn't happen in normal flow)
            console.warn(`⚠️  No snapshot data found for wallet ${wallet} in round ${roundId}`);
            return 0;
        }
        catch (error) {
            console.error(`❌ Error calculating trade activity for ${wallet}:`, error);
            return 0; // Default to 0% activity on error
        }
    }
    /**
     * Update eligibility scores for all participants in a round
     * This calculates trading activity % and stores it in the eligibilityScore field
     *
     * Note: This only calculates trade %. The final isEligible flag is set later
     * after checking BOTH trade% AND USD balance requirements.
     */
    async updateParticipantEligibility(roundId, minTradePercent) {
        console.log(`📊 Calculating trade activity for round ${roundId}...`);
        console.log(`   Minimum required: ${minTradePercent}%`);
        try {
            const participants = await prisma_1.default.participant.findMany({
                where: { roundId }
            });
            console.log(`   Processing ${participants.length} participants...`);
            // OPTIMIZATION: Fetch ALL balance snapshots in one query
            const allSnapshots = await prisma_1.default.balanceSnapshot.findMany({
                where: { roundId }
            });
            // Create lookup maps for fast access
            const startBalances = new Map();
            const endBalances = new Map();
            allSnapshots.forEach(snap => {
                if (snap.snapshotType === 'START') {
                    startBalances.set(snap.wallet, snap.tokenBalance);
                }
                else if (snap.snapshotType === 'END') {
                    endBalances.set(snap.wallet, snap.tokenBalance);
                }
            });
            let eligibleCount = 0;
            const updates = [];
            // Calculate trading activity for all participants (no DB queries in loop)
            for (const participant of participants) {
                // If no START snapshot exists, treat START as 0 (new wallet this round)
                const startBalance = startBalances.get(participant.wallet) ?? 0;
                const endBalance = endBalances.get(participant.wallet) ?? participant.tokenLottoBalanceEnd ?? 0;
                // Calculate trade activity percentage
                const tradePercent = this.calculateTradePercentage(startBalance, endBalance);
                const meetsTradeThreshold = tradePercent >= minTradePercent;
                if (meetsTradeThreshold)
                    eligibleCount++;
                updates.push({
                    id: participant.id,
                    data: {
                        eligibilityScore: tradePercent,
                        tokenLottoBalanceStart: startBalance
                    }
                });
                // Log sample (every 10th participant to reduce noise)
                if (participants.indexOf(participant) % 10 === 0 || participants.indexOf(participant) < 5) {
                    const status = meetsTradeThreshold ? '✅' : '❌';
                    console.log(`   ${status} ${participant.wallet.slice(0, 8)}... - ` +
                        `Trade Activity: ${tradePercent.toFixed(2)}% ` +
                        `(${startBalance.toFixed(2)} → ${endBalance.toFixed(2)})`);
                }
            }
            // OPTIMIZATION: Batch update all participants using transactions
            console.log(`   📝 Updating ${updates.length} participants in batch...`);
            await prisma_1.default.$transaction(updates.map(({ id, data }) => prisma_1.default.participant.update({
                where: { id },
                data
            })));
            console.log(`\n✅ Trading activity calculated for ${participants.length} participants`);
            console.log(`   Meets trade threshold (${minTradePercent}%): ${eligibleCount}/${participants.length}`);
            console.log(`   Note: Final eligibility also requires $50+ USD balance`);
            return {
                total: participants.length,
                eligible: eligibleCount
            };
        }
        catch (error) {
            console.error('❌ Failed to update participant eligibility:', error);
            throw new Error(`Failed to update participant eligibility: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Calculate trade percentage from start and end balances
     */
    calculateTradePercentage(startBalance, endBalance) {
        if (startBalance === 0) {
            return endBalance > 0 ? 100 : 0;
        }
        const change = Math.abs(endBalance - startBalance);
        return (change / startBalance) * 100;
    }
    /**
     * Get trading activity statistics for a round (for debugging/monitoring)
     */
    async getActivityStats(roundId) {
        const [totalSnapshots, startSnapshots, endSnapshots, participants] = await Promise.all([
            prisma_1.default.balanceSnapshot.count({ where: { roundId } }),
            prisma_1.default.balanceSnapshot.count({ where: { roundId, snapshotType: 'START' } }),
            prisma_1.default.balanceSnapshot.count({ where: { roundId, snapshotType: 'END' } }),
            prisma_1.default.participant.count({
                where: {
                    roundId,
                    eligibilityScore: { not: null }
                }
            })
        ]);
        return {
            totalSnapshots,
            startSnapshots,
            endSnapshots,
            participantsWithActivity: participants
        };
    }
    /**
     * Find the most recent completed round to inherit balances from
     *
     * This method searches for the most recent round that:
     * 1. Was created before the current round
     * 2. Has END balances captured (snapshot confirmed)
     * 3. Uses the same token mint as the current round
     *
     * @param currentRoundCreatedAt - Creation timestamp of current round
     * @param tokenMint - Token mint address to match
     * @returns Previous round ID or null if none found
     */
    async findPreviousRound(currentRoundCreatedAt, tokenMint) {
        try {
            console.log(`🔍 Searching for previous round to inherit balances from...`);
            console.log(`   Token mint: ${tokenMint}`);
            console.log(`   Before: ${currentRoundCreatedAt.toISOString()}`);
            // Find most recent rounds created before current round
            const rounds = await prisma_1.default.round.findMany({
                where: {
                    createdAt: { lt: currentRoundCreatedAt }
                },
                orderBy: { createdAt: 'desc' },
                take: 10, // Check last 10 rounds max
                include: {
                    Snapshot: {
                        where: { status: 'CONFIRMED' },
                        take: 1
                    },
                    BalanceSnapshot: {
                        where: { snapshotType: 'END' },
                        take: 1 // Just check if any END balances exist
                    }
                }
            });
            console.log(`   Found ${rounds.length} rounds to check`);
            // Find first round that has END balances and matching token mint
            for (const round of rounds) {
                if (round.BalanceSnapshot.length > 0) {
                    // Verify token mint matches (get from LotteryConfig by matching dates AND token mint)
                    const config = await prisma_1.default.lotteryConfig.findFirst({
                        where: {
                            AND: [
                                { snapshotStart: { lte: round.startDate } },
                                { snapshotEnd: { gte: round.startDate } },
                                { tokenMint: tokenMint } // Add token mint filter to query!
                            ]
                        }
                    });
                    if (config) {
                        console.log(`   ✅ Found previous round: ${round.id.slice(0, 8)}...`);
                        console.log(`      Created: ${round.createdAt.toISOString()}`);
                        console.log(`      Period: ${round.startDate.toISOString().split('T')[0]} → ${round.endDate.toISOString().split('T')[0]}`);
                        console.log(`      Token mint: ${config.tokenMint}`);
                        // Count how many END balances exist
                        const endCount = await prisma_1.default.balanceSnapshot.count({
                            where: { roundId: round.id, snapshotType: 'END' }
                        });
                        console.log(`      END balances: ${endCount}`);
                        return round.id;
                    }
                    else {
                        console.log(`   ⏭️  Skipping round ${round.id.slice(0, 8)}... (no config found with matching token mint)`);
                    }
                }
                else {
                    console.log(`   ⏭️  Skipping round ${round.id.slice(0, 8)}... (no END balances)`);
                }
            }
            console.log('   ℹ️  No previous round found with END balances');
            return null;
        }
        catch (error) {
            console.error('❌ Error finding previous round:', error);
            return null;
        }
    }
    /**
     * Inherit END balances from previous round as START balances for current round
     *
     * This enables accurate week-over-week trading activity tracking by using
     * the previous round's END balances as the baseline (START) for the current round.
     *
     * New wallets that appear in the current round but didn't exist in the previous
     * round will have no START balance record, resulting in 100% trading activity.
     *
     * @param currentRoundId - ID of the current round
     * @param previousRoundId - ID of the previous round to inherit from
     * @returns Object with inherited count and skipped count
     */
    async inheritPreviousEndBalances(currentRoundId, previousRoundId) {
        console.log(`📋 Inheriting END balances from previous round...`);
        console.log(`   Previous round: ${previousRoundId.slice(0, 8)}...`);
        console.log(`   Current round: ${currentRoundId.slice(0, 8)}...`);
        try {
            // Get all END balances from previous round
            const previousEndSnapshots = await prisma_1.default.balanceSnapshot.findMany({
                where: {
                    roundId: previousRoundId,
                    snapshotType: 'END'
                }
            });
            if (previousEndSnapshots.length === 0) {
                throw new Error(`No END balances found in previous round ${previousRoundId}`);
            }
            console.log(`   Found ${previousEndSnapshots.length} END balances to inherit`);
            // Batch insert as START balances for current round
            const batchSize = 100;
            let inherited = 0;
            for (let i = 0; i < previousEndSnapshots.length; i += batchSize) {
                const batch = previousEndSnapshots.slice(i, i + batchSize);
                await prisma_1.default.balanceSnapshot.createMany({
                    data: batch.map(snap => ({
                        roundId: currentRoundId,
                        wallet: snap.wallet,
                        tokenBalance: snap.tokenBalance,
                        snapshotType: 'START',
                    })),
                    skipDuplicates: true, // Prevent errors if START already exists
                });
                inherited += batch.length;
                console.log(`   Inherited ${inherited}/${previousEndSnapshots.length} START balances...`);
            }
            const skipped = previousEndSnapshots.length - inherited;
            console.log(`✅ Successfully inherited ${inherited} START balances from previous round`);
            if (skipped > 0) {
                console.log(`   ℹ️  Skipped ${skipped} duplicates`);
            }
            return { inherited, skipped };
        }
        catch (error) {
            console.error('❌ Failed to inherit previous END balances:', error);
            throw new Error(`Failed to inherit balances: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.TradingActivityService = TradingActivityService;
// Singleton instance
let tradingActivityServiceInstance = null;
/**
 * Get the singleton instance of TradingActivityService
 */
function getTradingActivityService() {
    if (!tradingActivityServiceInstance) {
        tradingActivityServiceInstance = new TradingActivityService();
    }
    return tradingActivityServiceInstance;
}
