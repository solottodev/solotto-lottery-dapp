import { NextRequest } from 'next/server'

function gen(): string {
  return Math.random().toString(36).slice(2).toUpperCase().padEnd(20, 'X')
}

export async function POST(_req: NextRequest) {
  // Stub endpoint: returns mock winners for each tier
  const payload = { winners: { t1: gen(), t2: gen(), t3: gen(), t4: gen() } }
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

