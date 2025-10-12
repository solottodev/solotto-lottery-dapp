import { NextRequest } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: { snapshotId: string } }
) {
  const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
  const { snapshotId } = params
  const url = `${backend.replace(/\/$/, '')}/api/v1/snapshot/${snapshotId}/participants/export`
  const auth = req.headers.get('authorization')

  const res = await fetch(url, {
    method: 'GET',
    headers: {
      ...(auth ? { Authorization: auth } : {}),
    },
  })

  // Forward the CSV response with proper headers
  const csvContent = await res.text()

  return new Response(csvContent, {
    status: res.status,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': res.headers.get('content-disposition') || `attachment; filename="snapshot-${snapshotId}-participants.csv"`,
    },
  })
}
