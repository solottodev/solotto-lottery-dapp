// apps/backend/src/services/price.service.ts
import axios from 'axios';

interface CoinGeckoPriceResponse {
  [tokenAddress: string]: {
    usd: number;
  };
}

export class PriceService {
  private readonly COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/token_price/solana';

  /**
   * Fetch current LOTTO token price from CoinGecko
   * @param tokenMint - Solana token mint address
   * @returns Price in USD
   */
  async getLottoUsdPrice(tokenMint: string): Promise<number> {
    try {
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
      console.log(`✅ LOTTO price: $${price.toFixed(8)} USD`);

      return price;
    } catch (error: any) {
      console.error('❌ Failed to fetch LOTTO price:', error.message);

      // Re-throw with user-friendly message
      if (error.response?.status === 404) {
        throw new Error('Token not found on CoinGecko. Token may not be listed yet.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('CoinGecko API timeout. Please try again.');
      } else {
        throw new Error('Failed to fetch token price. Please enter manually.');
      }
    }
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
