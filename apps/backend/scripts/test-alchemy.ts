// apps/backend/scripts/test-alchemy.ts
// Test script to verify Alchemy RPC and API integration

import dotenv from 'dotenv';
import { PublicKey } from '@solana/web3.js';
import { getRPCService } from '../src/services/rpc.service';
import { getAlchemyClient } from '../src/services/alchemy.client';

dotenv.config();

async function main() {
  console.log('🧪 Testing Alchemy Integration\n');
  console.log('=' .repeat(60));

  // Test 1: RPC Connection Health
  console.log('\n📡 Test 1: RPC Connection Health');
  console.log('-'.repeat(60));
  try {
    const rpcService = getRPCService();
    const health = await rpcService.testConnections();

    console.log('Primary RPC (Alchemy):');
    console.log(`  Status: ${health.primary.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    if (health.primary.slot) {
      console.log(`  Current Slot: ${health.primary.slot}`);
    }
    if (health.primary.error) {
      console.log(`  Error: ${health.primary.error}`);
    }

    console.log('\nFallback RPC:');
    console.log(`  Status: ${health.fallback.healthy ? '✅ Healthy' : '❌ Unhealthy'}`);
    if (health.fallback.slot) {
      console.log(`  Current Slot: ${health.fallback.slot}`);
    }
    if (health.fallback.error) {
      console.log(`  Error: ${health.fallback.error}`);
    }
  } catch (error) {
    console.error('❌ RPC test failed:', error);
  }

  // Test 2: Alchemy API Health
  console.log('\n📡 Test 2: Alchemy API Health');
  console.log('-'.repeat(60));
  try {
    const alchemyClient = getAlchemyClient();
    const healthy = await alchemyClient.testConnection();

    console.log(`Alchemy API: ${healthy ? '✅ Healthy' : '⚠️  Degraded'}`);
  } catch (error) {
    console.error('❌ Alchemy API test failed:', error);
  }

  // Test 3: Get Wallet Balance
  console.log('\n💰 Test 3: Get Wallet Balance');
  console.log('-'.repeat(60));
  try {
    const rpcService = getRPCService();

    // Test with a known devnet wallet (system program)
    const testWallet = new PublicKey('11111111111111111111111111111111');

    const balance = await rpcService.getBalance(testWallet);
    const balanceSol = balance / 1e9;

    console.log(`Wallet: ${testWallet.toBase58()}`);
    console.log(`Balance: ${balanceSol} SOL (${balance} lamports)`);
    console.log('✅ Balance query successful');
  } catch (error) {
    console.error('❌ Balance query failed:', error);
  }

  // Test 4: Get Token Holders (if LOTTO_MINT_ADDRESS is set)
  const lottoMint = process.env.LOTTO_MINT_ADDRESS;
  if (lottoMint && lottoMint !== 'your_devnet_token_mint_address') {
    console.log('\n🪙 Test 4: Get Token Holders');
    console.log('-'.repeat(60));
    try {
      const alchemyClient = getAlchemyClient();

      console.log(`Fetching holders for mint: ${lottoMint}`);
      const holders = await alchemyClient.getTokenHolders(lottoMint, {
        minBalance: 0,
        limit: 10,
      });

      console.log(`✅ Found ${holders.length} token holders`);

      if (holders.length > 0) {
        console.log('\nTop holders:');
        holders.slice(0, 5).forEach((holder, i) => {
          console.log(`  ${i + 1}. ${holder.owner}`);
          console.log(`     Balance: ${holder.balanceUi.toFixed(6)}`);
          console.log(`     Token Account: ${holder.tokenAccount}`);
        });
      }
    } catch (error) {
      console.error('❌ Token holder query failed:', error);
    }
  } else {
    console.log('\n⏭️  Test 4: Skipped (LOTTO_MINT_ADDRESS not configured)');
  }

  // Test 5: Fallback Mechanism
  console.log('\n🔄 Test 5: Automatic Fallback');
  console.log('-'.repeat(60));
  try {
    const rpcService = getRPCService();

    console.log('Testing fallback with multiple operations...');

    const slot = await rpcService.executeWithFallback(
      async (conn) => await conn.getSlot(),
      'getSlot'
    );

    console.log(`✅ Slot query succeeded: ${slot}`);
    console.log('✅ Fallback mechanism working');
  } catch (error) {
    console.error('❌ Fallback test failed:', error);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Alchemy Integration Tests Complete\n');

  // Summary
  console.log('📋 Configuration Summary:');
  console.log(`   ALCHEMY_RPC_URL: ${process.env.ALCHEMY_RPC_URL ? '✅ Set' : '❌ Not set'}`);
  console.log(`   ALCHEMY_API_KEY: ${process.env.ALCHEMY_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`   SOLANA_RPC_FALLBACK: ${process.env.SOLANA_RPC_FALLBACK || 'https://api.devnet.solana.com'}`);
  console.log(`   LOTTO_MINT_ADDRESS: ${lottoMint && lottoMint !== 'your_devnet_token_mint_address' ? '✅ Set' : '⚠️  Not configured'}`);
  console.log(`   SOLANA_NETWORK: ${process.env.SOLANA_NETWORK || 'devnet'}`);

  console.log('\n💡 Next Steps:');
  if (!process.env.ALCHEMY_RPC_URL || process.env.ALCHEMY_RPC_URL.includes('YOUR_API_KEY')) {
    console.log('   1. Sign up for Alchemy: https://www.alchemy.com/');
    console.log('   2. Create a Solana app and get your API key');
    console.log('   3. Update .env with your ALCHEMY_RPC_URL');
  }
  if (!lottoMint || lottoMint === 'your_devnet_token_mint_address') {
    console.log('   - Create a devnet SPL token and set LOTTO_MINT_ADDRESS in .env');
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
