import express from 'express'
import { requireJwt } from '../middleware/requireJwt'

const router = express.Router()

// POST /distribution/release — stub implementation
router.post('/release', requireJwt, async (_req, res) => {
  const releasedAt = new Date().toISOString()
  const txSignatures = [`tx_${Math.random().toString(36).slice(2, 12)}`]
  return res.json({ releasedAt, txSignatures })
})

export default router

