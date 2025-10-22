// create-test-token.ts
// Create a brand new LOTTO test token on devnet that you control

import { Connection, Keypair } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.ALCHEMY_RPC_URL || 'https://api.devnet.solana.com';
const INITIAL_SUPPLY = 10_000_000; // 10 million LOTTO tokens
const DECIMALS = 6; // Match LOTTO_DECIMALS from .env

async function main() {
  console.log('🪙 Creating New Test LOTTO Token\n');
  console.log('='.repeat(60));

  const connection = new Connection(RPC_URL, 'confirmed');

  // Parse operator wallet
  const operatorPrivateKey = process.env.OPERATOR_WALLET_PRIVATE_KEY;
  if (!operatorPrivateKey) {
    console.error('❌ OPERATOR_WALLET_PRIVATE_KEY not found in .env');
    console.log('\nAdd this to your .env file:');
    console.log('OPERATOR_WALLET_PRIVATE_KEY=your_base58_or_json_array\n');
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
  console.log(`   Network: Devnet`);
  console.log(`   Decimals: ${DECIMALS}`);
  console.log(`   Initial Supply: ${INITIAL_SUPPLY.toLocaleString()} LOTTO\n`);

  // Check SOL balance
  const balance = await connection.getBalance(operatorKeypair.publicKey);
  console.log(`💰 SOL Balance: ${balance / 1e9} SOL`);

  if (balance < 0.1 * 1e9) {
    console.log('⚠️  Low SOL balance. You may need more SOL to create the token.');
    console.log('   Run: solana airdrop 2 ' + operatorKeypair.publicKey.toBase58() + ' --url devnet\n');
  }

  // Create new token
  console.log('🔨 Creating new token mint...');
  const mintPubkey = await createMint(
    connection,
    operatorKeypair,
    operatorKeypair.publicKey, // mint authority
    null, // freeze authority (none)
    DECIMALS
  );

  console.log(`   ✅ Token created: ${mintPubkey.toBase58()}\n`);

  // Create token account
  console.log('🔨 Creating token account...');
  const tokenAccount = await getOrCreateAssociatedTokenAccount(
    connection,
    operatorKeypair,
    mintPubkey,
    operatorKeypair.publicKey
  );

  console.log(`   Token Account: ${tokenAccount.address.toBase58()}\n`);

  // Mint initial supply
  console.log(`💸 Minting ${INITIAL_SUPPLY.toLocaleString()} LOTTO tokens...`);
  const rawAmount = INITIAL_SUPPLY * Math.pow(10, DECIMALS);

  const signature = await mintTo(
    connection,
    operatorKeypair,
    mintPubkey,
    tokenAccount.address,
    operatorKeypair.publicKey,
    rawAmount
  );

  await connection.confirmTransaction(signature);

  console.log('   ✅ Mint successful!');
  console.log(`   🔗 TX: ${signature}\n`);

  console.log('='.repeat(60));
  console.log('🎉 Test Token Created!\n');

  console.log('📝 IMPORTANT: Update your .env file with the new token mint address:\n');
  console.log(`LOTTO_MINT_ADDRESS=${mintPubkey.toBase58()}`);
  console.log(`LOTTO_DECIMALS=${DECIMALS}\n`);

  console.log('Also update Render backend environment variables:');
  console.log(`   LOTTO_MINT_ADDRESS=${mintPubkey.toBase58()}`);
  console.log(`   LOTTO_DECIMALS=${DECIMALS}\n`);

  console.log('Next steps:');
  console.log('   1. Update .env files (backend and frontend)');
  console.log('   2. Redeploy Render backend with new env vars');
  console.log('   3. Run: npx ts-node scripts/quick-test-setup.ts');
  console.log('   4. Test snapshot in UI\n');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
