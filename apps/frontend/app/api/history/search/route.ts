import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
  const q = new URL(req.url).searchParams.get('q') || ''
  const url = `${backend.replace(/\/$/, '')}/api/v1/history/search?q=${encodeURIComponent(q)}`
  const res = await fetch(url)
  const text = await res.text()
  return new Response(text, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } })
}
