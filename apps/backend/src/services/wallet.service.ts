// wallet.service.ts
// Service for loading and managing operator wallet keypairs

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * WalletService - Manages operator wallet keypair loading
 *
 * Features:
 * - Loads keypair from environment variable or JSON file
 * - Supports both base58 and JSON array formats
 * - Secure private key handling
 * - Singleton pattern for consistent keypair usage
 */
class WalletService {
  private operatorKeypair: Keypair | null = null;

  /**
   * Load operator wallet keypair from environment
   * Supports two formats:
   * 1. Base58 private key: OPERATOR_WALLET_PRIVATE_KEY="base58string"
   * 2. JSON array: OPERATOR_WALLET_JSON="[1,2,3,...]"
   *
   * @returns Loaded keypair
   * @throws Error if keypair cannot be loaded
   */
  loadOperatorKeypair(): Keypair {
    if (this.operatorKeypair) {
      return this.operatorKeypair; // Return cached keypair
    }

    // Try loading from base58 private key
    const base58Key = process.env.OPERATOR_WALLET_PRIVATE_KEY;
    if (base58Key && base58Key.trim() !== '' && base58Key !== 'your_base58_encoded_private_key') {
      try {
        const decoded = bs58.decode(base58Key);
        this.operatorKeypair = Keypair.fromSecretKey(decoded);
        console.log(`✅ Loaded operator wallet: ${this.operatorKeypair.publicKey.toBase58()}`);
        return this.operatorKeypair;
      } catch (error) {
        console.error('❌ Failed to decode base58 private key:', error);
        throw new Error('Invalid OPERATOR_WALLET_PRIVATE_KEY format');
      }
    }

    // Try loading from JSON array
    const jsonKey = process.env.OPERATOR_WALLET_JSON;
    if (jsonKey && jsonKey.trim() !== '') {
      try {
        const secretKey = JSON.parse(jsonKey);
        if (!Array.isArray(secretKey) || secretKey.length !== 64) {
          throw new Error('Invalid secret key array length');
        }
        this.operatorKeypair = Keypair.fromSecretKey(Uint8Array.from(secretKey));
        console.log(`✅ Loaded operator wallet: ${this.operatorKeypair.publicKey.toBase58()}`);
        return this.operatorKeypair;
      } catch (error) {
        console.error('❌ Failed to parse JSON private key:', error);
        throw new Error('Invalid OPERATOR_WALLET_JSON format');
      }
    }

    throw new Error(
      'Operator wallet not configured. Set OPERATOR_WALLET_PRIVATE_KEY or OPERATOR_WALLET_JSON in .env'
    );
  }

  /**
   * Get cached operator keypair
   * @returns Cached keypair or null if not loaded
   */
  getOperatorKeypair(): Keypair | null {
    return this.operatorKeypair;
  }

  /**
   * Get operator wallet public key as string
   * @returns Public key string or null
   */
  getOperatorAddress(): string | null {
    return this.operatorKeypair?.publicKey.toBase58() || null;
  }

  /**
   * Clear cached keypair (useful for testing)
   */
  clearKeypair(): void {
    this.operatorKeypair = null;
  }
}

// Singleton instance
let walletServiceInstance: WalletService | null = null;

export const getWalletService = (): WalletService => {
  if (!walletServiceInstance) {
    walletServiceInstance = new WalletService();
  }
  return walletServiceInstance;
};

export default WalletService;
