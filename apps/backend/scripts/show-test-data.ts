// show-test-data.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('📊 Current Test Data in Database\n');

  const rounds = await prisma.round.findMany({
    where: { network: 'devnet' },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log(`Found ${rounds.length} devnet rounds:\n`);

  for (const round of rounds) {
    console.log(`Round: ${round.id}`);
    console.log(`  Created: ${round.createdAt}`);
    console.log(`  Participants: ${round.totalParticipants}`);
    console.log(`  Prize Pool: ${round.prizePoolSol} SOL`);

    const participants = await prisma.participant.count({
      where: { roundId: round.id }
    });
    console.log(`  Participants in DB: ${participants}`);

    const snapshots = await prisma.snapshot.findMany({
      where: { roundId: round.id }
    });
    console.log(`  Snapshots: ${snapshots.length}`);
    if (snapshots[0]) {
      console.log(`    - ${snapshots[0].id} (${snapshots[0].status})`);
    }
    console.log('');
  }

  if (rounds[0]) {
    const sampleParticipants = await prisma.participant.findMany({
      where: { roundId: rounds[0].id },
      take: 5,
      orderBy: { tokenLottoBalanceStart: 'desc' }
    });

    console.log(`Sample participants from latest round:`);
    sampleParticipants.forEach(p => {
      console.log(`  ${p.wallet}: ${p.tokenLottoBalanceStart?.toLocaleString()} LOTTO`);
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
