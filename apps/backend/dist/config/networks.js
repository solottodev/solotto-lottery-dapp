"use strict";
// apps/backend/src/config/networks.ts
// Network-specific configuration for mainnet vs devnet
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNetworkConfig = getNetworkConfig;
exports.isMainnet = isMainnet;
exports.isDevnet = isDevnet;
exports.getExplorerUrl = getExplorerUrl;
exports.getTokenExplorerUrl = getTokenExplorerUrl;
exports.getAddressExplorerUrl = getAddressExplorerUrl;
const MAINNET_CONFIG = {
    network: 'mainnet-beta',
    rpcUrl: process.env.ALCHEMY_RPC_URL_MAINNET || 'https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY',
    rpcFallback: 'https://api.mainnet-beta.solana.com',
    lottoMint: 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump', // Real mainnet $LOTTO
    lottoDecimals: 6,
    explorerUrl: 'https://solscan.io',
};
const DEVNET_CONFIG = {
    network: 'devnet',
    rpcUrl: process.env.ALCHEMY_RPC_URL || 'https://solana-devnet.g.alchemy.com/v2/YOUR_KEY',
    rpcFallback: 'https://api.devnet.solana.com',
    lottoMint: process.env.LOTTO_MINT_ADDRESS || 'REPLACE_WITH_DEVNET_TEST_TOKEN', // Test token
    lottoDecimals: 6,
    explorerUrl: 'https://solscan.io',
};
const TESTNET_CONFIG = {
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
function getNetworkConfig() {
    const network = (process.env.SOLANA_NETWORK || 'devnet');
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
function isMainnet() {
    return getNetworkConfig().network === 'mainnet-beta';
}
/**
 * Check if running on devnet
 */
function isDevnet() {
    return getNetworkConfig().network === 'devnet';
}
/**
 * Get explorer URL for a transaction
 */
function getExplorerUrl(signature) {
    const config = getNetworkConfig();
    const cluster = config.network === 'mainnet-beta' ? '' : `?cluster=${config.network}`;
    return `${config.explorerUrl}/tx/${signature}${cluster}`;
}
/**
 * Get explorer URL for a token
 */
function getTokenExplorerUrl(mint) {
    const config = getNetworkConfig();
    const cluster = config.network === 'mainnet-beta' ? '' : `?cluster=${config.network}`;
    return `${config.explorerUrl}/token/${mint}${cluster}`;
}
/**
 * Get explorer URL for an address
 */
function getAddressExplorerUrl(address) {
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
exports.default = getNetworkConfig;
