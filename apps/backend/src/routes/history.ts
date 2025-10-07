import express from 'express'
import prisma, { prismaRO } from '../prisma'
import { requireJwt } from '../middleware/requireJwt'

const router = express.Router()

// GET /history/rounds — recent rounds list
router.get('/rounds', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page || '1')) || 1)
    const size = Math.max(1, Math.min(100, parseInt(String(req.query.size || '20')) || 20))
    const skip = (page - 1) * size
    const [total, rounds] = await Promise.all([
      prismaRO.round.count(),
      prismaRO.round.findMany({ orderBy: { createdAt: 'desc' }, skip, take: size }),
    ])
    return res.json({ rounds, meta: { page, size, total, pages: Math.ceil(total / size) } })
  } catch (e) {
    console.error('GET /history/rounds failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /history/round/:id — round detail (public)
router.get('/round/:id', async (req, res) => {
  const id = String(req.params.id || '')
  if (!id) return res.status(400).json({ error: 'Missing id' })
  try {
    const round = await prismaRO.round.findUnique({ where: { id } })
    if (!round) return res.status(404).json({ error: 'Not found' })
    const winners = (round.tierWinners as any) || {}
    const payouts = (round.tierPayouts as any) || {}
    // Optionally include winning participants if present
    const participants = await prismaRO.participant.findMany({ where: { roundId: id, isWinner: true } })
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

// GET /history/wallet/:address — all entries for a wallet across rounds
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

// GET /history/export — CSV of rounds
router.get('/export', async (_req, res) => {
  try {
    const rounds = await prismaRO.round.findMany({ orderBy: { createdAt: 'desc' } })
    const headers = [
      'id UUID (PRIMARY KEY)','Start Date','End Date','Drawing Date','Distribution Date','Prize Pool (SOL)','Total Participants','Eligible Participants','Tier','Winner Address','Prize Amount','Transaction Hash'
    ]
    const rows: string[][] = []
    for (const r of rounds) {
      const winners = (r.tierWinners as any) || {}
      const payouts = (r.tierPayouts as any) || {}
      const tiers = ['t1','t2','t3','t4']
      for (const t of tiers) {
        rows.push([
          r.id,
          r.startDate?.toISOString?.() || '',
          r.endDate?.toISOString?.() || '',
          r.drawingDate?.toISOString?.() || '',
          r.distributionDate?.toISOString?.() || '',
          String(r.prizePoolSol ?? ''),
          String(r.totalParticipants ?? 0),
          String(r.eligibleParticipants ?? 0),
          t.toUpperCase(),
          winners?.[t] || '',
          payouts?.[t]?.toString?.() || '',
          '',
        ])
      }
    }
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(','))
      .join('\n')
    res.setHeader('Content-Type','text/csv')
    res.setHeader('Content-Disposition','attachment; filename="solotto_history.csv"')
    return res.send(csv)
  } catch (e) {
    console.error('GET /history/export failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// GET /history/export/participants — CSV of all participants
router.get('/export/participants', async (_req, res) => {
  try {
    const participants = await prismaRO.participant.findMany({ include: { round: true } })
    const headers = ['uuID','Wallet Address','Token Balance','Tier','Eligibility Score','Is Winner','Drawing Date']
    const rows = participants.map((p) => [
      p.id,
      p.wallet,
      p.tokenBalance?.toString?.() || '',
      p.tier?.toString?.() || '',
      p.eligibilityScore?.toString?.() || '',
      p.isWinner ? 'true' : 'false',
      p.round?.drawingDate?.toISOString?.() || '',
    ])
    const csv = [headers, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(','))
      .join('\n')
    res.setHeader('Content-Type','text/csv')
    res.setHeader('Content-Disposition','attachment; filename="solotto_participants.csv"')
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
          tokenBalance: p.tokenBalance,
          tier: p.tier,
          eligibilityScore: p.eligibilityScore,
          isWinner: !!p.isWinner,
        },
        create: {
          id: p.id,
          roundId: p.roundId,
          wallet: p.wallet,
          tokenBalance: p.tokenBalance ?? null,
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

// POST /history/round/:id/audit/distribution — persist on-chain audit for distribution
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

export default router
// GET /history/search?q=partialAddress — partial match search
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
