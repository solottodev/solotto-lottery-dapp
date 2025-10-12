import express from 'express'
import { requireJwt } from '../middleware/requireJwt'
import prisma from '../prisma'
import { getSnapshotService } from '../services/snapshot.service'

const router = express.Router()

// POST /snapshot/run { roundId }
router.post('/run', requireJwt, async (req, res) => {
  try {
    const { roundId } = req.body || {}
    if (!roundId) return res.status(400).json({ error: 'Missing roundId' })

    // Get the round to access dates
    const round = await prisma.round.findUnique({ where: { id: roundId } })
    if (!round) return res.status(404).json({ error: 'Round not found' })

    // Get the lottery config for this round
    const config = await prisma.lotteryConfig.findFirst({
      where: {
        snapshotStart: round.startDate,
        snapshotEnd: round.endDate,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!config) {
      return res.status(404).json({ error: 'Lottery config not found for this round' })
    }

    // Create snapshot record with RUNNING status
    const snap = await prisma.snapshot.create({
      data: { roundId, status: 'RUNNING', startedAt: new Date() },
    })

    console.log(`\n🚀 Starting snapshot ${snap.id} for round ${roundId}`)

    try {
      // Get snapshot service
      const snapshotService = getSnapshotService()

      // Parse blacklist from config
      const blacklist = Array.isArray(config.blacklist)
        ? config.blacklist as string[]
        : []

      // Create snapshot by querying blockchain
      const result = await snapshotService.createSnapshot(
        roundId,
        config.tokenMint,
        blacklist
      )

      // Update snapshot to COMPLETED
      const completed = await prisma.snapshot.update({
        where: { id: snap.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      })

      console.log(`✅ Snapshot ${snap.id} completed successfully`)

      return res.json({
        snapshotId: completed.id,
        startedAt: completed.startedAt,
        completedAt: completed.completedAt,
        totalHolders: result.totalHolders,
        blacklisted: result.blacklisted,
        validParticipants: result.participants.length,
        participantCounts: result.tierCounts,
      })
    } catch (snapshotError) {
      // Update snapshot to IDLE (failed)
      await prisma.snapshot.update({
        where: { id: snap.id },
        data: { status: 'IDLE' },
      })

      console.error('❌ Snapshot failed:', snapshotError)
      throw snapshotError
    }
  } catch (e) {
    console.error('snapshot/run failed', e)
    return res.status(500).json({
      error: 'Internal server error',
      details: e instanceof Error ? e.message : String(e)
    })
  }
})

// POST /snapshot/confirm { snapshotId }
router.post('/confirm', requireJwt, async (req, res) => {
  try {
    const { snapshotId } = req.body || {}
    if (!snapshotId) return res.status(400).json({ error: 'Missing snapshotId' })
    const snap = await prisma.snapshot.findUnique({ where: { id: snapshotId } })
    if (!snap) return res.status(404).json({ error: 'Snapshot not found' })

    // Get the round to access control requirements
    const round = await prisma.round.findUnique({ where: { id: snap.roundId } })
    if (!round) return res.status(404).json({ error: 'Round not found' })

    // Get the lottery config for this round to check requirements
    const config = await prisma.lotteryConfig.findFirst({
      where: {
        snapshotStart: round.startDate,
        snapshotEnd: round.endDate,
      },
      orderBy: { createdAt: 'desc' },
    })

    const minUsdLotto = config?.minUsdLottoRequired ?? 50.0
    const minTradePercent = config?.tradePercentage ?? 0

    console.log(`Eligibility requirements: minUsdLotto=${minUsdLotto}, minTradePercent=${minTradePercent}`)

    // Get all participants and calculate eligibility
    const allParticipants = await prisma.participant.findMany({ where: { roundId: snap.roundId } })

    // Calculate eligibility for each participant
    // tokenBalance represents $LOTTO token amount, eligibilityScore represents percent traded
    for (const p of allParticipants) {
      const lottoValue = p.tokenBalance ?? 0
      let tradePercent = p.eligibilityScore ?? 0

      // ⚠️ DEVNET TESTING ONLY - TODO: IMPLEMENT BEFORE MAINNET GO-LIVE ⚠️
      //
      // For devnet testing: Assume all token holders have 100% trade activity
      // since we don't have historical balance data or DEX trading records yet.
      //
      // BEFORE MAINNET LAUNCH, IMPLEMENT:
      // 1. Fetch historical token balances at snapshot START and END
      // 2. Calculate trade % = ((endBalance - startBalance) / startBalance) * 100
      // 3. Query Jupiter/DEX APIs for actual trading volume during period
      // 4. Verify wallet had trading activity (not just holding)
      //
      // See: PHASE_1_PROGRESS.md - Task "Trading Activity Tracking"
      if (p.eligibilityScore === null && lottoValue > 0) {
        tradePercent = 100 // DEVNET ONLY: Assume 100% for testing
        console.log(`  🧪 DEVNET: ${p.wallet.slice(0, 8)}... assumed 100% trade activity (${lottoValue} tokens)`)
      }

      const isEligible = lottoValue >= minUsdLotto && tradePercent >= minTradePercent

      console.log(`  ${isEligible ? '✅' : '❌'} ${p.wallet.slice(0, 8)}... - Balance: ${lottoValue}, Trade%: ${tradePercent}%, Eligible: ${isEligible}`)

      await prisma.participant.update({
        where: { id: p.id },
        data: {
          isEligible,
          eligibilityScore: tradePercent, // Store for audit
        },
      })
    }

    // Count total and eligible participants
    const totalParticipants = allParticipants.length
    const eligibleParticipants = await prisma.participant.count({
      where: { roundId: snap.roundId, isEligible: true }
    })

    console.log(`Total participants: ${totalParticipants}, Eligible: ${eligibleParticipants}`)

    // Get tier counts for eligible participants only
    const tierCounts = await prisma.participant.groupBy({
      where: { roundId: snap.roundId, isEligible: true },
      by: ['tier'],
      _count: { _all: true },
    })
    const participantCounts = {
      t1: tierCounts.find(t => t.tier === 1)?._count._all ?? 0,
      t2: tierCounts.find(t => t.tier === 2)?._count._all ?? 0,
      t3: tierCounts.find(t => t.tier === 3)?._count._all ?? 0,
      t4: tierCounts.find(t => t.tier === 4)?._count._all ?? 0,
    }
    console.log('Snapshot confirm - eligibleParticipantCounts:', participantCounts)

    await prisma.round.update({
      where: { id: snap.roundId },
      data: { totalParticipants, eligibleParticipants },
    })
    await prisma.snapshot.update({ where: { id: snapshotId }, data: { status: 'CONFIRMED' } })

    const updatedRound = await prisma.round.findUnique({ where: { id: snap.roundId } })
    const response = {
      ok: true,
      snapshotId,
      totals: { total: updatedRound?.totalParticipants, eligible: updatedRound?.eligibleParticipants },
      participantCounts
    }
    console.log('Snapshot confirm - response:', JSON.stringify(response, null, 2))
    return res.json(response)
  } catch (e) {
    console.error('snapshot/confirm failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /snapshot/:snapshotId/participants - Get all participants as JSON
router.get('/:snapshotId/participants', requireJwt, async (req, res) => {
  try {
    const { snapshotId } = req.params
    if (!snapshotId) return res.status(400).json({ error: 'Missing snapshotId' })

    const snap = await prisma.snapshot.findUnique({ where: { id: snapshotId } })
    if (!snap) return res.status(404).json({ error: 'Snapshot not found' })

    const participants = await prisma.participant.findMany({
      where: { roundId: snap.roundId },
      orderBy: [
        { tier: 'asc' },
        { tokenBalance: 'desc' }
      ]
    })

    // Get round info for drawing date
    const round = await prisma.round.findUnique({ where: { id: snap.roundId } })

    const participantList = participants.map(p => ({
      roundId: snap.roundId,
      wallet: p.wallet,
      currentLottoUsd: p.tokenBalance, // For now, using token amount as USD (will be calculated in production)
      assignedTier: p.tier,
      percentTraded: p.eligibilityScore ?? 0,
      isEligible: p.isEligible,
      isWinner: p.isWinner,
      drawingDate: round?.drawingDate ?? null,
      distributionTransaction: null // Will be populated after distribution
    }))

    return res.json({
      snapshotId,
      roundId: snap.roundId,
      totalParticipants: participants.length,
      eligibleParticipants: participants.filter(p => p.isEligible).length,
      participants: participantList
    })
  } catch (e) {
    console.error('snapshot/:snapshotId/participants failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /snapshot/:snapshotId/participants/export - Export participants as CSV
router.get('/:snapshotId/participants/export', requireJwt, async (req, res) => {
  try {
    const { snapshotId } = req.params
    if (!snapshotId) return res.status(400).json({ error: 'Missing snapshotId' })

    const snap = await prisma.snapshot.findUnique({ where: { id: snapshotId } })
    if (!snap) return res.status(404).json({ error: 'Snapshot not found' })

    const participants = await prisma.participant.findMany({
      where: { roundId: snap.roundId },
      orderBy: [
        { tier: 'asc' },
        { tokenBalance: 'desc' }
      ]
    })

    // Get round info for drawing date
    const round = await prisma.round.findUnique({ where: { id: snap.roundId } })

    // Build CSV
    const headers = [
      'Round ID',
      'Wallet Address',
      'Current $LOTTO (USD)',
      'Assigned Tier',
      'Percent Traded',
      'Is Eligible',
      'Is Winner',
      'Drawing Date',
      'Distribution Transaction'
    ]

    const rows = participants.map(p => {
      return [
        snap.roundId,
        p.wallet,
        p.tokenBalance ?? 0, // For now, using token amount (will calculate USD in production)
        p.tier ?? 0,
        p.eligibilityScore ?? 0,
        p.isEligible ? 'Yes' : 'No',
        p.isWinner ? 'Yes' : 'No',
        round?.drawingDate ? new Date(round.drawingDate).toISOString() : '',
        '' // Will be populated after distribution
      ]
    })

    // Convert to CSV format
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape cells containing commas or quotes
        const cellStr = String(cell)
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`
        }
        return cellStr
      }).join(','))
    ].join('\n')

    // Set response headers for file download
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="snapshot-${snapshotId}-participants.csv"`)

    return res.send(csvContent)
  } catch (e) {
    console.error('snapshot/:snapshotId/participants/export failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
