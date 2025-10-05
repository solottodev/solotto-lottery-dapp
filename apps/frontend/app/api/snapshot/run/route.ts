import { NextRequest } from 'next/server'

export async function POST(_req: NextRequest) {
  const startedAt = new Date().toISOString()
  await new Promise((r) => setTimeout(r, 300))
  const completedAt = new Date().toISOString()
  const payload = {
    snapshotId: `snap_${Math.random().toString(36).slice(2, 10)}`,
    startedAt,
    completedAt,
  }
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

