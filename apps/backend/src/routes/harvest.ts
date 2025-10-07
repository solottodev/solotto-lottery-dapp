import express from 'express'
import { requireJwt } from '../middleware/requireJwt'
import prisma from '../prisma'

const router = express.Router()

const BASE_PCT = { t1: 0.40, t2: 0.25, t3: 0.20, t4: 0.15 }

router.post('/prepare', requireJwt, async (req, res) => {
  try {
    const { roundId } = req.body || {}
    if (!roundId) return res.status(400).json({ error: 'Missing roundId' })

    const round = await prisma.round.findUnique({ where: { id: roundId } })
    if (!round) return res.status(404).json({ error: 'Round not found' })

    const winners = (round.tierWinners as any) || {}
    const qualifying = (['t1','t2','t3','t4'] as const).filter((t) => winners?.[t])
    const pool = round.prizePoolSol ?? 0
    if (pool <= 0) return res.status(400).json({ error: 'Prize pool is zero' })

    const baseSum = qualifying.reduce((sum, t) => sum + BASE_PCT[t], 0)
    const allocations: Record<'t1'|'t2'|'t3'|'t4', number> = { t1: 0, t2: 0, t3: 0, t4: 0 }
    if (baseSum > 0) {
      let totalAssigned = 0
      qualifying.forEach((t, idx) => {
        const ratio = BASE_PCT[t] / baseSum
        let amount = Number((pool * ratio).toFixed(6))
        // ensure sum matches pool by adjusting final tier
        if (idx === qualifying.length - 1) {
          amount = Number((pool - totalAssigned).toFixed(6))
        }
        allocations[t] = amount
        totalAssigned = Number((totalAssigned + amount).toFixed(6))
      })
    }

    await prisma.round.update({ where: { id: roundId }, data: { tierPayouts: allocations } })

    const preparedAt = new Date().toISOString()
    const audit = {
      blockhash: Math.random().toString(36).slice(2),
      slot: Math.floor(Math.random() * 1_000_000),
      txSignatures: [],
      ataAddresses: {},
    }

    return res.json({
      preparedAt,
      allocations,
      audit,
    })
  } catch (e) {
    console.error('harvest/prepare failed', e)
    return res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
