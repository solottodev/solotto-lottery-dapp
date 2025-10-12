// apps/backend/scripts/fund-test-holders.ts
// Script to create and fund test holder wallets with $LOTTO tokens on devnet

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import {
  getOrCreateAssociatedTokenAccount,
  transfer,
  TOKEN_PROGRAM_ID,
  getAccount
} from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

const DEVNET_RPC = 'https://api.devnet.solana.com';
const TOKEN_MINT = process.env.LOTTO_MINT_ADDRESS || '3peF9pJGVuUfVQQc2Gh7UXyz8Z3HM3oQAHJht3SrfDhf';
const OPERATOR_KEYPAIR_PATH = process.env.OPERATOR_WALLET_KEYPAIR_PATH || './dev-wallet.json';

// Token amounts for each tier (descending order to create realistic tier distribution)
const TEST_HOLDER_AMOUNTS = [
  165_255, // Holder 1 - Tier 1 (top 5%)
  71_788,  // Holder 2 - Tier 2
  70_462,  // Holder 3 - Tier 2
  47_336,  // Holder 4 - Tier 3
  31_355,  // Holder 5 - Tier 3
  31_025,  // Holder 6 - Tier 3
  9_243,   // Holder 7 - Tier 4
  5_902,   // Holder 8 - Tier 4
  4_568,   // Holder 9 - Tier 4
  3_409    // Holder 10 - Tier 4
];

async function main() {
  console.log('🚀 Funding Test Holder Wallets\n');
  console.log('============================================================\n');
  console.log(`Network: devnet`);
  console.log(`Token Mint: ${TOKEN_MINT}`);
  console.log(`Operator Keypair: ${OPERATOR_KEYPAIR_PATH}\n`);

  // Load operator keypair
  const operatorKeypairData = JSON.parse(
    fs.readFileSync(path.resolve(OPERATOR_KEYPAIR_PATH), 'utf-8')
  );
  const operatorKeypair = Keypair.fromSecretKey(new Uint8Array(operatorKeypairData));
  console.log(`✅ Loaded operator wallet: ${operatorKeypair.publicKey.toBase58()}\n`);

  // Connect to devnet
  const connection = new Connection(DEVNET_RPC, 'confirmed');

  // Check operator SOL balance
  const solBalance = await connection.getBalance(operatorKeypair.publicKey);
  console.log(`Operator SOL balance: ${solBalance / LAMPORTS_PER_SOL} SOL`);

  if (solBalance < 0.5 * LAMPORTS_PER_SOL) {
    console.log('⚠️  Low SOL balance. You may need to airdrop more SOL:');
    console.log('   solana airdrop 2\n');
  }

  // Get operator token account
  const mintPubkey = new PublicKey(TOKEN_MINT);
  const operatorTokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    operatorKeypair,
    mintPubkey,
    operatorKeypair.publicKey
  );

  console.log(`Operator token account: ${operatorTokenAccount.address.toBase58()}`);
  console.log(`Operator token balance: ${operatorTokenAccount.amount.toLocaleString()} tokens\n`);

  const totalNeeded = TEST_HOLDER_AMOUNTS.reduce((sum, amt) => sum + amt, 0);
  console.log(`Total tokens needed: ${totalNeeded.toLocaleString()}`);

  if (operatorTokenAccount.amount < BigInt(totalNeeded * 1_000_000)) {
    console.log('❌ Insufficient token balance in operator wallet!');
    console.log(`   Need: ${totalNeeded.toLocaleString()} tokens`);
    console.log(`   Have: ${(Number(operatorTokenAccount.amount) / 1_000_000).toLocaleString()} tokens\n`);
    process.exit(1);
  }

  console.log('✅ Sufficient tokens available\n');
  console.log('============================================================\n');

  // Directory to store test holder keypairs
  const holdersDir = path.resolve('./test-holders');
  if (!fs.existsSync(holdersDir)) {
    fs.mkdirSync(holdersDir, { recursive: true });
    console.log(`📁 Created directory: ${holdersDir}\n`);
  }

  // Create and fund each test holder
  for (let i = 0; i < TEST_HOLDER_AMOUNTS.length; i++) {
    const holderNum = i + 1;
    const amount = TEST_HOLDER_AMOUNTS[i];
    const keypairPath = path.join(holdersDir, `holder-${holderNum}.json`);

    console.log(`\n🔄 Processing Holder ${holderNum}...`);
    console.log(`   Target balance: ${amount.toLocaleString()} tokens`);

    let holderKeypair: Keypair;

    // Load existing or create new keypair
    if (fs.existsSync(keypairPath)) {
      const holderKeypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
      holderKeypair = Keypair.fromSecretKey(new Uint8Array(holderKeypairData));
      console.log(`   ✅ Loaded existing wallet: ${holderKeypair.publicKey.toBase58()}`);
    } else {
      holderKeypair = Keypair.generate();
      fs.writeFileSync(keypairPath, JSON.stringify(Array.from(holderKeypair.secretKey)));
      console.log(`   ✅ Created new wallet: ${holderKeypair.publicKey.toBase58()}`);
      console.log(`   📝 Saved to: ${keypairPath}`);
    }

    // Check if holder needs SOL for rent
    const holderSolBalance = await connection.getBalance(holderKeypair.publicKey);
    if (holderSolBalance < 0.01 * LAMPORTS_PER_SOL) {
      console.log(`   🪂 Airdropping SOL for rent...`);
      try {
        const airdropSig = await connection.requestAirdrop(
          holderKeypair.publicKey,
          0.1 * LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(airdropSig);
        console.log(`   ✅ Airdrop successful`);
      } catch (err) {
        console.log(`   ⚠️  Airdrop failed (rate limit?). Continuing...`);
      }
    }

    // Get or create token account
    console.log(`   🔍 Getting/creating token account...`);
    const holderTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      operatorKeypair, // Payer (operator pays for ATA creation)
      mintPubkey,
      holderKeypair.publicKey
    );

    console.log(`   Token account: ${holderTokenAccount.address.toBase58()}`);

    // Check current balance
    const currentBalance = Number(holderTokenAccount.amount) / 1_000_000;
    console.log(`   Current balance: ${currentBalance.toLocaleString()} tokens`);

    // Calculate how many tokens to send
    const tokensNeeded = amount - currentBalance;

    if (tokensNeeded > 0) {
      console.log(`   💸 Transferring ${tokensNeeded.toLocaleString()} tokens...`);

      const signature = await transfer(
        connection,
        operatorKeypair,
        operatorTokenAccount.address,
        holderTokenAccount.address,
        operatorKeypair.publicKey,
        tokensNeeded * 1_000_000 // Convert to raw amount (6 decimals)
      );

      await connection.confirmTransaction(signature);
      console.log(`   ✅ Transfer complete! TX: ${signature.slice(0, 8)}...`);

      // Verify new balance
      const updatedAccount = await getAccount(connection, holderTokenAccount.address);
      const newBalance = Number(updatedAccount.amount) / 1_000_000;
      console.log(`   ✅ New balance: ${newBalance.toLocaleString()} tokens`);
    } else if (tokensNeeded < 0) {
      console.log(`   ⚠️  Has excess tokens: ${(-tokensNeeded).toLocaleString()} extra`);
    } else {
      console.log(`   ✅ Already has correct balance`);
    }
  }

  console.log('\n============================================================');
  console.log('🎉 All test holders funded!\n');
  console.log('📊 Summary:');
  console.log(`   Total holders: ${TEST_HOLDER_AMOUNTS.length}`);
  console.log(`   Total tokens distributed: ${totalNeeded.toLocaleString()}`);
  console.log(`   Keypairs saved in: ${holdersDir}\n`);
  console.log('Next steps:');
  console.log('   1. Run: npx ts-node scripts/test-snapshot.ts');
  console.log('   2. Verify you see 11 total holders (operator + 10 test holders)');
  console.log('   3. Generate a new snapshot in the UI');
  console.log('   4. Export CSV and verify all participants are included\n');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
