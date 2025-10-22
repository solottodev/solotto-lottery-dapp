// mock-test-data.ts
// Create mock participants directly in the database for testing
// This bypasses the need for on-chain token holders

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🎭 Creating Mock Test Data\n');
  console.log('='.repeat(60));

  const network = 'devnet';

  // Create a test round
  console.log('\n📝 Creating test round...');
  const round = await prisma.round.create({
    data: {
      id: `test-round-${Date.now()}`,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      endDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      drawingDate: null,
      distributionDate: null,
      prizePoolSol: 10.0,
      prizeDistributionPercent: 70.0,
      prizeSourceWallet: '6fjtxR8A5UceofkYpzUaHTDMjQvbM7R34QqeX8fNgteA', // Your wallet
      totalParticipants: 0,
      eligibleParticipants: 0,
      tierWinners: {},
      tierPayouts: {},
      network: network,
    },
  });

  console.log(`   ✅ Round created: ${round.id}\n`);

  // Create snapshot
  console.log('📸 Creating snapshot...');
  const snapshot = await prisma.snapshot.create({
    data: {
      id: `snapshot-${Date.now()}`,
      roundId: round.id,
      status: 'IDLE',
      startedAt: null,
      completedAt: null,
    },
  });

  console.log(`   ✅ Snapshot created: ${snapshot.id}\n`);

  // Create mock participants with different token holdings
  console.log('👥 Creating mock participants...');

  const mockParticipants = [
    // Tier 1 (top 5% - highest balances)
    { wallet: 'TIER1aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', balance: 500_000, usd: 5000 },

    // Tier 2 (next 15%)
    { wallet: 'TIER2aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', balance: 200_000, usd: 2000 },
    { wallet: 'TIER2aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2', balance: 180_000, usd: 1800 },
    { wallet: 'TIER2aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa3', balance: 150_000, usd: 1500 },

    // Tier 3 (next 30%)
    { wallet: 'TIER3aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', balance: 100_000, usd: 1000 },
    { wallet: 'TIER3aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2', balance: 80_000, usd: 800 },
    { wallet: 'TIER3aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa3', balance: 70_000, usd: 700 },
    { wallet: 'TIER3aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa4', balance: 60_000, usd: 600 },
    { wallet: 'TIER3aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa5', balance: 50_000, usd: 500 },
    { wallet: 'TIER3aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa6', balance: 45_000, usd: 450 },

    // Tier 4 (remaining 50%)
    { wallet: 'TIER4aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1', balance: 30_000, usd: 300 },
    { wallet: 'TIER4aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa2', balance: 25_000, usd: 250 },
    { wallet: 'TIER4aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa3', balance: 20_000, usd: 200 },
    { wallet: 'TIER4aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa4', balance: 15_000, usd: 150 },
    { wallet: 'TIER4aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa5', balance: 12_000, usd: 120 },
    { wallet: 'TIER4aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa6', balance: 10_000, usd: 100 },
    { wallet: 'TIER4aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa7', balance: 8_000, usd: 80 },
    { wallet: 'TIER4aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa8', balance: 6_000, usd: 60 },
    { wallet: 'TIER4aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa9', balance: 5_000, usd: 50 },
    { wallet: 'TIER4aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa10', balance: 4_000, usd: 40 },
  ];

  for (const participant of mockParticipants) {
    await prisma.participant.create({
      data: {
        id: `participant-${participant.wallet}-${Date.now()}`,
        roundId: round.id,
        wallet: participant.wallet,
        tier: null, // Will be assigned during snapshot confirmation
        eligibilityScore: null,
        isWinner: false,
        isEligible: false,
        tokenLottoBalanceStart: participant.balance,
        tokenLottoBalanceEnd: participant.balance,
        tokenUsdBalance: participant.usd,
      },
    });
  }

  console.log(`   ✅ Created ${mockParticipants.length} mock participants\n`);

  // Update round participant counts
  await prisma.round.update({
    where: { id: round.id },
    data: {
      totalParticipants: mockParticipants.length,
      eligibleParticipants: mockParticipants.length,
    },
  });

  console.log('='.repeat(60));
  console.log('🎉 Mock Test Data Created!\n');
  console.log('📋 Summary:');
  console.log(`   Round ID: ${round.id}`);
  console.log(`   Snapshot ID: ${snapshot.id}`);
  console.log(`   Participants: ${mockParticipants.length}`);
  console.log(`   Network: ${network}\n`);

  console.log('💡 Next Steps:');
  console.log('   1. Go to your staging frontend');
  console.log('   2. The Control module should detect this round');
  console.log('   3. You can now test:');
  console.log('      - Confirming the snapshot');
  console.log('      - Running the drawing');
  console.log('      - Preparing harvest');
  console.log('      - Creating distribution\n');

  console.log('⚠️  Note: Since this is mock data, you cannot broadcast');
  console.log('   actual transactions, but you can test the full workflow!\n');
}

main()
  .catch((err) => {
    console.error('❌ Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
