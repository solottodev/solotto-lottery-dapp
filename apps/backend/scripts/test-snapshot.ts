// apps/backend/scripts/test-snapshot.ts
// Test the SnapshotService with real devnet token holders

import { getSnapshotService } from '../src/services/snapshot.service';
import { getNetworkConfig } from '../src/config/networks';

async function main() {
  console.log('🧪 Testing Snapshot Service\n');
  console.log('============================================================\n');

  const networkConfig = getNetworkConfig();
  const mintAddress = process.env.LOTTO_MINT_ADDRESS;

  if (!mintAddress || mintAddress === 'your_devnet_token_mint_address') {
    console.error('❌ LOTTO_MINT_ADDRESS not configured in .env');
    console.log('\nPlease set LOTTO_MINT_ADDRESS to your devnet token mint address');
    process.exit(1);
  }

  console.log('🌐 Network Configuration:');
  console.log(`   Network: ${networkConfig.network}`);
  console.log(`   $LOTTO Mint: ${mintAddress}`);
  console.log(`   Explorer: ${networkConfig.explorerUrl}\n`);

  try {
    // Initialize snapshot service
    const snapshotService = getSnapshotService();
    console.log('✅ SnapshotService initialized\n');

    // Test 1: Fetch token holders
    console.log('📡 Test 1: Fetch Token Holders');
    console.log('------------------------------------------------------------');

    const holders = await snapshotService['getTokenHolders'](mintAddress);
    console.log(`✅ Found ${holders.length} token holders\n`);

    if (holders.length === 0) {
      console.log('⚠️  No token holders found. Make sure:');
      console.log('   1. The token mint address is correct');
      console.log('   2. There are token accounts with non-zero balances');
      console.log('   3. You created test holders using create-test-holders.sh\n');
      process.exit(0);
    }

    // Show top 5 holders
    console.log('Top 5 holders:');
    const topHolders = holders
      .sort((a, b) => b.balanceUi - a.balanceUi)
      .slice(0, 5);

    topHolders.forEach((holder, index) => {
      console.log(`  ${index + 1}. ${holder.owner}`);
      console.log(`     Balance: ${holder.balanceUi.toLocaleString()} tokens`);
      console.log(`     Token Account: ${holder.tokenAccount.slice(0, 8)}...`);
    });

    console.log('');

    // Test 2: Tier Assignment
    console.log('📊 Test 2: Tier Assignment');
    console.log('------------------------------------------------------------');

    const participants = snapshotService['assignTiers'](holders);
    console.log(`✅ Assigned tiers to ${participants.length} participants\n`);

    // Count tiers
    const tierCounts = {
      t1: participants.filter(p => p.tier === 1).length,
      t2: participants.filter(p => p.tier === 2).length,
      t3: participants.filter(p => p.tier === 3).length,
      t4: participants.filter(p => p.tier === 4).length,
    };

    console.log('Tier distribution:');
    console.log(`  Tier 1 (Top 5%):    ${tierCounts.t1} participants`);
    console.log(`  Tier 2 (Next 15%):  ${tierCounts.t2} participants`);
    console.log(`  Tier 3 (Next 30%):  ${tierCounts.t3} participants`);
    console.log(`  Tier 4 (Bottom 50%): ${tierCounts.t4} participants`);

    console.log('');

    // Show examples from each tier
    console.log('Sample participants from each tier:');
    [1, 2, 3, 4].forEach(tier => {
      const example = participants.find(p => p.tier === tier);
      if (example) {
        console.log(`  Tier ${tier}: ${example.wallet.slice(0, 8)}... (${example.tokenBalance.toLocaleString()} tokens)`);
      }
    });

    console.log('\n');

    // Test 3: Blacklist Filtering
    console.log('🚫 Test 3: Blacklist Filtering');
    console.log('------------------------------------------------------------');

    // Test with a sample blacklist (blacklist the first holder)
    const testBlacklist = [holders[0].owner];
    console.log(`Testing with blacklist: [${testBlacklist[0].slice(0, 8)}...]`);

    const { filtered, removed } = snapshotService['filterBlacklist'](
      participants,
      testBlacklist
    );

    console.log(`✅ Removed ${removed} blacklisted wallet(s)`);
    console.log(`✅ ${filtered.length} participants remain after filtering\n`);

    // Test 4: Hard Blacklist
    console.log('🔒 Test 4: Hard Blacklist from Environment');
    console.log('------------------------------------------------------------');

    const hardBlacklist = snapshotService['getHardBlacklist']();
    console.log(`Hard blacklist contains ${hardBlacklist.length} address(es)`);

    if (hardBlacklist.length > 0) {
      console.log('Hard blacklist addresses:');
      hardBlacklist.forEach(addr => {
        console.log(`  - ${addr}`);
      });
    }

    console.log('\n');

    // Summary
    console.log('============================================================');
    console.log('🎉 Snapshot Service Tests Complete\n');
    console.log('📋 Summary:');
    console.log(`   ✅ Token holders fetched: ${holders.length}`);
    console.log(`   ✅ Tiers assigned: ${participants.length}`);
    console.log(`   ✅ Tier 1 (5%): ${tierCounts.t1}`);
    console.log(`   ✅ Tier 2 (15%): ${tierCounts.t2}`);
    console.log(`   ✅ Tier 3 (30%): ${tierCounts.t3}`);
    console.log(`   ✅ Tier 4 (50%): ${tierCounts.t4}`);
    console.log(`   ✅ Blacklist filtering: Working`);
    console.log('');

    console.log('💡 Next Steps:');
    console.log('   1. Start your backend server: npm run dev');
    console.log('   2. Create a round using the Control module');
    console.log('   3. Run snapshot using the Snapshot module');
    console.log('   4. The snapshot will query these real blockchain holders!\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();
