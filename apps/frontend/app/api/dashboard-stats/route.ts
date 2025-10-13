import { NextRequest } from 'next/server'

// Disable caching for this route to ensure fresh stats
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(_req: NextRequest) {
  try {
    const backend = process.env.BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'
    const url = `${backend.replace(/\/$/, '')}/api/v1/history/stats`

    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    })

    if (!res.ok) {
      throw new Error(`Backend returned ${res.status}`)
    }

    const data = await res.json()

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    })
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats',
        network: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'devnet',
        totalRounds: 0,
        totalSolDistributed: 0,
        totalWinners: 0,
        avgPrizePool: 0,
        lastUpdated: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}
