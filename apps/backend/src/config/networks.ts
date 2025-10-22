// apps/backend/src/config/networks.ts
// Network-specific configuration for mainnet vs devnet

export type NetworkType = 'mainnet-beta' | 'devnet' | 'testnet';

export interface NetworkConfig {
  network: NetworkType;
  rpcUrl: string;
  rpcFallback: string;
  lottoMint: string;
  lottoDecimals: number;
  explorerUrl: string;
}

const MAINNET_CONFIG: NetworkConfig = {
  network: 'mainnet-beta',
  rpcUrl: process.env.ALCHEMY_RPC_URL_MAINNET || process.env.ALCHEMY_RPC_URL || 'https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY',
  rpcFallback: process.env.SOLANA_RPC_FALLBACK || 'https://api.mainnet-beta.solana.com',
  lottoMint: 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump', // Real mainnet $LOTTO
  lottoDecimals: 6,
  explorerUrl: 'https://solscan.io',
};

const DEVNET_CONFIG: NetworkConfig = {
  network: 'devnet',
  rpcUrl: process.env.ALCHEMY_RPC_URL || 'https://solana-devnet.g.alchemy.com/v2/YOUR_KEY',
  rpcFallback: 'https://api.devnet.solana.com',
  lottoMint: process.env.LOTTO_MINT_ADDRESS || 'REPLACE_WITH_DEVNET_TEST_TOKEN', // Test token
  lottoDecimals: 6,
  explorerUrl: 'https://solscan.io',
};

const TESTNET_CONFIG: NetworkConfig = {
  network: 'testnet',
  rpcUrl: 'https://api.testnet.solana.com',
  rpcFallback: 'https://api.testnet.solana.com',
  lottoMint: process.env.LOTTO_MINT_ADDRESS || 'REPLACE_WITH_TESTNET_TOKEN',
  lottoDecimals: 6,
  explorerUrl: 'https://solscan.io',
};

/**
 * Get network configuration based on environment
 */
export function getNetworkConfig(): NetworkConfig {
  const network = (process.env.SOLANA_NETWORK || 'devnet') as NetworkType;

  switch (network) {
    case 'mainnet-beta':
      return MAINNET_CONFIG;
    case 'testnet':
      return TESTNET_CONFIG;
    case 'devnet':
    default:
      return DEVNET_CONFIG;
  }
}

/**
 * Check if running on mainnet
 */
export function isMainnet(): boolean {
  return getNetworkConfig().network === 'mainnet-beta';
}

/**
 * Check if running on devnet
 */
export function isDevnet(): boolean {
  return getNetworkConfig().network === 'devnet';
}

/**
 * Get explorer URL for a transaction
 */
export function getExplorerUrl(signature: string): string {
  const config = getNetworkConfig();
  const cluster = config.network === 'mainnet-beta' ? '' : `?cluster=${config.network}`;
  return `${config.explorerUrl}/tx/${signature}${cluster}`;
}

/**
 * Get explorer URL for a token
 */
export function getTokenExplorerUrl(mint: string): string {
  const config = getNetworkConfig();
  const cluster = config.network === 'mainnet-beta' ? '' : `?cluster=${config.network}`;
  return `${config.explorerUrl}/token/${mint}${cluster}`;
}

/**
 * Get explorer URL for an address
 */
export function getAddressExplorerUrl(address: string): string {
  const config = getNetworkConfig();
  const cluster = config.network === 'mainnet-beta' ? '' : `?cluster=${config.network}`;
  return `${config.explorerUrl}/address/${address}${cluster}`;
}

// Log current network on startup
const currentConfig = getNetworkConfig();
console.log('🌐 Network Configuration:');
console.log(`   Network: ${currentConfig.network}`);
console.log(`   RPC: ${currentConfig.rpcUrl.replace(/\/v2\/.*/, '/v2/***')}`);
console.log(`   $LOTTO Mint: ${currentConfig.lottoMint}`);
console.log(`   Explorer: ${currentConfig.explorerUrl}`);

export default getNetworkConfig;
