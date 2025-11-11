export async function GET() {
  const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
  const url = `${backend.replace(/\/$/, '')}/api/v1/history/export`
  const res = await fetch(url, {
    cache: 'no-store' // Disable caching to always get fresh export data
  })
  const blob = await res.blob()
  return new Response(blob, { status: res.status, headers: { 'Content-Type': 'text/csv' } })
}
