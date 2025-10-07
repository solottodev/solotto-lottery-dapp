import express from 'express'
import { requireJwt } from '../middleware/requireJwt'
import prisma from '../prisma'

const router = express.Router()

// POST /snapshot/run { roundId }
router.post('/run', requireJwt, async (req, res) => {
  try {
    const { roundId } = req.body || {}
    if (!roundId) return res.status(400).json({ error: 'Missing roundId' })
    const snap = await prisma.snapshot.create({
      data: { roundId, status: 'RUNNING', startedAt: new Date() },
    })
    // simulate quick completion
    const completed = await prisma.snapshot.update({ where: { id: snap.id }, data: { status: 'COMPLETED', completedAt: new Date() } })
    return res.json({ snapshotId: completed.id, startedAt: completed.startedAt, completedAt: completed.completedAt })
  } catch (e) {
    console.error('snapshot/run failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

// POST /snapshot/confirm { snapshotId }
router.post('/confirm', requireJwt, async (req, res) => {
  try {
    const { snapshotId } = req.body || {}
    if (!snapshotId) return res.status(400).json({ error: 'Missing snapshotId' })
    const snap = await prisma.snapshot.findUnique({ where: { id: snapshotId } })
    if (!snap) return res.status(404).json({ error: 'Snapshot not found' })
    // Create mock participants deterministically if none exists
    const existing = await prisma.participant.count({ where: { roundId: snap.roundId } })
    if (existing === 0) {
      const total = 100
      const tiers = [1,2,3,4]
      for (let i=0;i<total;i++) {
        const tier = i < 5 ? 1 : i < 20 ? 2 : i < 50 ? 3 : 4
        await prisma.participant.create({ data: {
          roundId: snap.roundId,
          wallet: `WAL_${i}_${Math.random().toString(36).slice(2,10)}`,
          tokenBalance: Math.round(Math.random()*1000)/10,
          tier,
          eligibilityScore: Math.round(Math.random()*100)/10,
          isWinner: false,
        }})
      }
      await prisma.round.update({ where: { id: snap.roundId }, data: { totalParticipants: total, eligibleParticipants: total } })
    }
    await prisma.snapshot.update({ where: { id: snapshotId }, data: { status: 'CONFIRMED' } })
    const round = await prisma.round.findUnique({ where: { id: snap.roundId } })
    return res.json({ ok: true, snapshotId, totals: { total: round?.totalParticipants, eligible: round?.eligibleParticipants } })
  } catch (e) {
    console.error('snapshot/confirm failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router

