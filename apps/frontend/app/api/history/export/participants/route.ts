export async function GET() {
  const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
  const url = `${backend.replace(/\/$/, '')}/api/v1/history/export/participants`
  const res = await fetch(url)
  const blob = await res.blob()
  return new Response(blob, { status: res.status, headers: { 'Content-Type': 'text/csv' } })
}
