// check-tokens.ts
// Check what tokens exist for your wallet

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { getAccount, getMint } from '@solana/spl-token';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as dotenv from 'dotenv';

dotenv.config();

const RPC_URL = process.env.ALCHEMY_RPC_URL || 'https://api.devnet.solana.com';

async function main() {
  console.log('🔍 Checking Token Accounts\n');
  console.log('='.repeat(60));

  const connection = new Connection(RPC_URL, 'confirmed');

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

  console.log(`\n📋 Wallet: ${operatorKeypair.publicKey.toBase58()}\n`);

  // Get all token accounts owned by this wallet
  console.log('🔍 Fetching token accounts...');
  const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
    operatorKeypair.publicKey,
    { programId: TOKEN_PROGRAM_ID }
  );

  console.log(`   Found ${tokenAccounts.value.length} token account(s)\n`);

  if (tokenAccounts.value.length === 0) {
    console.log('❌ No token accounts found.');
    console.log('\nThis means either:');
    console.log('1. The token creation failed');
    console.log('2. You need to create a token first\n');
    return;
  }

  console.log('📊 Token Holdings:\n');

  for (let i = 0; i < tokenAccounts.value.length; i++) {
    const accountInfo = tokenAccounts.value[i];
    const parsedInfo = accountInfo.account.data.parsed.info;
    const mintAddress = parsedInfo.mint;
    const balance = parsedInfo.tokenAmount.uiAmount;
    const decimals = parsedInfo.tokenAmount.decimals;

    console.log(`${i + 1}. Token Mint: ${mintAddress}`);
    console.log(`   Balance: ${balance?.toLocaleString() || 0} tokens`);
    console.log(`   Decimals: ${decimals}`);

    // Try to get mint info to see if this wallet is the mint authority
    try {
      const mintPubkey = new PublicKey(mintAddress);
      const mintInfo = await getMint(connection, mintPubkey);
      const isMintAuthority = mintInfo.mintAuthority?.toBase58() === operatorKeypair.publicKey.toBase58();

      console.log(`   Mint Authority: ${mintInfo.mintAuthority?.toBase58() || 'None'}`);
      console.log(`   You are mint authority: ${isMintAuthority ? '✅ YES' : '❌ NO'}`);

      if (isMintAuthority && balance && balance > 100_000) {
        console.log(`   💡 This token looks good for testing!`);
        console.log(`\n   Add this to your .env:`);
        console.log(`   LOTTO_MINT_ADDRESS=${mintAddress}`);
        console.log(`   LOTTO_DECIMALS=${decimals}\n`);
      }
    } catch (e) {
      console.log(`   ⚠️  Could not fetch mint info`);
    }
    console.log('');
  }

  console.log('='.repeat(60));
  console.log('\n💡 Next Steps:');
  console.log('If you found a token with enough balance and you are the mint authority:');
  console.log('   1. Update .env with the LOTTO_MINT_ADDRESS');
  console.log('   2. Run: npx ts-node scripts/quick-test-setup.ts\n');
}

main().catch((err) => {
  console.error('❌ Error:', err);
  process.exit(1);
});
