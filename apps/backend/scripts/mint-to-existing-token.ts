// mint-to-existing-token.ts
// Mint LOTTO tokens to your operator wallet using the existing LOTTO mint
// This requires you to be the mint authority for the token

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getOrCreateAssociatedTokenAccount, mintTo, getMint } from '@solana/spl-token';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.ALCHEMY_RPC_URL || 'https://api.devnet.solana.com';
const TOKEN_MINT = process.env.LOTTO_MINT_ADDRESS || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU';
const AMOUNT_TO_MINT = 1_000_000; // 1 million LOTTO tokens (adjust as needed)

async function main() {
  console.log('🪙 Minting LOTTO Tokens\n');
  console.log('='.repeat(60));

  const connection = new Connection(RPC_URL, 'confirmed');
  const mintPubkey = new PublicKey(TOKEN_MINT);

  // Parse operator wallet
  const operatorPrivateKey = process.env.OPERATOR_WALLET_PRIVATE_KEY;
  if (!operatorPrivateKey) {
    console.error('❌ OPERATOR_WALLET_PRIVATE_KEY not found in .env');
    process.exit(1);
  }

  let operatorKeypair: Keypair;
  try {
    if (operatorPrivateKey.startsWith('[')) {
      const secretKey = new Uint8Array(JSON.parse(operatorPrivateKey));
      operatorKeypair = Keypair.fromSecretKey(secretKey);
    } else {
      const bs58 = await import('bs58');
      const secretKey = bs58.default.decode(operatorPrivateKey);
      operatorKeypair = Keypair.fromSecretKey(secretKey);
    }
  } catch (e) {
    console.error('❌ Failed to parse OPERATOR_WALLET_PRIVATE_KEY');
    process.exit(1);
  }

  console.log(`\n📋 Configuration:`);
  console.log(`   Operator: ${operatorKeypair.publicKey.toBase58()}`);
  console.log(`   Token Mint: ${TOKEN_MINT}`);
  console.log(`   Amount: ${AMOUNT_TO_MINT.toLocaleString()} LOTTO\n`);

  // Check mint info
  console.log('🔍 Checking token mint...');
  const mintInfo = await getMint(connection, mintPubkey);
  console.log(`   Decimals: ${mintInfo.decimals}`);
  console.log(`   Mint Authority: ${mintInfo.mintAuthority?.toBase58() || 'None'}`);

  if (!mintInfo.mintAuthority) {
    console.error('\n❌ This token has no mint authority - cannot mint more tokens!');
    console.log('\nThis means the token supply is fixed. You have two options:');
    console.log('1. Use a different token that you control');
    console.log('2. Ask the current token holders to send you tokens\n');
    process.exit(1);
  }

  if (mintInfo.mintAuthority.toBase58() !== operatorKeypair.publicKey.toBase58()) {
    console.error('\n❌ You are NOT the mint authority for this token!');
    console.log(`   Mint authority: ${mintInfo.mintAuthority.toBase58()}`);
    console.log(`   Your wallet: ${operatorKeypair.publicKey.toBase58()}`);
    console.log('\nYou need to either:');
    console.log('1. Use the wallet that created this token');
    console.log('2. Create a new token with: npx ts-node scripts/create-test-token.ts\n');
    process.exit(1);
  }

  console.log('   ✅ You are the mint authority!\n');

  // Get or create token account
  console.log('🔨 Getting/creating token account...');
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    operatorKeypair,
    mintPubkey,
    operatorKeypair.publicKey
  );

  console.log(`   Token Account: ${tokenAccount.address.toBase58()}`);
  console.log(`   Current Balance: ${(Number(tokenAccount.amount) / Math.pow(10, mintInfo.decimals)).toLocaleString()} LOTTO\n`);

  // Mint tokens
  console.log(`💸 Minting ${AMOUNT_TO_MINT.toLocaleString()} LOTTO tokens...`);
  const rawAmount = AMOUNT_TO_MINT * Math.pow(10, mintInfo.decimals);

  const signature = await mintTo(
    connection,
    operatorKeypair,
    mintPubkey,
    tokenAccount.address,
    operatorKeypair.publicKey, // mint authority
    rawAmount
  );

  await connection.confirmTransaction(signature);

  // Verify new balance
  const updatedAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    operatorKeypair,
    mintPubkey,
    operatorKeypair.publicKey
  );

  const newBalance = Number(updatedAccount.amount) / Math.pow(10, mintInfo.decimals);

  console.log('   ✅ Mint successful!');
  console.log(`   🔗 TX: ${signature}`);
  console.log(`   New Balance: ${newBalance.toLocaleString()} LOTTO\n`);

  console.log('='.repeat(60));
  console.log('🎉 Done!\n');
  console.log('Next steps:');
  console.log('   1. Run: npx ts-node scripts/quick-test-setup.ts');
  console.log('   2. This will create test holders with LOTTO tokens');
  console.log('   3. Then you can run a snapshot in the UI\n');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
