import express from 'express'
import prisma, { prismaRO } from '../prisma'
import { requireJwt } from '../middleware/requireJwt'

const router = express.Router()

const runParticipantQuery = async <T>(runner: (client: typeof prisma) => Promise<T>): Promise<T> => {
  try {
    return await runner(prismaRO)
  } catch (error) {
    if (isParticipantPermissionError(error)) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn('Participant query fallback to primary client:', message)
      return runner(prisma)
    }
    throw error
  }
}

const isParticipantPermissionError = (error: unknown) => {
  if (!error) return false
  const info = String((error as any)?.message ?? '') + String((error as any)?.cause?.message ?? '')
  return info.includes('permission denied for table') || info.includes('42501')
}

// GET /history/rounds - recent rounds list
router.get('/rounds', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')) || 1)
    const size = Math.max(1, Math.min(100, parseInt(String(req.query.size || '20')) || 20))
    const skip = (page - 1) * size
    const [total, rounds] = await Promise.all([
      prismaRO.round.count(),
      // Sort by drawingDate desc (most recent first), nulls last, then createdAt desc as fallback
      prismaRO.round.findMany({
        orderBy: [
          { drawingDate: { sort: 'desc', nulls: 'last' } },
          { createdAt: 'desc' }
        ],
        skip,
        take: size
      }),
    ])
    return res.json({ rounds, meta: { page, size, total, pages: Math.ceil(total / size) } })
  } catch (e) {
    console.error('GET /history/rounds failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /history/round/:id - round detail (public)
router.get('/round/:id', async (req, res) => {
  const id = String(req.params.id || '')
  if (!id) return res.status(400).json({ error: 'Missing id' })
  try {
    const round = await prismaRO.round.findUnique({ where: { id } })
    if (!round) return res.status(404).json({ error: 'Not found' })
    const winners = (round.tierWinners as any) || {}
    const payouts = (round.tierPayouts as any) || {}
    // Load all participants so downstream exports see full counts
    const participants = await prismaRO.participant.findMany({
      where: { roundId: id },
      orderBy: [{ tier: 'asc' }, { wallet: 'asc' }],
    })
    const audit = {
      txSignatures: (round as any).distributionTxSignatures || [],
      ataAddresses: (round as any).distributionAtaAddresses || {},
      swapToLotto: round.swapToLotto,
      swapRouteId: round.swapRouteId,
      swapSlippage: round.swapSlippage,
    }
    return res.json({ round, winners, payouts, participants, audit })
  } catch (e) {
    console.error('GET /history/round/:id failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /history/wallet/:address - all entries for a wallet across rounds
router.get('/wallet/:address', async (req, res) => {
  const address = String(req.params.address || '').trim()
  if (!address) return res.status(400).json({ error: 'Missing address' })
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')) || 1)
    const size = Math.max(1, Math.min(100, parseInt(String(req.query.size || '20')) || 20))
    const skip = (page - 1) * size
    const where = { wallet: address } as any
    const [total, entries] = await Promise.all([
      prismaRO.participant.count({ where }),
      prismaRO.participant.findMany({ where, orderBy: { createdAt: 'desc' }, include: { round: true }, skip, take: size }),
    ])
    return res.json({ address, entries, meta: { page, size, total, pages: Math.ceil(total / size) } })
  } catch (e) {
    console.error('GET /history/wallet failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /history/export - CSV of rounds
router.get('/export', async (_req, res) => {
  try {
    const rounds = await prismaRO.round.findMany({ orderBy: { createdAt: 'desc' } })
    const headers = [
      'Round ID',
      'Round Start Date',
      'Round End Date',
      'Drawing Date',
      'Distribution Date',
      'Prize Pool (SOL)',
      'Prize Distribution %',
      'Prize Source Wallet',
      'Prize Source Balance (SOL)',
      'Total Participants',
      'Eligible Participants',
      'Tier',
      'Prize Tier Won',
      'Wallet Address',
      'Prize Amount (SOL)',
      'Tier 1 Payout (SOL)',
      'Tier 2 Payout (SOL)',
      'Tier 3 Payout (SOL)',
      'Tier 4 Payout (SOL)',
      'Transaction Signature'
    ]
    const rows: string[][] = []
    for (const r of rounds) {
      const winners = (r.tierWinners as any) || {}
      const payouts = (r.tierPayouts as any) || {}
      const txSignatures = (r.distributionTxSignatures as any) || []
      const tiers = ['t1','t2','t3','t4']
      for (let i = 0; i < tiers.length; i++) {
        const t = tiers[i]
        rows.push([
          r.id,
          r.startDate?.toISOString?.() || '',
          r.endDate?.toISOString?.() || '',
          r.drawingDate?.toISOString?.() || '',
          r.distributionDate?.toISOString?.() || '',
          String(r.prizePoolSol ?? ''),
          String(r.prizeDistributionPercent ?? ''),
          r.prizeSourceWallet || '',
          String(r.prizeSourceBalanceSol ?? ''),
          String(r.totalParticipants ?? 0),
          String(r.eligibleParticipants ?? 0),
          t.toUpperCase(),
          winners?.[t] ? `TIER ${i + 1}` : '',
          winners?.[t] || '',
          payouts?.[t]?.toString?.() || '',
          String(payouts?.t1 ?? ''),
          String(payouts?.t2 ?? ''),
          String(payouts?.t3 ?? ''),
          String(payouts?.t4 ?? ''),
          txSignatures[i] || '',
        ])
      }
    }
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(','))
      .join('\n')

    // Generate filename with date: solotto_rounds_YYYY-MM-DD.csv
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `solotto_rounds_${dateStr}.csv`

    res.setHeader('Content-Type','text/csv')
    res.setHeader('Content-Disposition',`attachment; filename="${filename}"`)
    return res.send(csv)
  } catch (e) {
    console.error('GET /history/export failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /history/export/participants - CSV of all participants
router.get('/export/participants', async (_req, res) => {
  try {
    const participants = await prismaRO.participant.findMany({ include: { round: true } })
    const headers = [
      'Round ID',
      'Participant ID',
      'Wallet Address',
      'Round Start Date',
      'Round End Date',
      'Drawing Date',
      'Token LOTTO Balance',
      'Token USD Balance',
      'Tier',
      'Eligibility Score',
      'Is Eligible',
      'Is Winner',
      'Is Blacklisted'
    ]
    const rows = participants.map((p) => [
      p.roundId,
      p.id,
      p.wallet,
      p.round?.startDate?.toISOString?.() || '',
      p.round?.endDate?.toISOString?.() || '',
      p.round?.drawingDate?.toISOString?.() || '',
      (p as any).tokenLottoBalanceEnd?.toString?.() || '',
      (p as any).tokenUsdBalance?.toString?.() || '',
      p.tier?.toString?.() || '',
      p.eligibilityScore?.toString?.() || '', // Trading activity %
      (p as any).isEligible ? 'TRUE' : 'FALSE',
      p.isWinner ? 'TRUE' : 'FALSE',
      'FALSE', // Blacklisted wallets are excluded from participants table
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(','))
      .join('\n')

    // Generate filename with date: solotto_participants_YYYY-MM-DD.csv
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `solotto_participants_${dateStr}.csv`

    res.setHeader('Content-Type','text/csv')
    res.setHeader('Content-Disposition',`attachment; filename="${filename}"`)
    return res.send(csv)
  } catch (e) {
    console.error('GET /history/export/participants failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// ADMIN: Export JSON of rounds (+ participants)
router.get('/admin/export/json', requireJwt as any, async (req, res) => {
  try {
    const roundId = req.query.roundId ? String(req.query.roundId) : null
    const rounds = roundId
      ? await prisma.round.findMany({ where: { id: roundId }, orderBy: { createdAt: 'desc' } })
      : await prisma.round.findMany({ orderBy: { createdAt: 'desc' } })
    const roundIds = rounds.map((r) => r.id)
    const participants = await prisma.participant.findMany({ where: { roundId: { in: roundIds } } })
    return res.json({ rounds, participants })
  } catch (e) {
    console.error('GET /history/admin/export/json failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// ADMIN: Import JSON of rounds and participants
router.post('/admin/import/json', requireJwt as any, async (req, res) => {
  try {
    const { rounds = [], participants = [] } = req.body || {}
    // Basic upsert behavior: if id provided, try create and ignore conflicts
    for (const r of rounds) {
      await prisma.round.upsert({
        where: { id: r.id ?? '' },
        update: {
          startDate: r.startDate ? new Date(r.startDate) : undefined,
          endDate: r.endDate ? new Date(r.endDate) : undefined,
          drawingDate: r.drawingDate ? new Date(r.drawingDate) : undefined,
          distributionDate: r.distributionDate ? new Date(r.distributionDate) : undefined,
          prizePoolSol: r.prizePoolSol,
          totalParticipants: r.totalParticipants,
          eligibleParticipants: r.eligibleParticipants,
          tierWinners: r.tierWinners,
          tierPayouts: r.tierPayouts,
          distributionTxSignatures: r.distributionTxSignatures,
          distributionAtaAddresses: r.distributionAtaAddresses,
          swapToLotto: r.swapToLotto,
          swapRouteId: r.swapRouteId,
          swapSlippage: r.swapSlippage,
        },
        create: {
          id: r.id,
          startDate: new Date(r.startDate),
          endDate: new Date(r.endDate),
          drawingDate: r.drawingDate ? new Date(r.drawingDate) : null,
          distributionDate: r.distributionDate ? new Date(r.distributionDate) : null,
          prizePoolSol: r.prizePoolSol ?? 0,
          totalParticipants: r.totalParticipants ?? 0,
          eligibleParticipants: r.eligibleParticipants ?? 0,
          tierWinners: r.tierWinners ?? {},
          tierPayouts: r.tierPayouts ?? {},
          distributionTxSignatures: r.distributionTxSignatures ?? [],
          distributionAtaAddresses: r.distributionAtaAddresses ?? {},
          swapToLotto: !!r.swapToLotto,
          swapRouteId: r.swapRouteId ?? null,
          swapSlippage: r.swapSlippage ?? null,
        },
      })
    }
    for (const p of participants) {
      await prisma.participant.upsert({
        where: { id: p.id ?? '' },
        update: {
          roundId: p.roundId,
          wallet: p.wallet,
          tokenLottoBalanceStart: p.tokenLottoBalanceStart,
          tokenLottoBalanceEnd: p.tokenLottoBalanceEnd,
          tokenUsdBalance: p.tokenUsdBalance,
          tier: p.tier,
          eligibilityScore: p.eligibilityScore,
          isWinner: !!p.isWinner,
        },
        create: {
          id: p.id,
          roundId: p.roundId,
          wallet: p.wallet,
          tokenLottoBalanceStart: p.tokenLottoBalanceStart ?? null,
          tokenLottoBalanceEnd: p.tokenLottoBalanceEnd ?? null,
          tokenUsdBalance: p.tokenUsdBalance ?? null,
          tier: p.tier ?? null,
          eligibilityScore: p.eligibilityScore ?? null,
          isWinner: !!p.isWinner,
        },
      })
    }
    return res.json({ ok: true })
  } catch (e) {
    console.error('POST /history/admin/import/json failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /history/round/:id/audit/distribution - persist on-chain audit for distribution
router.post('/round/:id/audit/distribution', requireJwt as any, async (req, res) => {
  const id = String(req.params.id || '')
  if (!id) return res.status(400).json({ error: 'Missing id' })
  const { txSignatures = [], ataAddresses = {}, swapToLotto = false, routeId = null, slippage = null } = req.body || {}
  try {
    const updated = await prisma.round.update({
      where: { id },
      data: {
        distributionTxSignatures: txSignatures,
        distributionAtaAddresses: ataAddresses,
        swapToLotto: !!swapToLotto,
        swapRouteId: routeId,
        swapSlippage: slippage,
        distributionDate: new Date(),
      },
    })
    return res.json({ ok: true, roundId: updated.id })
  } catch (e) {
    console.error('POST /history/round/:id/audit/distribution failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /history/search?q=partialAddress - partial match search
router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim()
  if (!q || q.length < 3) return res.json({ entries: [] })
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')) || 1)
    const size = Math.max(1, Math.min(100, parseInt(String(req.query.size || '20')) || 20))
    const skip = (page - 1) * size
    const where = { wallet: { contains: q } } as any
    const [total, entries] = await Promise.all([
      prismaRO.participant.count({ where }),
      prismaRO.participant.findMany({ where, orderBy: { createdAt: 'desc' }, include: { round: true }, skip, take: size }),
    ])
    return res.json({ entries, meta: { page, size, total, pages: Math.ceil(total / size) } })
  } catch (e) {
    console.error('GET /history/search failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /history/export/round/:id/full - Consolidated CSV export for a complete round
router.get('/export/round/:id/full', async (req, res) => {
  const roundId = String(req.params.id || '')
  if (!roundId) return res.status(400).json({ error: 'Missing round ID' })

  try {
    // Get round with all related data (use prisma instead of prismaRO for full access)
    const round = await prisma.round.findUnique({
      where: { id: roundId },
      include: {
        participants: {
          orderBy: [{ tier: 'asc' }, { wallet: 'asc' }]
        },
        snapshots: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        drawings: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    })

    if (!round) return res.status(404).json({ error: 'Round not found' })

    const snapshot = round.snapshots[0]
    const drawing = round.drawings[0]
    const winners = (round.tierWinners as any) || {}
    const payouts = (round.tierPayouts as any) || {}
    const txSignatures = (round.distributionTxSignatures as any) || []
    const ataAddresses = (round.distributionAtaAddresses as any) || {}

    // Get network from environment for Solscan URLs
    const network = process.env.SOLANA_NETWORK || 'devnet'
    const cluster = network === 'mainnet-beta' ? '' : `?cluster=${network}`

    // CSV Headers (matching source of truth.csv exactly)
    const headers = [
      'Round ID',
      'Wallet Address',
      'Participant ID',
      'Round Start Date',
      'Round End Date',
      'Drawing Date',
      'Distribution Date',
      'Prize Pool (SOL)',
      'Prize Distribution %',
      'Prize Source Wallet',
      'Prize Source Balance (SOL)',
      'Total Participants',
      'Eligible Participants',
      'Snapshot ID',
      'Snapshot Started At',
      'Snapshot Completed At',
      'Drawing ID',
      'Drawing Started At',
      'Drawing Completed At',
      'Drawing Seed',
      'Drawing Blockhash',
      'Drawing Slot',
      'Token LOTTO Balance',
      'Token USD Balance',
      'Tier',
      'Eligibility Score',
      'Is Eligible',
      'Is Winner',
      'Is Blacklisted',
      'Prize Tier Won',
      'Prize Amount (SOL)',
      'Tier 1 Payout (SOL)',
      'Tier 2 Payout (SOL)',
      'Tier 3 Payout (SOL)',
      'Tier 4 Payout (SOL)',
      'Transaction Signature',
      'Solscan URL',
      'ATA Address',
      'Swapped To LOTTO',
      'Swap Route ID',
      'Swap Slippage %'
    ]

    // Build rows - one per participant
    const rows: string[][] = []

    for (const participant of round.participants) {
      // Determine if participant is a winner and which tier
      let prizeTierWon = ''
      let prizeAmount = ''
      let txSignature = ''
      let solscanUrl = ''
      let ataAddress = ''

      if (participant.isWinner) {
        const tiers = ['t1', 't2', 't3', 't4']
        for (let i = 0; i < tiers.length; i++) {
          const tierKey = tiers[i]
          if (winners[tierKey] === participant.wallet) {
            prizeTierWon = `TIER ${i + 1}`
            prizeAmount = payouts[tierKey]?.toString() || ''
            txSignature = txSignatures[i] || ''
            if (txSignature) {
              solscanUrl = `https://solscan.io/tx/${txSignature}${cluster}`
            }
            ataAddress = ataAddresses[tierKey] || ''
            break
          }
        }
      }

      rows.push([
        round.id,
        participant.wallet,
        participant.id,
        round.startDate?.toISOString() || '',
        round.endDate?.toISOString() || '',
        round.drawingDate?.toISOString() || '',
        round.distributionDate?.toISOString() || '',
        round.prizePoolSol?.toString() || '',
        round.prizeDistributionPercent?.toString() || '',
        round.prizeSourceWallet || '',
        round.prizeSourceBalanceSol?.toString() || '',
        round.totalParticipants?.toString() || '',
        round.eligibleParticipants?.toString() || '',
        snapshot?.id || '',
        snapshot?.startedAt?.toISOString() || '',
        snapshot?.completedAt?.toISOString() || '',
        drawing?.id || '',
        drawing?.startedAt?.toISOString() || '',
        drawing?.completedAt?.toISOString() || '',
        drawing?.seed || '',
        drawing?.blockhash || '',
        drawing?.slot?.toString() || '',
        (participant as any).tokenLottoBalanceEnd?.toString() || '',
        (participant as any).tokenUsdBalance?.toString() || '',
        participant.tier?.toString() || '',
        participant.eligibilityScore?.toString() || '', // Trading activity %
        participant.isEligible ? 'TRUE' : 'FALSE',
        participant.isWinner ? 'TRUE' : 'FALSE',
        'FALSE', // is_blacklisted - blacklisted wallets are excluded from participants table
        prizeTierWon,
        prizeAmount,
        payouts.t1?.toString() || '',
        payouts.t2?.toString() || '',
        payouts.t3?.toString() || '',
        payouts.t4?.toString() || '',
        txSignature,
        solscanUrl,
        ataAddress,
        round.swapToLotto ? 'TRUE' : 'FALSE',
        round.swapRouteId || '',
        round.swapSlippage?.toString() || ''
      ])
    }

    // Generate CSV
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    // Filename: solotto_round_{date}_{roundId-first8}.csv
    const dateStr = round.drawingDate
      ? round.drawingDate.toISOString().split('T')[0]
      : round.createdAt.toISOString().split('T')[0]
    const roundIdShort = round.id.slice(0, 8)
    const filename = `solotto_round_${dateStr}_${roundIdShort}_full.csv`

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
    return res.send(csv)
  } catch (e) {
    console.error('GET /history/export/round/:id/full failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

