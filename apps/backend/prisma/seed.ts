import { PrismaClient, RoundStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // Create Users
  await prisma.user.createMany({
    data: [
      { email: 'alice@example.com', password: passwordHash },
      { email: 'bob@example.com', password: passwordHash },
      { email: 'carol@example.com', password: passwordHash },
    ],
  });

  // Create Lottery Rounds
  const round1 = await prisma.lotteryRound.create({
    data: {
      roundNumber: 1,
      startTime: new Date(Date.now() - 2 * 86400000),
      endTime: new Date(Date.now() - 1 * 86400000),
      status: RoundStatus.COMPLETED,
      winningWallet: 'So1aNAwinnErWallet1111111111111111111111',
    },
  });

  const round2 = await prisma.lotteryRound.create({
    data: {
      roundNumber: 2,
      startTime: new Date(),
      endTime: new Date(Date.now() + 86400000),
      status: RoundStatus.PENDING,
    },
  });

  // Create Lottery Entries
  const mockWallets = [
    'So1aNA1111111111111111111111111111111111',
    'So1aNA2222222222222222222222222222222222',
    'So1aNA3333333333333333333333333333333333',
    'So1aNA4444444444444444444444444444444444',
    'So1aNA5555555555555555555555555555555555',
  ];

  for (const wallet of mockWallets) {
    await prisma.lotteryEntry.create({
      data: { walletAddress: wallet, lotteryRoundId: round1.id },
    });
    await prisma.lotteryEntry.create({
      data: { walletAddress: wallet, lotteryRoundId: round2.id },
    });
  }

  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
