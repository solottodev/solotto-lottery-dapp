// apps/backend/src/routes/price.ts
import express from 'express';
import { requireJwt } from '../middleware/requireJwt';
import { getPriceService } from '../services/price.service';

const router = express.Router();

/**
 * GET /api/price/current
 * Fetch current LOTTO price from CoinGecko for "Fetch Price" button
 */
router.get('/current', requireJwt, async (req, res) => {
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

    const priceService = getPriceService();
    const price = await priceService.getLottoUsdPrice(tokenMint);

    return res.json({
      success: true,
      price,
      source: 'CoinGecko',
      timestamp: new Date().toISOString(),
      tokenMint,
    });
  } catch (error: any) {
    console.error('GET /price/current failed:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch price',
      message: error.message,
    });
  }
});

export default router;
