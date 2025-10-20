"use strict";
// transfer.service.ts
// Service for handling SOL and SPL token transfers on Solana
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransferService = void 0;
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const rpc_service_1 = require("./rpc.service");
/**
 * TransferService - Handles SOL and SPL token transfers
 *
 * Features:
 * - SOL transfers with priority fees
 * - SPL token transfers with automatic ATA creation
 * - Transaction confirmation polling
 * - Retry logic for failed transactions
 * - Comprehensive error handling
 */
class TransferService {
    constructor() {
        this.rpcService = (0, rpc_service_1.getRPCService)();
    }
    /**
     * Transfer SOL from operator wallet to recipient
     *
     * @param fromKeypair - Operator wallet keypair
     * @param toAddress - Recipient wallet address
     * @param amountSol - Amount in SOL
     * @param priorityFeeLamports - Optional priority fee (default: 1000 lamports)
     * @returns Transfer result with signature
     */
    async transferSOL(fromKeypair, toAddress, amountSol, priorityFeeLamports = 1000) {
        console.log(`\n💸 Transferring ${amountSol} SOL to ${toAddress.slice(0, 8)}...`);
        const connection = this.rpcService.getConnection();
        const toPubkey = new web3_js_1.PublicKey(toAddress);
        const amountLamports = Math.floor(amountSol * web3_js_1.LAMPORTS_PER_SOL);
        // Build transaction with priority fee
        const transaction = new web3_js_1.Transaction();
        // Add compute budget instruction for priority fee
        if (priorityFeeLamports > 0) {
            transaction.add(web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: priorityFeeLamports,
            }));
        }
        // Add transfer instruction
        transaction.add(web3_js_1.SystemProgram.transfer({
            fromPubkey: fromKeypair.publicKey,
            toPubkey,
            lamports: amountLamports,
        }));
        // Send and confirm transaction with fresh blockhash and proper retry logic
        let lastError = null;
        const maxAttempts = 3;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`  Attempt ${attempt}/${maxAttempts}...`);
                // ✅ Get FRESH blockhash for EVERY transaction attempt
                const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
                transaction.recentBlockhash = blockhash;
                transaction.lastValidBlockHeight = lastValidBlockHeight;
                transaction.feePayer = fromKeypair.publicKey;
                // Sign transaction with fresh blockhash
                transaction.sign(fromKeypair);
                // Send transaction (skip preflight for faster submission on devnet)
                const signature = await connection.sendRawTransaction(transaction.serialize(), {
                    skipPreflight: true, // ✅ Skip preflight for faster devnet submission
                    maxRetries: 0, // We handle retries manually
                });
                console.log(`  Transaction sent: ${signature}`);
                // ✅ Poll for confirmation using getSignatureStatuses (more reliable on devnet)
                const startTime = Date.now();
                const timeout = 60000; // 60 second timeout
                let confirmed = false;
                while (!confirmed && Date.now() - startTime < timeout) {
                    try {
                        const statuses = await connection.getSignatureStatuses([signature]);
                        const status = statuses.value[0];
                        if (status) {
                            if (status.err) {
                                throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
                            }
                            if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
                                confirmed = true;
                                console.log(`✅ SOL transfer confirmed: ${signature} (${status.confirmationStatus})`);
                                break;
                            }
                        }
                    }
                    catch (pollError) {
                        // Ignore polling errors, continue trying
                    }
                    // Wait 2 seconds before next poll
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                if (!confirmed) {
                    throw new Error(`Transaction ${signature} not confirmed within timeout`);
                }
                return {
                    signature,
                    recipient: toAddress,
                    amount: amountSol,
                    tokenMint: null,
                    ataAddress: null,
                    confirmationStatus: 'confirmed',
                };
            }
            catch (error) {
                lastError = error;
                const errorMsg = error instanceof Error ? error.message : String(error);
                console.error(`  ❌ Attempt ${attempt} failed:`, errorMsg);
                // Check if it's a blockhash expired error
                if (errorMsg.includes('block height exceeded') || errorMsg.includes('expired')) {
                    console.log(`  🔄 Blockhash expired, will retry with fresh blockhash...`);
                }
                if (attempt < maxAttempts) {
                    const waitTime = attempt * 2000; // 2s, 4s between retries
                    console.log(`  Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }
        console.error(`❌ SOL transfer failed after ${maxAttempts} attempts`);
        throw new Error(`SOL transfer failed after ${maxAttempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
    }
    /**
     * Transfer SPL tokens from operator to recipient
     * Automatically creates ATA if recipient doesn't have one
     *
     * @param fromKeypair - Operator wallet keypair
     * @param toAddress - Recipient wallet address
     * @param tokenMintAddress - Token mint address
     * @param amountTokens - Amount in token units (not decimals)
     * @param decimals - Token decimals (default: 6 for $LOTTO)
     * @param priorityFeeLamports - Optional priority fee
     * @returns Transfer result with signature and ATA address
     */
    async transferSPLToken(fromKeypair, toAddress, tokenMintAddress, amountTokens, decimals = 6, priorityFeeLamports = 1000) {
        console.log(`\n🪙 Transferring ${amountTokens} tokens to ${toAddress.slice(0, 8)}...`);
        const connection = this.rpcService.getConnection();
        const toPubkey = new web3_js_1.PublicKey(toAddress);
        const mintPubkey = new web3_js_1.PublicKey(tokenMintAddress);
        try {
            // Get or create sender's ATA
            const fromTokenAccount = await (0, spl_token_1.getOrCreateAssociatedTokenAccount)(connection, fromKeypair, mintPubkey, fromKeypair.publicKey);
            console.log(`  Sender ATA: ${fromTokenAccount.address.toBase58()}`);
            // Get or create recipient's ATA
            const toTokenAccount = await (0, spl_token_1.getOrCreateAssociatedTokenAccount)(connection, fromKeypair, // Payer for ATA creation
            mintPubkey, toPubkey);
            console.log(`  Recipient ATA: ${toTokenAccount.address.toBase58()}`);
            // Calculate amount with decimals
            const amountWithDecimals = Math.floor(amountTokens * Math.pow(10, decimals));
            // Build transaction
            const transaction = new web3_js_1.Transaction();
            // Add priority fee
            if (priorityFeeLamports > 0) {
                transaction.add(web3_js_1.ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: priorityFeeLamports,
                }));
            }
            // Add transfer instruction
            transaction.add((0, spl_token_1.createTransferInstruction)(fromTokenAccount.address, // source
            toTokenAccount.address, // destination
            fromKeypair.publicKey, // owner
            amountWithDecimals, // amount
            [], // multisig
            spl_token_1.TOKEN_PROGRAM_ID));
            // Send and confirm transaction with fresh blockhash and proper retry logic
            let lastError = null;
            const maxAttempts = 3;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    console.log(`  Attempt ${attempt}/${maxAttempts}...`);
                    // ✅ Get FRESH blockhash for EVERY transaction attempt
                    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
                    transaction.recentBlockhash = blockhash;
                    transaction.lastValidBlockHeight = lastValidBlockHeight;
                    transaction.feePayer = fromKeypair.publicKey;
                    // Sign transaction with fresh blockhash
                    transaction.sign(fromKeypair);
                    // Send transaction (skip preflight for faster submission on devnet)
                    const signature = await connection.sendRawTransaction(transaction.serialize(), {
                        skipPreflight: true, // ✅ Skip preflight for faster devnet submission
                        maxRetries: 0, // We handle retries manually
                    });
                    console.log(`  Transaction sent: ${signature}`);
                    // ✅ Poll for confirmation using getSignatureStatuses (more reliable on devnet)
                    const startTime = Date.now();
                    const timeout = 60000; // 60 second timeout
                    let confirmed = false;
                    while (!confirmed && Date.now() - startTime < timeout) {
                        try {
                            const statuses = await connection.getSignatureStatuses([signature]);
                            const status = statuses.value[0];
                            if (status) {
                                if (status.err) {
                                    throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
                                }
                                if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
                                    confirmed = true;
                                    console.log(`✅ Token transfer confirmed: ${signature} (${status.confirmationStatus})`);
                                    break;
                                }
                            }
                        }
                        catch (pollError) {
                            // Ignore polling errors, continue trying
                        }
                        // Wait 2 seconds before next poll
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                    if (!confirmed) {
                        throw new Error(`Transaction ${signature} not confirmed within timeout`);
                    }
                    return {
                        signature,
                        recipient: toAddress,
                        amount: amountTokens,
                        tokenMint: tokenMintAddress,
                        ataAddress: toTokenAccount.address.toBase58(),
                        confirmationStatus: 'confirmed',
                    };
                }
                catch (error) {
                    lastError = error;
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    console.error(`  ❌ Attempt ${attempt} failed:`, errorMsg);
                    // Check if it's a blockhash expired error
                    if (errorMsg.includes('block height exceeded') || errorMsg.includes('expired')) {
                        console.log(`  🔄 Blockhash expired, will retry with fresh blockhash...`);
                    }
                    if (attempt < maxAttempts) {
                        const waitTime = attempt * 2000; // 2s, 4s between retries
                        console.log(`  Waiting ${waitTime}ms before retry...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    }
                }
            }
            console.error(`❌ Token transfer failed after ${maxAttempts} attempts`);
            throw new Error(`Token transfer failed after ${maxAttempts} attempts: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
        }
        catch (error) {
            console.error(`❌ Token transfer setup failed:`, error);
            throw new Error(`Token transfer setup failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Get or create Associated Token Account for a wallet
     *
     * @param walletAddress - Wallet address
     * @param tokenMintAddress - Token mint address
     * @param payerKeypair - Payer for account creation (if needed)
     * @returns ATA address
     */
    async getOrCreateATA(walletAddress, tokenMintAddress, payerKeypair) {
        const connection = this.rpcService.getConnection();
        const walletPubkey = new web3_js_1.PublicKey(walletAddress);
        const mintPubkey = new web3_js_1.PublicKey(tokenMintAddress);
        const tokenAccount = await (0, spl_token_1.getOrCreateAssociatedTokenAccount)(connection, payerKeypair, mintPubkey, walletPubkey);
        return tokenAccount.address.toBase58();
    }
    /**
     * Check if a wallet has an ATA for a specific token
     *
     * @param walletAddress - Wallet address
     * @param tokenMintAddress - Token mint address
     * @returns ATA address if exists, null otherwise
     */
    async getATAIfExists(walletAddress, tokenMintAddress) {
        try {
            const connection = this.rpcService.getConnection();
            const walletPubkey = new web3_js_1.PublicKey(walletAddress);
            const mintPubkey = new web3_js_1.PublicKey(tokenMintAddress);
            const ataAddress = await (0, spl_token_1.getAssociatedTokenAddress)(mintPubkey, walletPubkey);
            // Check if account exists
            const accountInfo = await connection.getAccountInfo(ataAddress);
            if (accountInfo === null) {
                return null; // ATA doesn't exist
            }
            return ataAddress.toBase58();
        }
        catch (error) {
            console.error(`Error checking ATA:`, error);
            return null;
        }
    }
    /**
     * Batch transfer SOL to multiple recipients
     * Each transfer is sent in a separate transaction for better error handling
     *
     * @param fromKeypair - Operator wallet keypair
     * @param transfers - Array of {address, amount} pairs
     * @param priorityFeeLamports - Optional priority fee
     * @returns Array of transfer results
     */
    async batchTransferSOL(fromKeypair, transfers, priorityFeeLamports = 1000) {
        console.log(`\n📦 Batch transferring SOL to ${transfers.length} recipients`);
        const results = [];
        for (const transfer of transfers) {
            try {
                const result = await this.transferSOL(fromKeypair, transfer.address, transfer.amount, priorityFeeLamports);
                results.push(result);
            }
            catch (error) {
                console.error(`  ❌ Failed transfer to ${transfer.address}:`, error);
                // Continue with other transfers even if one fails
                // Caller can check results array for failures
            }
        }
        console.log(`✅ Batch transfer complete: ${results.length}/${transfers.length} successful`);
        return results;
    }
    /**
     * Batch transfer SPL tokens to multiple recipients
     *
     * @param fromKeypair - Operator wallet keypair
     * @param tokenMintAddress - Token mint address
     * @param transfers - Array of {address, amount} pairs
     * @param decimals - Token decimals
     * @param priorityFeeLamports - Optional priority fee
     * @returns Array of transfer results
     */
    async batchTransferSPLToken(fromKeypair, tokenMintAddress, transfers, decimals = 6, priorityFeeLamports = 1000) {
        console.log(`\n📦 Batch transferring tokens to ${transfers.length} recipients`);
        const results = [];
        for (const transfer of transfers) {
            try {
                const result = await this.transferSPLToken(fromKeypair, transfer.address, tokenMintAddress, transfer.amount, decimals, priorityFeeLamports);
                results.push(result);
            }
            catch (error) {
                console.error(`  ❌ Failed transfer to ${transfer.address}:`, error);
                // Continue with other transfers
            }
        }
        console.log(`✅ Batch transfer complete: ${results.length}/${transfers.length} successful`);
        return results;
    }
}
// Singleton instance
let transferServiceInstance = null;
const getTransferService = () => {
    if (!transferServiceInstance) {
        transferServiceInstance = new TransferService();
    }
    return transferServiceInstance;
};
exports.getTransferService = getTransferService;
exports.default = TransferService;
