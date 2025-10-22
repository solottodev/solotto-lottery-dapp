"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RPCService = void 0;
exports.getRPCService = getRPCService;
exports.getConnection = getConnection;
// apps/backend/src/services/rpc.service.ts
const web3_js_1 = require("@solana/web3.js");
const networks_1 = require("../config/networks");
/**
 * RPC Service with Alchemy integration and fallback support
 */
class RPCService {
    constructor() {
        this.preferPrimary = true;
        const networkConfig = (0, networks_1.getNetworkConfig)();
        const alchemyUrl = networkConfig.rpcUrl;
        const fallbackUrl = networkConfig.rpcFallback;
        if (!alchemyUrl || alchemyUrl.includes('YOUR_KEY')) {
            console.warn('⚠️  ALCHEMY_RPC_URL not configured, using fallback only');
        }
        const config = {
            commitment: 'confirmed',
            confirmTransactionInitialTimeout: 60000,
        };
        this.primaryConnection = new web3_js_1.Connection(alchemyUrl || fallbackUrl, config);
        this.fallbackConnection = new web3_js_1.Connection(fallbackUrl, config);
        console.log('✅ RPC Service initialized');
        console.log(`   Network: ${networkConfig.network}`);
        console.log(`   Primary: ${alchemyUrl ? 'Alchemy' : 'Fallback'}`);
        console.log(`   Fallback: ${fallbackUrl}`);
    }
    /**
     * Get the active connection (with automatic fallback)
     */
    getConnection() {
        return this.preferPrimary ? this.primaryConnection : this.fallbackConnection;
    }
    /**
     * Execute RPC call with automatic fallback on failure
     */
    async executeWithFallback(operation, operationName = 'RPC operation') {
        try {
            // Try primary (Alchemy)
            const result = await operation(this.primaryConnection);
            // Reset to prefer primary if it was temporarily disabled
            if (!this.preferPrimary) {
                console.log('✅ Primary RPC restored');
                this.preferPrimary = true;
            }
            return result;
        }
        catch (primaryError) {
            console.warn(`⚠️  Primary RPC failed for ${operationName}, trying fallback...`);
            console.error(primaryError);
            try {
                // Try fallback
                const result = await operation(this.fallbackConnection);
                // Temporarily prefer fallback
                this.preferPrimary = false;
                console.log(`✅ Fallback RPC succeeded for ${operationName}`);
                return result;
            }
            catch (fallbackError) {
                console.error(`❌ Both primary and fallback RPC failed for ${operationName}`);
                console.error('Primary error:', primaryError);
                console.error('Fallback error:', fallbackError);
                throw new Error(`RPC operation failed: ${operationName}`);
            }
        }
    }
    /**
     * Get wallet SOL balance with fallback
     */
    async getBalance(publicKey) {
        return this.executeWithFallback(async (conn) => await conn.getBalance(publicKey), `getBalance(${publicKey.toBase58()})`);
    }
    /**
     * Get token accounts by owner with fallback
     */
    async getTokenAccountsByOwner(owner, filter) {
        return this.executeWithFallback(async (conn) => await conn.getTokenAccountsByOwner(owner, filter), `getTokenAccountsByOwner(${owner.toBase58()})`);
    }
    /**
     * Get multiple accounts with fallback
     */
    async getMultipleAccountsInfo(publicKeys) {
        return this.executeWithFallback(async (conn) => await conn.getMultipleAccountsInfo(publicKeys), `getMultipleAccountsInfo(${publicKeys.length} accounts)`);
    }
    /**
     * Get parsed token accounts by owner (Alchemy-optimized)
     */
    async getParsedTokenAccountsByOwner(owner, options) {
        return this.executeWithFallback(async (conn) => {
            if (options.mint) {
                return await conn.getParsedTokenAccountsByOwner(owner, { mint: options.mint });
            }
            else if (options.programId) {
                return await conn.getParsedTokenAccountsByOwner(owner, { programId: options.programId });
            }
            else {
                throw new Error('Either mint or programId must be provided');
            }
        }, `getParsedTokenAccountsByOwner(${owner.toBase58()})`);
    }
    /**
     * Get recent blockhash with fallback
     */
    async getLatestBlockhash() {
        return this.executeWithFallback(async (conn) => await conn.getLatestBlockhash(), 'getLatestBlockhash');
    }
    /**
     * Test RPC connectivity with timeout
     */
    async testConnections() {
        const testConnection = async (conn, name) => {
            try {
                // Add timeout to prevent hanging
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout after 5s')), 5000));
                const slotPromise = conn.getSlot();
                const slot = await Promise.race([slotPromise, timeoutPromise]);
                console.log(`✅ ${name} RPC healthy (slot: ${slot})`);
                return { healthy: true, slot };
            }
            catch (error) {
                console.error(`❌ ${name} RPC unhealthy:`, error);
                return { healthy: false, error: error instanceof Error ? error.message : String(error) };
            }
        };
        const [primary, fallback] = await Promise.all([
            testConnection(this.primaryConnection, 'Primary (Alchemy)'),
            testConnection(this.fallbackConnection, 'Fallback'),
        ]);
        return { primary, fallback };
    }
}
exports.RPCService = RPCService;
// Singleton instance
let rpcServiceInstance = null;
function getRPCService() {
    if (!rpcServiceInstance) {
        rpcServiceInstance = new RPCService();
    }
    return rpcServiceInstance;
}
function getConnection() {
    return getRPCService().getConnection();
}
