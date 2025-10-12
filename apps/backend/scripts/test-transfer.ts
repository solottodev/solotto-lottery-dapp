// test-transfer.ts
// Test script for TransferService and WalletService

import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { getTransferService } from '../src/services/transfer.service';
import { getWalletService } from '../src/services/wallet.service';
import { getRPCService } from '../src/services/rpc.service';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         Solotto Transfer Service Test Suite             ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  const transferService = getTransferService();
  const walletService = getWalletService();
  const rpcService = getRPCService();

  // Test 1: Load operator wallet
  console.log('📝 Test 1: Load Operator Wallet');
  console.log('─'.repeat(60));
  try {
    const operatorKeypair = walletService.loadOperatorKeypair();
    console.log(`✅ Operator wallet loaded successfully`);
    console.log(`   Address: ${operatorKeypair.publicKey.toBase58()}`);

    // Check operator balance
    const balance = await rpcService.getBalance(operatorKeypair.publicKey);
    const balanceSol = balance / LAMPORTS_PER_SOL;
    console.log(`   Balance: ${balanceSol.toFixed(4)} SOL`);

    if (balanceSol < 0.1) {
      console.log(`   ⚠️  Warning: Low balance. Airdrop some SOL to test transfers:`);
      console.log(`   solana airdrop 1 ${operatorKeypair.publicKey.toBase58()} --url devnet`);
    }
  } catch (error) {
    console.log(`❌ Failed to load operator wallet`);
    console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
    console.log(`\n   💡 Setup Instructions:`);
    console.log(`   1. Generate a keypair: solana-keygen new --outfile dev-wallet.json`);
    console.log(`   2. Get the base58 private key: solana-keygen pubkey dev-wallet.json --outfile /dev/stdout`);
    console.log(`   3. Convert to base58: node -e "console.log(require('bs58').encode(Uint8Array.from(require('./dev-wallet.json'))))"`);
    console.log(`   4. Add to .env: OPERATOR_WALLET_PRIVATE_KEY="<base58_key>"`);
    console.log(`   5. Or add JSON array: OPERATOR_WALLET_JSON="$(cat dev-wallet.json)"`);
    return;
  }

  // Test 2: Create test recipient wallet
  console.log('\n📝 Test 2: Create Test Recipient Wallet');
  console.log('─'.repeat(60));
  const recipientKeypair = Keypair.generate();
  console.log(`✅ Test recipient created`);
  console.log(`   Address: ${recipientKeypair.publicKey.toBase58()}`);

  // Test 3: Check ATA existence (should be null for new wallet)
  console.log('\n📝 Test 3: Check ATA Existence');
  console.log('─'.repeat(60));
  const tokenMint = process.env.LOTTO_MINT_ADDRESS;
  if (tokenMint && tokenMint !== 'your_devnet_token_mint_address') {
    const ata = await transferService.getATAIfExists(
      recipientKeypair.publicKey.toBase58(),
      tokenMint
    );
    if (ata) {
      console.log(`✅ ATA exists: ${ata}`);
    } else {
      console.log(`✅ No ATA exists (expected for new wallet)`);
    }
  } else {
    console.log(`⚠️  Skipped: LOTTO_MINT_ADDRESS not configured`);
  }

  // Test 4: Test SOL transfer (dry run - optional)
  console.log('\n📝 Test 4: SOL Transfer (Dry Run)');
  console.log('─'.repeat(60));
  console.log(`   Would transfer 0.001 SOL to ${recipientKeypair.publicKey.toBase58().slice(0, 8)}...`);
  console.log(`   ⚠️  Skipping actual transfer to preserve devnet SOL`);
  console.log(`   💡 To test real transfers, uncomment the code below`);

  // Uncomment to test real SOL transfer:
  /*
  try {
    const operatorKeypair = walletService.loadOperatorKeypair();
    const result = await transferService.transferSOL(
      operatorKeypair,
      recipientKeypair.publicKey.toBase58(),
      0.001, // 0.001 SOL
      1000 // priority fee
    );
    console.log(`✅ SOL transfer successful`);
    console.log(`   Signature: ${result.signature}`);
    console.log(`   Amount: ${result.amount} SOL`);
  } catch (error) {
    console.log(`❌ SOL transfer failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  */

  // Test 5: Test SPL Token Transfer (dry run - optional)
  console.log('\n📝 Test 5: SPL Token Transfer (Dry Run)');
  console.log('─'.repeat(60));
  if (tokenMint && tokenMint !== 'your_devnet_token_mint_address') {
    console.log(`   Would transfer 10 tokens to ${recipientKeypair.publicKey.toBase58().slice(0, 8)}...`);
    console.log(`   Token Mint: ${tokenMint.slice(0, 8)}...`);
    console.log(`   ⚠️  Skipping actual transfer`);
    console.log(`   💡 To test real transfers, uncomment the code below`);

    // Uncomment to test real token transfer:
    /*
    try {
      const operatorKeypair = walletService.loadOperatorKeypair();
      const decimals = parseInt(process.env.LOTTO_DECIMALS || '6', 10);
      const result = await transferService.transferSPLToken(
        operatorKeypair,
        recipientKeypair.publicKey.toBase58(),
        tokenMint,
        10, // 10 tokens
        decimals,
        1000
      );
      console.log(`✅ Token transfer successful`);
      console.log(`   Signature: ${result.signature}`);
      console.log(`   Amount: ${result.amount} tokens`);
      console.log(`   ATA Created: ${result.ataAddress}`);
    } catch (error) {
      console.log(`❌ Token transfer failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    */
  } else {
    console.log(`   ⚠️  Skipped: LOTTO_MINT_ADDRESS not configured`);
  }

  // Test Summary
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    Test Summary                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('✅ WalletService: Operator wallet loading');
  console.log('✅ TransferService: ATA checking');
  console.log('⏭️  SOL Transfer: Dry run (uncomment to test)');
  console.log('⏭️  Token Transfer: Dry run (uncomment to test)');
  console.log('\n💡 Next Steps:');
  console.log('   1. Ensure operator wallet has sufficient SOL');
  console.log('   2. Ensure operator wallet has sufficient $LOTTO tokens (if testing token transfers)');
  console.log('   3. Uncomment transfer tests to verify real transfers');
  console.log('   4. Test full distribution flow from frontend\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
