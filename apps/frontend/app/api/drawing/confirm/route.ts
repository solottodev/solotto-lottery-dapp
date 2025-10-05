import { NextRequest } from 'next/server'

export async function POST(_req: NextRequest) {
  // Stub confirmation endpoint: returns ok
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

