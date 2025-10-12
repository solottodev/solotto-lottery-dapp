"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SnapshotService = void 0;
exports.getSnapshotService = getSnapshotService;
// apps/backend/src/services/snapshot.service.ts
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const rpc_service_1 = require("./rpc.service");
const alchemy_client_1 = require("./alchemy.client");
const prisma_1 = __importDefault(require("../prisma"));
/**
 * Service for creating token holder snapshots
 *
 * Eligibility Requirements:
 * 1. USD Balance: Must hold ≥$50 USD worth of $LOTTO at snapshot time
 * 2. Trading Activity: Token balance must change by ≥50% during round period
 *
 * Tier Distribution (based on END balance):
 * - Tier 1: Top 5% of holders
 * - Tier 2: Next 15% (5% - 20%)
 * - Tier 3: Next 30% (20% - 50%)
 * - Tier 4: Remaining 50% (50% - 100%)
 */
class SnapshotService {
    constructor() {
        this.rpcService = (0, rpc_service_1.getRPCService)();
        this.alchemyClient = (0, alchemy_client_1.getAlchemyClient)();
    }
    /**
     * Get all token holders for a specific mint address
     * Uses Alchemy if available, falls back to RPC getProgramAccounts
     */
    async getTokenHolders(mintAddress) {
        console.log(`📸 Fetching token holders for mint: ${mintAddress}`);
        try {
            // Try Alchemy first (enhanced API)
            const holders = await this.alchemyClient.getTokenHolders(mintAddress);
            console.log(`✅ Retrieved ${holders.length} holders via Alchemy`);
            return holders;
        }
        catch (alchemyError) {
            console.warn('⚠️  Alchemy failed, falling back to RPC getProgramAccounts...');
            // Fallback to RPC
            return await this.getTokenHoldersViaRPC(mintAddress);
        }
    }
    /**
     * Get token holders using RPC getProgramAccounts (fallback method)
     */
    async getTokenHoldersViaRPC(mintAddress) {
        console.log(`🔍 Querying token holders via RPC for mint: ${mintAddress}`);
        const mintPubkey = new web3_js_1.PublicKey(mintAddress);
        try {
            // Use executeWithFallback to handle RPC failures
            const accounts = await this.rpcService.executeWithFallback(async (connection) => {
                return await connection.getParsedProgramAccounts(spl_token_1.TOKEN_PROGRAM_ID, {
                    filters: [
                        {
                            dataSize: 165, // Size of token account
                        },
                        {
                            memcmp: {
                                offset: 0, // Mint address is at offset 0
                                bytes: mintPubkey.toBase58(),
                            },
                        },
                    ],
                });
            }, `getProgramAccounts(${mintAddress})`);
            console.log(`✅ Found ${accounts.length} token accounts via RPC`);
            // Parse and convert to TokenHolder format
            const holders = [];
            for (const account of accounts) {
                const parsedInfo = account.account.data.parsed?.info;
                if (parsedInfo) {
                    const tokenAmount = parsedInfo.tokenAmount;
                    // Only include accounts with non-zero balance
                    if (tokenAmount.uiAmount > 0) {
                        holders.push({
                            owner: parsedInfo.owner,
                            balance: BigInt(tokenAmount.amount),
                            balanceUi: tokenAmount.uiAmount,
                            tokenAccount: account.pubkey.toBase58(),
                        });
                    }
                }
            }
            console.log(`✅ Parsed ${holders.length} holders with non-zero balances`);
            return holders;
        }
        catch (error) {
            console.error('❌ Failed to fetch token holders via RPC:', error);
            throw new Error('Failed to fetch token holders from blockchain');
        }
    }
    /**
     * Assign tiers based on token balance
     *
     * Tier 1: Top 5%
     * Tier 2: Next 15% (5-20%)
     * Tier 3: Next 30% (20-50%)
     * Tier 4: Bottom 50% (50-100%)
     */
    assignTiers(holders) {
        // Sort by balance descending (highest first)
        const sorted = [...holders].sort((a, b) => {
            if (a.balanceUi > b.balanceUi)
                return -1;
            if (a.balanceUi < b.balanceUi)
                return 1;
            return 0;
        });
        const total = sorted.length;
        const tier1Cutoff = Math.ceil(total * 0.05); // Top 5%
        const tier2Cutoff = Math.ceil(total * 0.20); // Top 20% (5% + 15%)
        const tier3Cutoff = Math.ceil(total * 0.50); // Top 50% (5% + 15% + 30%)
        console.log(`📊 Tier cutoffs (total: ${total}):`);
        console.log(`   Tier 1: Top ${tier1Cutoff} holders (5%)`);
        console.log(`   Tier 2: Next ${tier2Cutoff - tier1Cutoff} holders (15%)`);
        console.log(`   Tier 3: Next ${tier3Cutoff - tier2Cutoff} holders (30%)`);
        console.log(`   Tier 4: Remaining ${total - tier3Cutoff} holders (50%)`);
        const participants = sorted.map((holder, index) => {
            let tier;
            if (index < tier1Cutoff) {
                tier = 1;
            }
            else if (index < tier2Cutoff) {
                tier = 2;
            }
            else if (index < tier3Cutoff) {
                tier = 3;
            }
            else {
                tier = 4;
            }
            // TODO: Implement actual balance fetching and USD calculation
            // CURRENT LIMITATION: We only capture END balance, not START balance
            // For production:
            // 1. Fetch START balance: Query blockchain at round.startDate
            // 2. Fetch END balance: Query blockchain at round.endDate (current behavior)
            // 3. Calculate USD value: tokenUsdBalance = endBalance * currentLottoPrice
            //
            // For now, using END balance for both start/end (won't calculate trade % correctly)
            const tokenLottoBalanceStart = holder.balanceUi; // TEMPORARY: Should be fetched at round START
            const tokenLottoBalanceEnd = holder.balanceUi; // Current balance at snapshot time
            const tokenUsdBalance = holder.balanceUi; // TEMPORARY: Should be calculated with real price
            return {
                wallet: holder.owner,
                tokenLottoBalanceStart,
                tokenLottoBalanceEnd,
                tokenUsdBalance,
                tier,
            };
        });
        return participants;
    }
    /**
     * Filter out blacklisted wallets
     */
    filterBlacklist(participants, blacklist) {
        const blacklistSet = new Set(blacklist.map(addr => addr.toLowerCase()));
        const filtered = participants.filter(p => {
            const isBlacklisted = blacklistSet.has(p.wallet.toLowerCase());
            if (isBlacklisted) {
                console.log(`🚫 Blacklisted wallet removed: ${p.wallet}`);
            }
            return !isBlacklisted;
        });
        const removed = participants.length - filtered.length;
        if (removed > 0) {
            console.log(`🚫 Removed ${removed} blacklisted wallets`);
        }
        return { filtered, removed };
    }
    /**
     * Apply hard-coded blacklist from environment
     */
    getHardBlacklist() {
        try {
            const hardBlacklist = process.env.HARD_BLACKLIST;
            if (hardBlacklist) {
                return JSON.parse(hardBlacklist);
            }
        }
        catch (error) {
            console.warn('⚠️  Failed to parse HARD_BLACKLIST from env');
        }
        return [];
    }
    /**
     * Create a snapshot for a round
     */
    async createSnapshot(roundId, mintAddress, configBlacklist = []) {
        console.log(`\n📸 Creating snapshot for round ${roundId}`);
        console.log(`   Token Mint: ${mintAddress}`);
        // 1. Fetch all token holders from blockchain
        const holders = await this.getTokenHolders(mintAddress);
        console.log(`✅ Retrieved ${holders.length} token holders`);
        if (holders.length === 0) {
            throw new Error('No token holders found for this mint address');
        }
        // 2. Assign tiers based on balance
        let participants = this.assignTiers(holders);
        // 3. Apply blacklists (combine hard blacklist + config blacklist)
        const hardBlacklist = this.getHardBlacklist();
        const combinedBlacklist = [...hardBlacklist, ...configBlacklist];
        console.log(`🔍 Applying blacklist (${combinedBlacklist.length} addresses)...`);
        const { filtered, removed } = this.filterBlacklist(participants, combinedBlacklist);
        participants = filtered;
        // 4. Count participants by tier
        const tierCounts = {
            t1: participants.filter(p => p.tier === 1).length,
            t2: participants.filter(p => p.tier === 2).length,
            t3: participants.filter(p => p.tier === 3).length,
            t4: participants.filter(p => p.tier === 4).length,
        };
        console.log(`\n📊 Snapshot Summary:`);
        console.log(`   Total Holders: ${holders.length}`);
        console.log(`   Blacklisted: ${removed}`);
        console.log(`   Valid Participants: ${participants.length}`);
        console.log(`   Tier 1: ${tierCounts.t1}`);
        console.log(`   Tier 2: ${tierCounts.t2}`);
        console.log(`   Tier 3: ${tierCounts.t3}`);
        console.log(`   Tier 4: ${tierCounts.t4}`);
        // 5. Store participants in database
        await this.storeParticipants(roundId, participants);
        return {
            totalHolders: holders.length,
            participants,
            tierCounts,
            blacklisted: removed,
        };
    }
    /**
     * Store participants in database
     */
    async storeParticipants(roundId, participants) {
        console.log(`💾 Storing ${participants.length} participants in database...`);
        // Delete existing participants for this round (in case of re-snapshot)
        await prisma_1.default.participant.deleteMany({
            where: { roundId },
        });
        // Batch insert participants
        const batchSize = 100;
        for (let i = 0; i < participants.length; i += batchSize) {
            const batch = participants.slice(i, i + batchSize);
            await prisma_1.default.participant.createMany({
                data: batch.map(p => ({
                    roundId,
                    wallet: p.wallet,
                    tokenLottoBalanceStart: p.tokenLottoBalanceStart,
                    tokenLottoBalanceEnd: p.tokenLottoBalanceEnd,
                    tokenUsdBalance: p.tokenUsdBalance,
                    tier: p.tier,
                    eligibilityScore: null, // Will be calculated in confirm step as trading %
                    isEligible: false, // Will be set in confirm step
                    isWinner: false,
                })),
            });
            console.log(`   Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(participants.length / batchSize)}`);
        }
        console.log(`✅ All participants stored successfully`);
    }
    /**
     * Get snapshot statistics for a round
     */
    async getSnapshotStats(roundId) {
        const participants = await prisma_1.default.participant.findMany({
            where: { roundId },
        });
        const tierCounts = await prisma_1.default.participant.groupBy({
            where: { roundId },
            by: ['tier'],
            _count: { _all: true },
        });
        return {
            total: participants.length,
            tierCounts: {
                t1: tierCounts.find(t => t.tier === 1)?._count._all ?? 0,
                t2: tierCounts.find(t => t.tier === 2)?._count._all ?? 0,
                t3: tierCounts.find(t => t.tier === 3)?._count._all ?? 0,
                t4: tierCounts.find(t => t.tier === 4)?._count._all ?? 0,
            },
        };
    }
}
exports.SnapshotService = SnapshotService;
// Singleton instance
let snapshotServiceInstance = null;
function getSnapshotService() {
    if (!snapshotServiceInstance) {
        snapshotServiceInstance = new SnapshotService();
    }
    return snapshotServiceInstance;
}
