// apps/backend/src/services/price.service.ts
import axios from 'axios';

interface CoinGeckoPriceResponse {
  [tokenAddress: string]: {
    usd: number;
  };
}

interface DexScreenerPair {
  priceUsd: string;
}

interface DexScreenerResponse {
  pairs?: DexScreenerPair[];
}

export class PriceService {
  private readonly COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/token_price/solana';
  private readonly DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens';

  // Simple in-memory cache with 5-minute TTL to reduce API calls
  private priceCache: { price: number; timestamp: number; source: string } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Fetch current LOTTO token price with caching and fallback
   * Strategy:
   * 1. Check cache first (5min TTL)
   * 2. Try CoinGecko API
   * 3. Fallback to DexScreener if CoinGecko rate limits
   * @param tokenMint - Solana token mint address
   * @returns Price in USD
   */
  async getLottoUsdPrice(tokenMint: string): Promise<number> {
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
    } catch (error: any) {
      console.warn('⚠️ CoinGecko failed, trying DexScreener fallback...', error.message);

      // Fallback to DexScreener
      try {
        const price = await this.fetchFromDexScreener(tokenMint);
        this.priceCache = { price, timestamp: Date.now(), source: 'DexScreener' };
        return price;
      } catch (fallbackError: any) {
        console.error('❌ All price sources failed');
        throw new Error(`Failed to fetch token price from any source. Please enter manually.`);
      }
    }
  }

  /**
   * Fetch price from CoinGecko API
   */
  private async fetchFromCoinGecko(tokenMint: string): Promise<number> {
    console.log(`💵 Fetching LOTTO price from CoinGecko for ${tokenMint}...`);

    const response = await axios.get<CoinGeckoPriceResponse>(this.COINGECKO_API, {
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
  private async fetchFromDexScreener(tokenMint: string): Promise<number> {
    console.log(`🔄 Fetching LOTTO price from DexScreener for ${tokenMint}...`);

    const response = await axios.get<DexScreenerResponse>(
      `${this.DEXSCREENER_API}/${tokenMint}`,
      {
        timeout: 10000,
      }
    );

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
  validatePrice(price: number): { valid: boolean; error?: string } {
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

// Singleton instance
let priceServiceInstance: PriceService | null = null;

export function getPriceService(): PriceService {
  if (!priceServiceInstance) {
    priceServiceInstance = new PriceService();
  }
  return priceServiceInstance;
}
