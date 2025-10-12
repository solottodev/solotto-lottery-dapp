export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
  const url = `${backend.replace(/\/$/, '')}/api/v1/history/export/round/${params.id}/full`
  const res = await fetch(url)
  const blob = await res.blob()

  // Forward the content-disposition header to preserve the filename
  const contentDisposition = res.headers.get('content-disposition')
  const headers: HeadersInit = { 'Content-Type': 'text/csv' }
  if (contentDisposition) {
    headers['Content-Disposition'] = contentDisposition
  }

  return new Response(blob, { status: res.status, headers })
}
