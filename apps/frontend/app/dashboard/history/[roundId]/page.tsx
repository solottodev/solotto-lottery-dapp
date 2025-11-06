"use client";

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'

type Participant = {
  id: string
  wallet: string
  tier: number | null
  eligibilityScore: number | null
  isEligible: boolean
  isWinner: boolean
  tokenLottoBalanceStart: number | null
  tokenLottoBalanceEnd: number | null
  tokenUsdBalance: number | null
}

type RoundDetail = {
  id: string
  startDate: string
  endDate: string
  drawingDate: string | null
  distributionDate: string | null
  prizePoolSol: number
  prizeDistributionPercent: number
  prizeSourceWallet: string | null
  prizeSourceBalanceSol: number | null
  totalParticipants: number
  eligibleParticipants: number
  network: string
  tierWinners: { t1?: string; t2?: string; t3?: string; t4?: string }
  tierPayouts: { t1?: number; t2?: number; t3?: number; t4?: number }
  swapToLotto: boolean
  swapRouteId: string | null
  swapSlippage: number | null
}

type AuditData = {
  txSignatures: string[]
  ataAddresses: Record<string, string>
}

export default function HistoryDetailPage() {
  const params = useParams() as { roundId?: string }
  const roundId = params?.roundId || ''
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [round, setRound] = useState<RoundDetail | null>(null)
  const [participants, setParticipants] = useState<Participant[]>([])
  const [audit, setAudit] = useState<AuditData | null>(null)
  const [sortField, setSortField] = useState<'tier' | 'wallet' | 'eligibilityScore'>('tier')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    if (!roundId) return
    const fetchRound = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/history/round/${encodeURIComponent(roundId)}`)
        if (!res.ok) throw new Error('Failed to fetch round details')
        const data = await res.json()
        setRound(data.round)
        setParticipants(data.participants || [])
        setAudit(data.audit || null)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchRound()
  }, [roundId])

  const handleSort = (field: 'tier' | 'wallet' | 'eligibilityScore') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedParticipants = [...participants].sort((a, b) => {
    let aVal: any = a[sortField]
    let bVal: any = b[sortField]

    if (sortField === 'wallet') {
      aVal = aVal?.toLowerCase() || ''
      bVal = bVal?.toLowerCase() || ''
    }

    if (aVal === null || aVal === undefined) return 1
    if (bVal === null || bVal === undefined) return -1

    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const formatTier = (tier: number | null): string => {
    if (tier === null || tier === undefined) return 'Ineligible'
    return String(tier)
  }

  const getSolscanUrl = (signature: string, network?: string) => {
    const net = network || 'devnet'
    const cluster = net === 'mainnet-beta' ? '' : `?cluster=${net}`
    return `https://solscan.io/tx/${signature}${cluster}`
  }

  if (loading) {
    return (
      <main className="relative mx-auto flex min-h-screen w-full max-w-[95vw] sm:max-w-[90vw] 2xl:max-w-[1920px] flex-col gap-6 sm:gap-8 px-4 sm:px-6 md:px-8 lg:px-14 pb-20 sm:pb-24 pt-10 sm:pt-12 text-white">
        <div className="animate-pulse text-slate-400">Loading round details...</div>
      </main>
    )
  }

  if (error || !round) {
    return (
      <main className="relative mx-auto flex min-h-screen w-full max-w-[95vw] sm:max-w-[90vw] 2xl:max-w-[1920px] flex-col gap-6 sm:gap-8 px-4 sm:px-6 md:px-8 lg:px-14 pb-20 sm:pb-24 pt-10 sm:pt-12 text-white">
        <div className="text-red-400">Error: {error || 'Round not found'}</div>
        <Link href="/dashboard/history" className="text-primary underline hover:opacity-80">
          ← Back to History
        </Link>
      </main>
    )
  }

  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[95vw] sm:max-w-[90vw] 2xl:max-w-[1920px] flex-col gap-6 sm:gap-8 px-4 sm:px-6 md:px-8 lg:px-14 pb-20 sm:pb-24 pt-10 sm:pt-12 text-white">
      {/* Breadcrumb */}
      <nav className="text-xs sm:text-sm text-slate-400">
        <Link href="/dashboard/history" className="hover:text-primary transition-colors">History & Audit</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-300">Round Details</span>
      </nav>

      {/* Header */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold text-primary">Round Details</h1>
          <button
            onClick={() => window.location.href = `/api/history/export/round/${roundId}/full`}
            className="rounded-lg bg-badge-gradient px-4 sm:px-6 py-2 sm:py-3 text-xs sm:text-sm md:text-base font-semibold text-white shadow-md hover:opacity-90 transition-opacity"
          >
            Export Full Round CSV
          </button>
        </div>

        <div className="rounded-2xl sm:rounded-3xl border border-primary/20 bg-night-900/60 p-4 sm:p-5 md:p-6 shadow-panel">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div>
              <div className="text-xs sm:text-sm text-slate-400">Round ID</div>
              <div className="mt-1 text-sm sm:text-base text-slate-200 break-all font-mono">{round.id}</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-slate-400">Network</div>
              <div className="mt-1 text-sm sm:text-base text-slate-200 uppercase font-semibold">{round.network}</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-slate-400">Prize Pool</div>
              <div className="mt-1 text-sm sm:text-base text-primary font-semibold">{round.prizePoolSol?.toFixed(4)} SOL</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-slate-400">Round Start</div>
              <div className="mt-1 text-sm sm:text-base text-slate-200">{new Date(round.startDate).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-slate-400">Round End</div>
              <div className="mt-1 text-sm sm:text-base text-slate-200">{new Date(round.endDate).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-slate-400">Drawing Date</div>
              <div className="mt-1 text-sm sm:text-base text-slate-200">{round.drawingDate ? new Date(round.drawingDate).toLocaleString() : 'Pending'}</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-slate-400">Distribution Date</div>
              <div className="mt-1 text-sm sm:text-base text-slate-200">{round.distributionDate ? new Date(round.distributionDate).toLocaleString() : 'Pending'}</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-slate-400">Total Participants</div>
              <div className="mt-1 text-sm sm:text-base text-slate-200">{round.totalParticipants}</div>
            </div>
            <div>
              <div className="text-xs sm:text-sm text-slate-400">Eligible Participants</div>
              <div className="mt-1 text-sm sm:text-base text-slate-200">{round.eligibleParticipants}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Winners & Payouts */}
      <section className="space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-primary">Winners & Payouts</h2>
        <div className="rounded-2xl sm:rounded-3xl border border-primary/20 bg-night-900/60 p-4 sm:p-5 md:p-6 shadow-panel">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {['t1', 't2', 't3', 't4'].map((tier, idx) => {
              const tierKey = tier as 't1' | 't2' | 't3' | 't4'
              const winner = round.tierWinners[tierKey]
              const payout = round.tierPayouts[tierKey]
              const txSig = audit?.txSignatures?.[idx]

              return (
                <div key={tier} className="rounded-lg border border-primary/10 bg-night-800/40 p-3 sm:p-4">
                  <div className="text-sm sm:text-base font-semibold text-primary mb-2">Tier {idx + 1}</div>
                  <div className="space-y-1.5 text-xs sm:text-sm">
                    <div>
                      <span className="text-slate-400">Winner: </span>
                      <span className="text-slate-200 break-all font-mono">{winner || 'None'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Payout: </span>
                      <span className="text-primary font-semibold">{payout ? `${payout} SOL` : '—'}</span>
                    </div>
                    {winner && txSig && (
                      <div>
                        <span className="text-slate-400">Transaction: </span>
                        <a
                          href={getSolscanUrl(txSig, round.network)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline hover:opacity-80 break-all"
                        >
                          {txSig.slice(0, 8)}...{txSig.slice(-8)}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* All Participants */}
      <section className="space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-primary">All Participants ({participants.length})</h2>
        <div className="rounded-2xl sm:rounded-3xl border border-primary/20 bg-night-900/60 p-4 sm:p-5 md:p-6 shadow-panel overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm min-w-[800px]">
            <thead className="text-slate-400 border-b border-primary/10">
              <tr>
                <th className="p-2 cursor-pointer hover:text-primary" onClick={() => handleSort('wallet')}>
                  Wallet {sortField === 'wallet' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2 cursor-pointer hover:text-primary" onClick={() => handleSort('tier')}>
                  Tier {sortField === 'tier' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2">LOTTO Balance (End)</th>
                <th className="p-2">USD Value</th>
                <th className="p-2 cursor-pointer hover:text-primary" onClick={() => handleSort('eligibilityScore')}>
                  Trading % {sortField === 'eligibilityScore' && (sortDirection === 'asc' ? '↑' : '↓')}
                </th>
                <th className="p-2">Eligible</th>
                <th className="p-2">Winner</th>
              </tr>
            </thead>
            <tbody>
              {sortedParticipants.map((p) => (
                <tr key={p.id} className={`border-t border-primary/5 ${p.isWinner ? 'bg-primary/5' : ''}`}>
                  <td className="p-2 text-slate-300 font-mono break-all">{p.wallet}</td>
                  <td className="p-2">{formatTier(p.tier)}</td>
                  <td className="p-2">{p.tokenLottoBalanceEnd?.toFixed(2) ?? '—'}</td>
                  <td className="p-2">${p.tokenUsdBalance?.toFixed(2) ?? '—'}</td>
                  <td className="p-2">{p.eligibilityScore?.toFixed(1) ?? '—'}%</td>
                  <td className="p-2">{p.isEligible ? '✓' : '✗'}</td>
                  <td className="p-2">{p.isWinner ? <span className="text-primary font-semibold">✓ Winner</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {participants.length === 0 && (
            <div className="text-center py-8 text-slate-400">No participants found for this round.</div>
          )}
        </div>
      </section>
    </main>
  )
}

