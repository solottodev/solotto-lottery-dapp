// quick-test-setup.ts
// Quick script to create test token holders for snapshot testing
// This creates a few test wallets with LOTTO tokens so you can test the snapshot

import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  createTransferInstruction,
  getAccount,
} from '@solana/spl-token';
import * as dotenv from 'dotenv';
dotenv.config();

const RPC_URL = process.env.ALCHEMY_RPC_URL || 'https://api.devnet.solana.com';
const TOKEN_MINT = process.env.LOTTO_MINT_ADDRESS || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';

// Simple test: create 3 holders with different amounts
const TEST_AMOUNTS = [
  100_000,  // Holder 1 - Tier 1
  50_000,   // Holder 2 - Tier 2
  10_000,   // Holder 3 - Tier 4
];

async function main() {
  console.log('🚀 Quick Test Setup for Snapshot\n');
  console.log('This will create 3 test wallets with LOTTO tokens\n');

  const connection = new Connection(RPC_URL, 'confirmed');
  const mintPubkey = new PublicKey(TOKEN_MINT);

  // You'll need to provide a funded wallet with LOTTO tokens
  console.log('⚠️  You need a funded devnet wallet with LOTTO tokens.');
  console.log('   Set OPERATOR_WALLET_PRIVATE_KEY in your .env file\n');

  const operatorPrivateKey = process.env.OPERATOR_WALLET_PRIVATE_KEY;
  if (!operatorPrivateKey) {
    console.error('❌ OPERATOR_WALLET_PRIVATE_KEY not found in .env');
    console.log('\nTo fix this:');
    console.log('1. Create a devnet wallet: solana-keygen new --outfile dev-wallet.json');
    console.log('2. Get the private key: solana-keygen pubkey dev-wallet.json');
    console.log('3. Airdrop SOL: solana airdrop 2 <pubkey> --url devnet');
    console.log('4. Add OPERATOR_WALLET_PRIVATE_KEY to .env');
    process.exit(1);
  }

  // Parse the private key (supports both base58 and JSON array formats)
  let operatorKeypair: Keypair;
  try {
    if (operatorPrivateKey.startsWith('[')) {
      const secretKey = new Uint8Array(JSON.parse(operatorPrivateKey));
      operatorKeypair = Keypair.fromSecretKey(secretKey);
    } else {
      // Assume base58
      const bs58 = await import('bs58');
      const secretKey = bs58.default.decode(operatorPrivateKey);
      operatorKeypair = Keypair.fromSecretKey(secretKey);
    }
  } catch (e) {
    console.error('❌ Failed to parse OPERATOR_WALLET_PRIVATE_KEY');
    console.error('   Format should be base58 string or JSON array: [1,2,3,...]');
    process.exit(1);
  }

  console.log(`✅ Operator wallet: ${operatorKeypair.publicKey.toBase58()}\n`);

  // Get operator token account
  console.log('🔍 Checking operator token balance...');
  const operatorTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    operatorKeypair,
    mintPubkey,
    operatorKeypair.publicKey
  );

  const operatorBalance = Number(operatorTokenAccount.amount) / 1_000_000;
  console.log(`   Operator has: ${operatorBalance.toLocaleString()} LOTTO tokens`);

  const totalNeeded = TEST_AMOUNTS.reduce((sum, amt) => sum + amt, 0);
  console.log(`   Need: ${totalNeeded.toLocaleString()} LOTTO tokens\n`);

  if (operatorBalance < totalNeeded) {
    console.error('❌ Insufficient LOTTO tokens in operator wallet!');
    console.log('\nYou need to mint LOTTO tokens first:');
    console.log('   npx ts-node scripts/mint-devnet-token.ts');
    process.exit(1);
  }

  console.log('✅ Sufficient tokens available\n');
  console.log('Creating test holders...\n');

  // Create test holders
  const holders: { keypair: Keypair; amount: number }[] = [];

  for (let i = 0; i < TEST_AMOUNTS.length; i++) {
    const amount = TEST_AMOUNTS[i];
    const holder = Keypair.generate();
    holders.push({ keypair: holder, amount });

    console.log(`\n📝 Holder ${i + 1}:`);
    console.log(`   Address: ${holder.publicKey.toBase58()}`);
    console.log(`   Target: ${amount.toLocaleString()} LOTTO`);

    // Airdrop SOL for rent
    console.log('   🪂 Airdropping SOL for rent...');
    try {
      const airdropSig = await connection.requestAirdrop(holder.publicKey, 0.1 * 1e9);
      await connection.confirmTransaction(airdropSig);
      console.log('   ✅ SOL received');
    } catch (e) {
      console.log('   ⚠️  Airdrop failed (rate limit?). Trying to continue...');
    }

    // Create token account
    console.log('   🔨 Creating token account...');
    const holderTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      operatorKeypair,
      mintPubkey,
      holder.publicKey
    );

    // Transfer tokens
    console.log(`   💸 Transferring ${amount.toLocaleString()} LOTTO...`);
    const tx = new Transaction().add(
      createTransferInstruction(
        operatorTokenAccount.address,
        holderTokenAccount.address,
        operatorKeypair.publicKey,
        amount * 1_000_000 // Convert to raw amount
      )
    );

    const sig = await connection.sendTransaction(tx, [operatorKeypair]);
    await connection.confirmTransaction(sig);

    // Verify
    const updatedAccount = await getAccount(connection, holderTokenAccount.address);
    const balance = Number(updatedAccount.amount) / 1_000_000;
    console.log(`   ✅ Balance: ${balance.toLocaleString()} LOTTO`);
    console.log(`   🔗 TX: ${sig.slice(0, 8)}...`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Test Setup Complete!\n');
  console.log('📊 Summary:');
  console.log(`   Created: ${holders.length} test holders`);
  console.log(`   Total distributed: ${totalNeeded.toLocaleString()} LOTTO\n`);

  console.log('Test Holder Addresses (for reference):');
  holders.forEach((h, i) => {
    console.log(`   ${i + 1}. ${h.keypair.publicKey.toBase58()} (${h.amount.toLocaleString()} LOTTO)`);
  });

  console.log('\n✅ You can now run a snapshot in the UI!');
  console.log('   The snapshot should detect these holders plus your operator wallet.\n');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
