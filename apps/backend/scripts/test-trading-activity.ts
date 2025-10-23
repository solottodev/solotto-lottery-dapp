// apps/backend/scripts/test-trading-activity.ts
//
// Test script for trading activity calculation
// This validates the eligibility logic for mainnet launch
//
// Usage:
//   npx ts-node scripts/test-trading-activity.ts

import { getTradingActivityService } from '../src/services/trading-activity.service';
import prisma from '../src/prisma';

interface TestCase {
  name: string;
  wallet: string;
  startBalance: number;
  endBalance: number;
  expectedActivity: number;
  shouldQualify: boolean; // At 50% threshold
}

let TEST_ROUND_ID = 'test-round-' + Date.now();

const testCases: TestCase[] = [
  {
    name: 'New Wallet (0 → 1000)',
    wallet: 'NewWallet1' + Math.random().toString(36).substring(7),
    startBalance: 0,
    endBalance: 1000,
    expectedActivity: 100,
    shouldQualify: true,
  },
  {
    name: 'Sold 60% (1000 → 400)',
    wallet: 'Seller1' + Math.random().toString(36).substring(7),
    startBalance: 1000,
    endBalance: 400,
    expectedActivity: 60,
    shouldQualify: true,
  },
  {
    name: 'Bought 60% (1000 → 1600)',
    wallet: 'Buyer1' + Math.random().toString(36).substring(7),
    startBalance: 1000,
    endBalance: 1600,
    expectedActivity: 60,
    shouldQualify: true,
  },
  {
    name: 'Holder - No Change (1000 → 1000)',
    wallet: 'Holder1' + Math.random().toString(36).substring(7),
    startBalance: 1000,
    endBalance: 1000,
    expectedActivity: 0,
    shouldQualify: false,
  },
  {
    name: 'Small Buy - 30% (1000 → 1300)',
    wallet: 'SmallBuy1' + Math.random().toString(36).substring(7),
    startBalance: 1000,
    endBalance: 1300,
    expectedActivity: 30,
    shouldQualify: false,
  },
  {
    name: 'Small Sell - 20% (1000 → 800)',
    wallet: 'SmallSell1' + Math.random().toString(36).substring(7),
    startBalance: 1000,
    endBalance: 800,
    expectedActivity: 20,
    shouldQualify: false,
  },
  {
    name: 'Closed Wallet (1000 → 0)',
    wallet: 'Closed1' + Math.random().toString(36).substring(7),
    startBalance: 1000,
    endBalance: 0,
    expectedActivity: 100,
    shouldQualify: true,
  },
  {
    name: 'Exactly 50% Buy (1000 → 1500)',
    wallet: 'Exact50Buy1' + Math.random().toString(36).substring(7),
    startBalance: 1000,
    endBalance: 1500,
    expectedActivity: 50,
    shouldQualify: true,
  },
  {
    name: 'Exactly 50% Sell (1000 → 500)',
    wallet: 'Exact50Sell1' + Math.random().toString(36).substring(7),
    startBalance: 1000,
    endBalance: 500,
    expectedActivity: 50,
    shouldQualify: true,
  },
  {
    name: 'Just Below 50% Buy (1000 → 1499)',
    wallet: 'Below50Buy1' + Math.random().toString(36).substring(7),
    startBalance: 1000,
    endBalance: 1499,
    expectedActivity: 49.9,
    shouldQualify: false,
  },
];

async function runTests() {
  console.log('🧪 Trading Activity Test Suite\n');
  console.log('=' .repeat(80));
  console.log('\n📋 Test Scenario: 50% trading activity threshold\n');

  const service = getTradingActivityService();
  let passed = 0;
  let failed = 0;

  try {
    // Create a test round first (required for foreign key constraint)
    console.log('📦 Creating test round...\n');

    const testRound = await prisma.round.create({
      data: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endDate: new Date(), // now
        prizePoolSol: 10.0,
        prizeDistributionPercent: 70.0,
        totalParticipants: 0,
        eligibleParticipants: 0,
        tierWinners: {},
        tierPayouts: {},
        network: 'devnet',
      }
    });

    TEST_ROUND_ID = testRound.id;
    console.log(`✅ Test round created: ${TEST_ROUND_ID}\n`);

    // Create test snapshots
    console.log('📸 Creating test balance snapshots...\n');

    for (const test of testCases) {
      // Create START snapshot (if not a new wallet)
      if (test.startBalance > 0) {
        await prisma.balanceSnapshot.create({
          data: {
            roundId: TEST_ROUND_ID,
            wallet: test.wallet,
            tokenBalance: test.startBalance,
            snapshotType: 'START',
          }
        });
      }

      // Create END snapshot (if wallet still exists)
      if (test.endBalance > 0) {
        await prisma.balanceSnapshot.create({
          data: {
            roundId: TEST_ROUND_ID,
            wallet: test.wallet,
            tokenBalance: test.endBalance,
            snapshotType: 'END',
          }
        });
      }
    }

    console.log('✅ Test snapshots created\n');
    console.log('=' .repeat(80));
    console.log('\n🔍 Running Test Cases:\n');

    // Run tests
    for (const test of testCases) {
      const activity = await service.calculateTradeActivity(TEST_ROUND_ID, test.wallet);
      const meetsThreshold = activity >= 50;

      // Allow small floating point tolerance
      const activityMatch = Math.abs(activity - test.expectedActivity) < 0.1;
      const thresholdMatch = meetsThreshold === test.shouldQualify;
      const testPassed = activityMatch && thresholdMatch;

      if (testPassed) {
        passed++;
        console.log(`✅ PASS: ${test.name}`);
      } else {
        failed++;
        console.log(`❌ FAIL: ${test.name}`);
      }

      console.log(`   Expected: ${test.expectedActivity}% activity, ${test.shouldQualify ? 'ELIGIBLE' : 'INELIGIBLE'}`);
      console.log(`   Got:      ${activity.toFixed(1)}% activity, ${meetsThreshold ? 'ELIGIBLE' : 'INELIGIBLE'}`);
      console.log(`   Balance:  ${test.startBalance} → ${test.endBalance}\n`);
    }

    console.log('=' .repeat(80));
    console.log('\n📊 Test Results:\n');
    console.log(`   Total:  ${testCases.length}`);
    console.log(`   Passed: ${passed} ✅`);
    console.log(`   Failed: ${failed} ❌`);
    console.log(`   Rate:   ${((passed / testCases.length) * 100).toFixed(1)}%\n`);

    if (failed === 0) {
      console.log('🎉 All tests passed! Trading activity calculation is working correctly.\n');
    } else {
      console.log('⚠️  Some tests failed. Please review the implementation.\n');
    }

  } catch (error) {
    console.error('❌ Test suite error:', error);
    throw error;
  } finally {
    // Cleanup
    console.log('🧹 Cleaning up test data...');

    // Delete balance snapshots first (foreign key)
    await prisma.balanceSnapshot.deleteMany({
      where: { roundId: TEST_ROUND_ID }
    });

    // Then delete the test round
    await prisma.round.delete({
      where: { id: TEST_ROUND_ID }
    }).catch(() => {
      // Ignore error if round doesn't exist
    });

    console.log('✅ Cleanup complete\n');
  }

  return failed === 0 ? 0 : 1;
}

// Run tests
runTests()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
