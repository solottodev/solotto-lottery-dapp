import { NextRequest } from 'next/server'

export async function GET(_req: NextRequest, ctx: { params: { id: string } }) {
  const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
  const id = ctx.params.id
  const url = `${backend.replace(/\/$/, '')}/api/v1/history/round/${encodeURIComponent(id)}`
  const res = await fetch(url)
  const text = await res.text()
  return new Response(text, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } })
}

