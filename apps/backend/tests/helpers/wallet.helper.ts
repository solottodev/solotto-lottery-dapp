import { Keypair, PublicKey } from '@solana/web3.js';

/**
 * Generate a test wallet keypair
 */
export function generateTestWallet(): {
  keypair: Keypair;
  publicKey: string;
  privateKey: string;
} {
  const keypair = Keypair.generate();

  return {
    keypair,
    publicKey: keypair.publicKey.toBase58(),
    privateKey: Buffer.from(keypair.secretKey).toString('base64'),
  };
}

/**
 * Generate multiple test wallets
 */
export function generateTestWallets(count: number): Array<{
  keypair: Keypair;
  publicKey: string;
  privateKey: string;
}> {
  return Array.from({ length: count }, () => generateTestWallet());
}

/**
 * Validate a Solana public key
 */
export function isValidPublicKey(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Common test wallet addresses (for blacklist testing)
 */
export const TEST_WALLETS = {
  SYSTEM_PROGRAM: '11111111111111111111111111111111',
  TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  ASSOCIATED_TOKEN_PROGRAM: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
};

/**
 * Generate a test wallet with a known seed (for reproducible tests)
 */
export function generateTestWalletFromSeed(seed: Uint8Array): {
  keypair: Keypair;
  publicKey: string;
  privateKey: string;
} {
  const keypair = Keypair.fromSeed(seed.slice(0, 32));

  return {
    keypair,
    publicKey: keypair.publicKey.toBase58(),
    privateKey: Buffer.from(keypair.secretKey).toString('base64'),
  };
}
