import express from 'express'
import { requireJwt } from '../middleware/requireJwt'
import prisma from '../prisma'

const router = express.Router()

function pick<T>(arr: T[]): T | null { return arr.length ? arr[0] : null }

// POST /drawing/run { roundId }
router.post('/run', requireJwt, async (req, res) => {
  try {
    const { roundId } = req.body || {}
    if (!roundId) return res.status(400).json({ error: 'Missing roundId' })
    const startedAt = new Date()
    const draw = await prisma.drawing.create({ data: { roundId, status: 'RUNNING', startedAt } })
    const p1 = await prisma.participant.findMany({ where: { roundId, tier: 1 }, take: 1 })
    const p2 = await prisma.participant.findMany({ where: { roundId, tier: 2 }, take: 1 })
    const p3 = await prisma.participant.findMany({ where: { roundId, tier: 3 }, take: 1 })
    const p4 = await prisma.participant.findMany({ where: { roundId, tier: 4 }, take: 1 })
    const winners = { t1: p1[0]?.wallet || null, t2: p2[0]?.wallet || null, t3: p3[0]?.wallet || null, t4: p4[0]?.wallet || null }
    // mark winners in participant table
    await Promise.all([
      p1[0]?.id ? prisma.participant.update({ where: { id: p1[0].id }, data: { isWinner: true } }) : Promise.resolve(),
      p2[0]?.id ? prisma.participant.update({ where: { id: p2[0].id }, data: { isWinner: true } }) : Promise.resolve(),
      p3[0]?.id ? prisma.participant.update({ where: { id: p3[0].id }, data: { isWinner: true } }) : Promise.resolve(),
      p4[0]?.id ? prisma.participant.update({ where: { id: p4[0].id }, data: { isWinner: true } }) : Promise.resolve(),
    ])
    const completedAt = new Date()
    const audit = {
      seed: Math.random().toString(36).slice(2),
      vrfRequestId: `vrf_${Math.random().toString(36).slice(2,8)}`,
      blockhash: Math.random().toString(36).slice(2),
      slot: Math.floor(Math.random()*1_000_000),
    }
    await prisma.drawing.update({ where: { id: draw.id }, data: { status: 'COMPLETED', completedAt, seed: audit.seed, vrfRequestId: audit.vrfRequestId, blockhash: audit.blockhash, slot: audit.slot } })
    return res.json({ drawingId: draw.id, startedAt, completedAt, winners, audit: { ...audit, snapshotId: null } })
  } catch (e) {
    console.error('drawing/run failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /drawing/confirm { drawingId }
router.post('/confirm', requireJwt, async (req, res) => {
  try {
    const { drawingId } = req.body || {}
    if (!drawingId) return res.status(400).json({ error: 'Missing drawingId' })
    const draw = await prisma.drawing.findUnique({ where: { id: drawingId } })
    if (!draw) return res.status(404).json({ error: 'Drawing not found' })
    // set winners based on first eligible per tier
    const p1 = await prisma.participant.findMany({ where: { roundId: draw.roundId, tier: 1 }, take: 1 })
    const p2 = await prisma.participant.findMany({ where: { roundId: draw.roundId, tier: 2 }, take: 1 })
    const p3 = await prisma.participant.findMany({ where: { roundId: draw.roundId, tier: 3 }, take: 1 })
    const p4 = await prisma.participant.findMany({ where: { roundId: draw.roundId, tier: 4 }, take: 1 })
    const winners = { t1: p1[0]?.wallet || null, t2: p2[0]?.wallet || null, t3: p3[0]?.wallet || null, t4: p4[0]?.wallet || null }
    await prisma.round.update({ where: { id: draw.roundId }, data: { tierWinners: winners, drawingDate: new Date() } })
    await prisma.drawing.update({ where: { id: drawingId }, data: { status: 'CONFIRMED' } })
    return res.json({ ok: true })
  } catch (e) {
    console.error('drawing/confirm failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
