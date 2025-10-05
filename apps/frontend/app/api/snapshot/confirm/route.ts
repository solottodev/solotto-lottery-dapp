import { NextRequest } from 'next/server'

export async function POST(_req: NextRequest) {
  await new Promise((r) => setTimeout(r, 150))
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

