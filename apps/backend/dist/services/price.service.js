"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PriceService = void 0;
exports.getPriceService = getPriceService;
// apps/backend/src/services/price.service.ts
const axios_1 = __importDefault(require("axios"));
class PriceService {
    constructor() {
        this.COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/token_price/solana';
        this.DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens';
        // Simple in-memory cache with 5-minute TTL to reduce API calls
        this.priceCache = null;
        this.CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    }
    /**
     * Fetch current LOTTO token price with caching and fallback
     * Strategy:
     * 1. Check cache first (5min TTL)
     * 2. Try CoinGecko API
     * 3. Fallback to DexScreener if CoinGecko rate limits
     * @param tokenMint - Solana token mint address
     * @returns Price in USD
     */
    async getLottoUsdPrice(tokenMint) {
        // Check cache first
        if (this.priceCache && Date.now() - this.priceCache.timestamp < this.CACHE_TTL) {
            console.log(`💰 Using cached price: $${this.priceCache.price} (source: ${this.priceCache.source})`);
            return this.priceCache.price;
        }
        // Try CoinGecko first
        try {
            const price = await this.fetchFromCoinGecko(tokenMint);
            this.priceCache = { price, timestamp: Date.now(), source: 'CoinGecko' };
            return price;
        }
        catch (error) {
            console.warn('⚠️ CoinGecko failed, trying DexScreener fallback...', error.message);
            // Fallback to DexScreener
            try {
                const price = await this.fetchFromDexScreener(tokenMint);
                this.priceCache = { price, timestamp: Date.now(), source: 'DexScreener' };
                return price;
            }
            catch (fallbackError) {
                console.error('❌ All price sources failed');
                throw new Error(`Failed to fetch token price from any source. Please enter manually.`);
            }
        }
    }
    /**
     * Fetch price from CoinGecko API
     */
    async fetchFromCoinGecko(tokenMint) {
        console.log(`💵 Fetching LOTTO price from CoinGecko for ${tokenMint}...`);
        const response = await axios_1.default.get(this.COINGECKO_API, {
            params: {
                contract_addresses: tokenMint,
                vs_currencies: 'usd',
            },
            timeout: 10000, // 10 second timeout
        });
        const priceData = response.data[tokenMint];
        if (!priceData || typeof priceData.usd !== 'number') {
            throw new Error(`Price data not found for token ${tokenMint}`);
        }
        const price = priceData.usd;
        console.log(`✅ CoinGecko price: $${price.toFixed(8)} USD`);
        return price;
    }
    /**
     * Fetch price from DexScreener API (fallback when CoinGecko rate limits)
     */
    async fetchFromDexScreener(tokenMint) {
        console.log(`🔄 Fetching LOTTO price from DexScreener for ${tokenMint}...`);
        const response = await axios_1.default.get(`${this.DEXSCREENER_API}/${tokenMint}`, {
            timeout: 10000,
        });
        // DexScreener returns multiple pairs, we'll use the first one with highest liquidity
        if (!response.data.pairs || response.data.pairs.length === 0) {
            throw new Error('No trading pairs found on DexScreener');
        }
        // Get the first pair (usually the main pair with highest liquidity)
        const mainPair = response.data.pairs[0];
        const price = parseFloat(mainPair.priceUsd);
        if (isNaN(price) || price <= 0) {
            throw new Error('Invalid price data from DexScreener');
        }
        console.log(`✅ DexScreener price: $${price.toFixed(8)} USD`);
        return price;
    }
    /**
     * Validate that a manually entered price is reasonable
     */
    validatePrice(price) {
        if (price <= 0) {
            return { valid: false, error: 'Price must be positive' };
        }
        if (price > 1000) {
            return { valid: false, error: 'Price seems unrealistic (>$1000). Please verify.' };
        }
        if (price < 0.00000001) {
            return { valid: false, error: 'Price too small (<$0.00000001). Please verify.' };
        }
        return { valid: true };
    }
}
exports.PriceService = PriceService;
// Singleton instance
let priceServiceInstance = null;
function getPriceService() {
    if (!priceServiceInstance) {
        priceServiceInstance = new PriceService();
    }
    return priceServiceInstance;
}
