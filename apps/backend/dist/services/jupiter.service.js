"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JupiterService = void 0;
exports.getJupiterService = getJupiterService;
const web3_js_1 = require("@solana/web3.js");
const axios_1 = __importDefault(require("axios"));
const dns_1 = __importDefault(require("dns"));
// Jupiter Swap API endpoints (v6) with env override
const JUPITER_API_BASE = process.env.JUPITER_API_BASE_URL || 'https://quote-api.jup.ag';
const JUPITER_QUOTE_API = `${JUPITER_API_BASE}/v6/quote`;
const JUPITER_SWAP_API = `${JUPITER_API_BASE}/v6/swap`;
// Native SOL mint address (wrapped SOL)
const SOL_MINT = 'So11111111111111111111111111111111111111112';
/**
 * Jupiter Swap Service
 * Handles SOL to LOTTO token swaps using Jupiter aggregator
 * All transactions are signed by the frontend wallet (Phantom)
 */
class JupiterService {
    constructor() {
        // Get LOTTO mint address from environment
        this.lottoMintAddress = process.env.LOTTO_MINT_ADDRESS || '';
        this.lottoDecimals = parseInt(process.env.LOTTO_DECIMALS || '6', 10);
        if (!this.lottoMintAddress) {
            console.warn('⚠️  LOTTO_MINT_ADDRESS not configured - Jupiter swaps will not be available');
        }
        else {
            console.log(`🔄 Jupiter Service initialized`);
            console.log(`   LOTTO Mint: ${this.lottoMintAddress}`);
            console.log(`   Decimals: ${this.lottoDecimals}`);
            console.log(`   API Base: ${JUPITER_API_BASE}`);
            console.log(`   Endpoints: quote=${JUPITER_QUOTE_API} swap=${JUPITER_SWAP_API}`);
        }
    }
    /**
     * Get a quote for swapping SOL to LOTTO
     */
    async getQuote(solAmountLamports, slippagePercent = 0.5) {
        try {
            const slippageBps = Math.floor(slippagePercent * 100); // Convert percentage to basis points
            console.log(`📊 Getting Jupiter quote for ${solAmountLamports} lamports SOL → LOTTO`);
            console.log(`   Slippage: ${slippagePercent}% (${slippageBps} bps)`);
            const params = new URLSearchParams({
                inputMint: SOL_MINT,
                outputMint: this.lottoMintAddress,
                amount: solAmountLamports.toString(),
                slippageBps: slippageBps.toString(),
                onlyDirectRoutes: 'false', // Allow multi-hop routes for better prices
                asLegacyTransaction: 'false' // Use versioned transactions
            });
            const response = await axios_1.default.get(`${JUPITER_QUOTE_API}?${params.toString()}`, {
                timeout: 10000 // 10 second timeout
            });
            if (!response.data || !response.data.outAmount) {
                throw new Error('Invalid quote response from Jupiter');
            }
            const quote = response.data;
            const lottoAmount = parseFloat(quote.outAmount) / Math.pow(10, this.lottoDecimals);
            console.log(`   ✅ Quote received:`);
            console.log(`      Input: ${solAmountLamports} lamports SOL`);
            console.log(`      Output: ${lottoAmount.toFixed(6)} LOTTO`);
            console.log(`      Price Impact: ${quote.priceImpactPct}%`);
            console.log(`      Route: ${quote.routePlan?.length || 0} step(s)`);
            return quote;
        }
        catch (error) {
            console.error('❌ Jupiter quote failed:', error.message);
            if (error.response?.data) {
                console.error('   API Error:', JSON.stringify(error.response.data));
            }
            const host = new URL(JUPITER_QUOTE_API).hostname;
            if ((error?.code === 'ENOTFOUND') || /ENOTFOUND/i.test(error?.message || '')) {
                throw new Error(`Failed to get Jupiter quote: DNS resolution failed for ${host} (check network/DNS)`);
            }
            throw new Error(`Failed to get Jupiter quote: ${error.message}`);
        }
    }
    /**
     * Build a swap transaction for the frontend to sign
     * This creates an unsigned transaction that will be signed by Phantom wallet
     */
    async buildSwapTransaction(solAmountLamports, userPublicKey, slippagePercent = 0.5) {
        try {
            if (!this.lottoMintAddress) {
                throw new Error('LOTTO_MINT_ADDRESS not configured');
            }
            console.log(`\n🔄 Building Jupiter Swap Transaction: SOL → LOTTO`);
            console.log(`   Amount: ${solAmountLamports} lamports`);
            console.log(`   User: ${userPublicKey.toBase58().slice(0, 8)}...`);
            // Step 1: Get quote
            const quote = await this.getQuote(solAmountLamports, slippagePercent);
            // Step 2: Get swap transaction from Jupiter
            console.log(`📝 Requesting swap transaction from Jupiter...`);
            const swapResponse = await axios_1.default.post(JUPITER_SWAP_API, {
                quoteResponse: quote,
                userPublicKey: userPublicKey.toBase58(),
                wrapAndUnwrapSol: true, // Automatically wrap/unwrap SOL
                dynamicComputeUnitLimit: true, // Auto-calculate compute units
                prioritizationFeeLamports: {
                    priorityLevelWithMaxLamports: {
                        maxLamports: 1000000, // Max 0.001 SOL priority fee
                        priorityLevel: 'high' // Use high priority for faster confirmation
                    }
                }
            }, {
                timeout: 15000 // 15 second timeout
            });
            if (!swapResponse.data || !swapResponse.data.swapTransaction) {
                throw new Error('Invalid swap response from Jupiter');
            }
            const { swapTransaction, lastValidBlockHeight } = swapResponse.data;
            const expectedLottoAmount = quote.outAmount;
            console.log(`   ✅ Swap transaction built successfully`);
            console.log(`      Valid until block: ${lastValidBlockHeight}`);
            console.log(`      Expected LOTTO output: ${parseFloat(expectedLottoAmount) / Math.pow(10, this.lottoDecimals)} LOTTO`);
            return {
                transaction: swapTransaction,
                quote,
                lastValidBlockHeight,
                expectedLottoAmount,
                priceImpactPct: quote.priceImpactPct
            };
        }
        catch (error) {
            console.error(`❌ Failed to build swap transaction:`, error.message);
            if (error.response?.data) {
                console.error('   API Error:', JSON.stringify(error.response.data));
            }
            const host = new URL(JUPITER_SWAP_API).hostname;
            if ((error?.code === 'ENOTFOUND') || /ENOTFOUND/i.test(error?.message || '')) {
                throw new Error(`Failed to build swap transaction: DNS resolution failed for ${host} (check network/DNS)`);
            }
            throw new Error(`Failed to build swap transaction: ${error.message}`);
        }
    }
    /**
     * Build multiple swap transactions (one per winner)
     * Each winner gets a separate swap transaction
     */
    async buildMultipleSwapTransactions(winners, slippagePercent = 0.5) {
        const swapTxs = [];
        for (const winner of winners) {
            try {
                const winnerPubkey = new web3_js_1.PublicKey(winner.address);
                const swapTx = await this.buildSwapTransaction(winner.amountLamports, winnerPubkey, slippagePercent);
                swapTxs.push({
                    ...swapTx,
                    winnerAddress: winner.address,
                    tier: winner.tier
                });
                console.log(`   ✅ Built swap for ${winner.tier}: ${winner.address.slice(0, 8)}...`);
            }
            catch (error) {
                console.error(`   ❌ Failed to build swap for ${winner.tier}: ${error.message}`);
                throw error; // Fail fast if any swap transaction fails
            }
        }
        return swapTxs;
    }
    /**
     * Check if Jupiter swap is available and configured
     */
    isAvailable() {
        return !!this.lottoMintAddress;
    }
    /**
     * Get the LOTTO mint address
     */
    getLottoMintAddress() {
        return this.lottoMintAddress;
    }
    /**
     * Get LOTTO decimals
     */
    getLottoDecimals() {
        return this.lottoDecimals;
    }
    /**
     * Format LOTTO amount from raw amount (with decimals)
     */
    formatLottoAmount(rawAmount) {
        return parseFloat(rawAmount) / Math.pow(10, this.lottoDecimals);
    }
    /**
     * Connectivity diagnostics for Jupiter API (DNS + config)
     */
    async diagnostics() {
        const host = new URL(JUPITER_API_BASE).hostname;
        let dnsResult = {
            host,
            ok: false
        };
        try {
            const lookup = await dns_1.default.promises.lookup(host);
            dnsResult = { host, ok: true, address: lookup.address };
        }
        catch (e) {
            dnsResult = { host, ok: false, error: e?.message || String(e) };
        }
        return {
            configured: !!this.lottoMintAddress,
            lottoMintAddress: this.lottoMintAddress || null,
            lottoDecimals: this.lottoDecimals,
            apiBaseUrl: JUPITER_API_BASE,
            endpoints: { quote: JUPITER_QUOTE_API, swap: JUPITER_SWAP_API },
            dns: dnsResult
        };
    }
}
exports.JupiterService = JupiterService;
// Singleton instance
let jupiterServiceInstance = null;
function getJupiterService() {
    if (!jupiterServiceInstance) {
        jupiterServiceInstance = new JupiterService();
    }
    return jupiterServiceInstance;
}
