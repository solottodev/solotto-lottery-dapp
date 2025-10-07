import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create 3 demo rounds with simple winners/payouts
  const now = Date.now()
  const rounds = [] as any[]
  for (let i = 0; i < 3; i++) {
    const start = new Date(now - (14 - i * 7) * 24 * 60 * 60 * 1000)
    const end = new Date(now - (7 - i * 7) * 24 * 60 * 60 * 1000)
    const drawing = new Date(end.getTime() + 60 * 60 * 1000)
    const distribution = new Date(drawing.getTime() + 60 * 60 * 1000)
    const prize = 80 + i * 5 + 9.215
    const winners = {
      t1: `WINNER_T1_${i}_${Math.random().toString(36).slice(2, 10)}`,
      t2: `WINNER_T2_${i}_${Math.random().toString(36).slice(2, 10)}`,
      t3: `WINNER_T3_${i}_${Math.random().toString(36).slice(2, 10)}`,
      t4: `WINNER_T4_${i}_${Math.random().toString(36).slice(2, 10)}`,
    }
    const payouts = { t1: prize * 0.4, t2: prize * 0.25, t3: prize * 0.2, t4: prize * 0.15 }

    const r = await prisma.round.create({
      data: {
        startDate: start,
        endDate: end,
        drawingDate: drawing,
        distributionDate: distribution,
        prizePoolSol: Number(prize.toFixed(6)),
        prizeDistributionPercent: 70,
        prizeSourceWallet: `SeedWallet_${i}`,
        prizeSourceBalanceSol: Number((prize / 0.7).toFixed(6)),
        totalParticipants: 2940 + i * 100,
        eligibleParticipants: 2000 + i * 100,
        tierWinners: winners,
        tierPayouts: payouts,
      },
    })
    rounds.push(r)
  }

  // Create ~50 demo participants for the latest round
  const latest = rounds[0]
  const wallets = Array.from({ length: 50 }).map((_, idx) =>
    `DemoWallet_${idx}_${Math.random().toString(36).slice(2, 10)}`
  )
  for (let i = 0; i < wallets.length; i++) {
    await prisma.participant.create({
      data: {
        roundId: latest.id,
        wallet: wallets[i],
        tokenBalance: Math.round(Math.random() * 1000) / 10,
        tier: [1, 2, 3, 4][Math.floor(Math.random() * 4)],
        eligibilityScore: Math.round(Math.random() * 100) / 10,
        isWinner: Math.random() < 0.08,
      },
    })
  }

  console.log('✅ Seed complete')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
