"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// apps/backend/src/routes/price.ts
const express_1 = __importDefault(require("express"));
const requireJwt_1 = require("../middleware/requireJwt");
const price_service_1 = require("../services/price.service");
const router = express_1.default.Router();
/**
 * GET /api/price/current
 * Fetch current LOTTO price from CoinGecko for "Fetch Price" button
 */
router.get('/current', requireJwt_1.requireJwt, async (req, res) => {
    try {
        // Use mainnet LOTTO token mint for price fetching
        // This should always be the mainnet token regardless of which network we're testing on
        const tokenMint = process.env.LOTTO_PRICE_MINT || 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump';
        console.log(`💵 Fetching price for token mint: ${tokenMint}`);
        if (!tokenMint) {
            return res.status(500).json({
                error: 'Token mint not configured',
                message: 'LOTTO_PRICE_MINT environment variable is missing',
            });
        }
        const priceService = (0, price_service_1.getPriceService)();
        const price = await priceService.getLottoUsdPrice(tokenMint);
        // Get the cached source to show which API was used
        const source = priceService.priceCache?.source || 'CoinGecko';
        return res.json({
            success: true,
            price,
            source,
            timestamp: new Date().toISOString(),
            tokenMint,
        });
    }
    catch (error) {
        console.error('GET /price/current failed:', error);
        return res.status(500).json({
            success: false,
            error: 'Failed to fetch price',
            message: error.message,
        });
    }
});
exports.default = router;
