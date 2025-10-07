export async function POST(req: Request, ctx: { params: { id: string } }) {
  const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
  const id = ctx.params.id
  const url = `${backend.replace(/\/$/, '')}/api/v1/history/round/${encodeURIComponent(id)}/audit/distribution`
  const body = await req.text()
  const auth = (req.headers as any).get?.('authorization') || undefined
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
    body,
  })
  const text = await res.text()
  return new Response(text, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json' } })
}

