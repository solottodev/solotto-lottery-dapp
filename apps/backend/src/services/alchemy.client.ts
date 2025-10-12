// apps/backend/src/services/alchemy.client.ts
import axios from 'axios';
import { PublicKey } from '@solana/web3.js';

interface AlchemyTokenAccount {
  pubkey: string;
  account: {
    data: {
      parsed: {
        info: {
          tokenAmount: {
            amount: string;
            decimals: number;
            uiAmount: number;
            uiAmountString: string;
          };
          mint: string;
          owner: string;
        };
      };
    };
  };
}

interface AlchemyAssetsByOwnerResponse {
  jsonrpc: string;
  result: {
    items: Array<{
      id: string;
      interface: string;
      content: {
        metadata: {
          name: string;
          symbol: string;
        };
      };
      token_info?: {
        balance: number;
        decimals: number;
        supply: number;
        price_info?: {
          price_per_token: number;
          currency: string;
        };
      };
    }>;
    total: number;
    limit: number;
  };
}

export interface TokenHolder {
  owner: string;
  balance: bigint;
  balanceUi: number;
  tokenAccount: string;
}

/**
 * Alchemy API Client for enhanced Solana features
 */
export class AlchemyClient {
  private axios: any;
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.ALCHEMY_API_KEY || '';
    const baseURL = process.env.ALCHEMY_RPC_URL;

    if (!this.apiKey || !baseURL) {
      throw new Error('Alchemy API key and RPC URL must be configured');
    }

    this.axios = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Alchemy client initialized');
  }

  /**
   * Get all token holders for a specific mint address
   * Uses Alchemy's enhanced token API
   */
  async getTokenHolders(
    mintAddress: string,
    options: {
      minBalance?: number;
      limit?: number;
    } = {}
  ): Promise<TokenHolder[]> {
    const { minBalance = 0, limit = 1000 } = options;

    console.log(`🔍 Fetching token holders for mint: ${mintAddress}`);

    try {
      // Use Alchemy's getTokenAccountsByOwner with pagination
      const holders: TokenHolder[] = [];
      let page = 1;
      const pageSize = 100;

      // Note: Alchemy doesn't have a direct "get all holders" endpoint
      // We need to use getProgramAccounts with filters
      const response = await this.axios.post('', {
        jsonrpc: '2.0',
        id: 1,
        method: 'getProgramAccounts',
        params: [
          'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', // SPL Token Program
          {
            encoding: 'jsonParsed',
            filters: [
              {
                dataSize: 165, // Size of token account
              },
              {
                memcmp: {
                  offset: 0,
                  bytes: mintAddress, // Filter by mint
                },
              },
            ],
          },
        ],
      });

      if (response.data.result) {
        const accounts = response.data.result as AlchemyTokenAccount[];

        for (const account of accounts) {
          const parsed = account.account.data.parsed;
          const tokenAmount = parsed.info.tokenAmount;

          // Filter by minimum balance
          if (tokenAmount.uiAmount >= minBalance) {
            holders.push({
              owner: parsed.info.owner,
              balance: BigInt(tokenAmount.amount),
              balanceUi: tokenAmount.uiAmount,
              tokenAccount: account.pubkey,
            });
          }

          // Respect limit
          if (holders.length >= limit) {
            break;
          }
        }
      }

      console.log(`✅ Found ${holders.length} token holders`);
      return holders;
    } catch (error) {
      console.error('❌ Failed to fetch token holders:', error);
      throw new Error('Failed to fetch token holders from Alchemy');
    }
  }

  /**
   * Get token balance for a specific owner
   */
  async getTokenBalance(
    owner: string,
    mintAddress: string
  ): Promise<{ balance: bigint; balanceUi: number } | null> {
    try {
      const ownerPubkey = new PublicKey(owner);
      const mintPubkey = new PublicKey(mintAddress);

      const response = await this.axios.post('', {
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          owner,
          {
            mint: mintAddress,
          },
          {
            encoding: 'jsonParsed',
          },
        ],
      });

      if (response.data.result?.value?.length > 0) {
        const account = response.data.result.value[0] as AlchemyTokenAccount;
        const tokenAmount = account.account.data.parsed.info.tokenAmount;

        return {
          balance: BigInt(tokenAmount.amount),
          balanceUi: tokenAmount.uiAmount,
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ Failed to get token balance for ${owner}:`, error);
      return null;
    }
  }

  /**
   * Get enhanced asset information (if available on Alchemy)
   */
  async getAssetsByOwner(owner: string, options: { limit?: number } = {}) {
    try {
      const response = await this.axios.post('', {
        jsonrpc: '2.0',
        id: 1,
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: owner,
          page: 1,
          limit: options.limit || 100,
        },
      });

      return response.data;
    } catch (error) {
      // This endpoint might not be available on all Alchemy tiers
      console.warn('⚠️  getAssetsByOwner not available:', error);
      return null;
    }
  }

  /**
   * Batch fetch token balances for multiple owners
   */
  async batchGetTokenBalances(
    owners: string[],
    mintAddress: string
  ): Promise<Map<string, { balance: bigint; balanceUi: number }>> {
    const results = new Map<string, { balance: bigint; balanceUi: number }>();

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < owners.length; i += batchSize) {
      const batch = owners.slice(i, i + batchSize);

      const promises = batch.map((owner) => this.getTokenBalance(owner, mintAddress));

      const batchResults = await Promise.all(promises);

      batch.forEach((owner, index) => {
        const result = batchResults[index];
        if (result) {
          results.set(owner, result);
        }
      });

      // Rate limiting: wait 100ms between batches
      if (i + batchSize < owners.length) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Test Alchemy connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.axios.post('', {
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth',
        params: [],
      });

      const isHealthy = response.data.result === 'ok';
      console.log(isHealthy ? '✅ Alchemy connection healthy' : '⚠️  Alchemy connection degraded');
      return isHealthy;
    } catch (error) {
      console.error('❌ Alchemy connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let alchemyClientInstance: AlchemyClient | null = null;

export function getAlchemyClient(): AlchemyClient {
  if (!alchemyClientInstance) {
    alchemyClientInstance = new AlchemyClient();
  }
  return alchemyClientInstance;
}
