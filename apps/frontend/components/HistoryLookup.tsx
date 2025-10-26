"use client";

import { useEffect, useState } from 'react'
import { useModuleStore } from '@/hooks/useModuleStore'

type Entry = {
  id: string
  wallet: string
  tokenLottoBalanceStart?: number
  tokenLottoBalanceEnd?: number
  tokenUsdBalance?: number
  tier?: number | null
  eligibilityScore?: number
  isEligible?: boolean
  isWinner: boolean
  round?: { id: string; drawingDate?: string; network?: string }
}

// Helper function to format tier display
const formatTier = (tier: number | null | undefined): string => {
  if (tier === null || tier === undefined) return 'Ineligible';
  return String(tier);
};

export default function HistoryLookup() {
  const [address, setAddress] = useState('')
  const [lookup, setLookup] = useState<Entry[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rounds, setRounds] = useState<any[]>([])
  const [roundMeta, setRoundMeta] = useState<{page:number,size:number,total:number,pages:number}>({ page: 1, size: 20, total: 0, pages: 1 })
  const [roundPage, setRoundPage] = useState(1)
  const [roundsLoading, setRoundsLoading] = useState(false)
  const [exportStatus, setExportStatus] = useState<{ type: string; status: 'idle' | 'loading' | 'success' | 'error' }>({ type: '', status: 'idle' })
  const [searchError, setSearchError] = useState<string | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({
    tier: 'all',
    status: 'all',
    isWinner: 'all',
  })
  const historyRounds = useModuleStore((state) => state.historyRounds)
  const setHistoryRoundsFromApi = useModuleStore((state) => state.setHistoryRoundsFromApi)
  const historyParticipants = useModuleStore((state) => state.historyParticipants)
  const setHistoryParticipants = useModuleStore((state) => state.setHistoryParticipants)
  const upsertHistoryRound = useModuleStore((state) => state.upsertHistoryRound)

  useEffect(() => {
    if (roundPage === 1) {
      setRounds(historyRounds)
      setRoundMeta((meta) => ({
        ...meta,
        page: 1,
        pages: 1,
        total: historyRounds.length,
        size: historyRounds.length || meta.size,
      }))
    }
  }, [historyRounds, roundPage])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        setRoundsLoading(true)
        const res = await fetch(`/api/history/rounds?page=${roundPage}&size=10`)
        if (!res.ok) throw new Error('failed history rounds request')
        const data = await res.json()
        if (cancelled) return
        if (roundPage === 1) {
          setHistoryRoundsFromApi(data.rounds || [])
        }
        setRounds(data.rounds || [])
        if (data.meta) {
          setRoundMeta(data.meta)
        }
      } catch (_) {
        if (cancelled) return
        if (roundPage === 1) {
          const localRounds = useModuleStore.getState().historyRounds || []
          setRounds(localRounds)
          setRoundMeta((meta) => ({
            ...meta,
            page: 1,
            pages: 1,
            total: localRounds.length,
            size: localRounds.length || meta.size,
          }))
        }
      } finally {
        if (!cancelled) setRoundsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [roundPage, setHistoryRoundsFromApi])



  const onLookup = async () => {
    setLoading(true)
    setLookup(null)
    setSearchError(null)
    try {
      const res = await fetch(`/api/history/wallet?address=${encodeURIComponent(address)}`)
      if (!res.ok) throw new Error('Failed to fetch wallet data')
      const data = await res.json()
      setLookup(data.entries || [])
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : 'Unknown error occurred')
      setLookup([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const q = address.trim()
    if (q.length < 3) { setSearching(false); return }
    setSearching(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/history/search?q=${encodeURIComponent(q)}&page=1&size=25`)
        const data = await res.json()
        setLookup(data.entries || null)
      } finally {
        setSearching(false)
      }
    }, 350)
    return () => clearTimeout(t)
  }, [address])

  const formatDate = (iso?: string | null) => (iso ? new Date(iso).toISOString() : '')
  const formatTxLink = (sig?: string | null) => (sig ? `https://solscan.io/tx/${sig}` : '')

  const handleExport = async (type: 'rounds' | 'participants' | 'wallet', url: string) => {
    try {
      setExportStatus({ type, status: 'loading' })
      window.open(url, '_blank')
      // Simulate success after a short delay (since window.open doesn't provide feedback)
      setTimeout(() => {
        setExportStatus({ type, status: 'success' })
        setTimeout(() => setExportStatus({ type: '', status: 'idle' }), 2000)
      }, 500)
    } catch (e) {
      setExportStatus({ type, status: 'error' })
      setTimeout(() => setExportStatus({ type: '', status: 'idle' }), 3000)
    }
  }

  const applyFilters = (entries: Entry[]) => {
    return entries.filter((entry) => {
      // Tier filter
      if (filters.tier !== 'all') {
        if (filters.tier === 'ineligible') {
          if (entry.tier !== null && entry.tier !== undefined) return false
        } else {
          if (entry.tier?.toString() !== filters.tier) return false
        }
      }

      // Status filter (eligible/ineligible)
      if (filters.status !== 'all') {
        if (filters.status === 'eligible' && !entry.isEligible) return false
        if (filters.status === 'ineligible' && entry.isEligible) return false
      }

      // Winner filter
      if (filters.isWinner !== 'all') {
        if (filters.isWinner === 'yes' && !entry.isWinner) return false
        if (filters.isWinner === 'no' && entry.isWinner) return false
      }

      return true
    })
  }

  const filteredLookup = lookup ? applyFilters(lookup) : null

  // Calculate statistics
  const calculateStats = (entries: Entry[]) => {
    if (!entries || entries.length === 0) return null

    const totalEntries = entries.length
    const winCount = entries.filter(e => e.isWinner).length
    const eligibleCount = entries.filter(e => e.isEligible).length
    const tierCounts = {
      t1: entries.filter(e => e.tier === 1).length,
      t2: entries.filter(e => e.tier === 2).length,
      t3: entries.filter(e => e.tier === 3).length,
      t4: entries.filter(e => e.tier === 4).length,
      ineligible: entries.filter(e => e.tier === null || e.tier === undefined).length,
    }
    const winRate = totalEntries > 0 ? ((winCount / totalEntries) * 100).toFixed(1) : '0'
    const eligibilityRate = totalEntries > 0 ? ((eligibleCount / totalEntries) * 100).toFixed(1) : '0'

    return {
      totalEntries,
      winCount,
      eligibleCount,
      tierCounts,
      winRate,
      eligibilityRate,
    }
  }

  const stats = lookup ? calculateStats(lookup) : null

  const downloadParticipantsCsv = (roundId: string, participants: any[], fallbackTx?: string | null) => {
    const headers = [
      'Round ID',
      'Wallet Address',
      'Current $LOTTO (USD)',
      'Assigned Tier',
      'Percent Traded',
      'Is Eligible',
      'Is Winner',
      'Drawing Date',
      'Distribution Transaction',
    ]
    const rows = participants.map((p) => [
      roundId,
      p.wallet || '',
      p.lottoUsdValue ?? p.tokenBalance ?? '',
      formatTier(p.tier),
      p.percentTraded ?? p.eligibilityScore ?? '',
      p.isEligible ? 'Yes' : 'No',
      p.isWinner ? 'Yes' : 'No',
      formatDate(p.drawingDate ?? p.drawing_date ?? null),
      // Only show distribution transaction for winners
      p.isWinner ? formatTxLink(p.distributionTx || fallbackTx || '') : '',
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${roundId}_participants.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportParticipants = async (roundId: string) => {
    const existing = historyParticipants?.[roundId]
    const round = historyRounds.find((r) => r.id === roundId)
    const txLink = round?.txSignatures && round.txSignatures.length > 0 ? round.txSignatures[0] : undefined
    if (existing && existing.length > 0) {
      downloadParticipantsCsv(roundId, existing, txLink || undefined)
      return
    }
    try {
      const res = await fetch(`/api/history/round/${encodeURIComponent(roundId)}`)
      if (!res.ok) throw new Error('failed to load participants')
      const data = await res.json()
      const participants = (data.participants || []).map((p: any) => ({
        roundId,
        wallet: p.wallet,
        lottoUsdValue: p.tokenBalance ?? null,
        tier: p.tier ?? null,
        percentTraded: p.eligibilityScore ?? null,
        isEligible: !!p.isEligible,
        isWinner: !!p.isWinner,
        drawingDate: data.round?.drawingDate || null,
        distributionTx: (data.audit?.txSignatures && data.audit.txSignatures[0]) || txLink || null,
      }))
      if (participants.length > 0) {
        setHistoryParticipants(roundId, participants, 'api')
        if (data.round) {
          upsertHistoryRound({
            id: data.round.id,
            drawingDate: data.round.drawingDate || null,
            distributionDate: data.round.distributionDate || null,
            prizePoolSol: data.round.prizePoolSol ?? round?.prizePoolSol,
            totalParticipants: data.round.totalParticipants ?? round?.totalParticipants ?? null,
            eligibleParticipants: data.round.eligibleParticipants ?? round?.eligibleParticipants ?? null,
            tierWinners: data.round.tierWinners || round?.tierWinners,
            tierPayouts: data.round.tierPayouts || round?.tierPayouts,
            txSignatures: data.audit?.txSignatures || round?.txSignatures,
            swapToLotto: data.round.swapToLotto ?? round?.swapToLotto,
            isLocal: false,
          })
        }
        downloadParticipantsCsv(roundId, participants, (data.audit?.txSignatures && data.audit.txSignatures[0]) || txLink || null)
        return
      }
    } catch (_) {
      // ignore and fall back to local preview if available
    }
    const fallback = historyParticipants?.[roundId] || []
    if (fallback.length > 0) {
      const fallbackTx = txLink || fallback[0]?.distributionTx || null
      downloadParticipantsCsv(roundId, fallback, fallbackTx)
    }
  }

  return (
    <div className="rounded-xl sm:rounded-2xl border border-primary/20 bg-night-900/60 p-3 sm:p-4">
      <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
        <input
          placeholder="Enter wallet address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !loading && address && onLookup()}
          className="w-full sm:min-w-[240px] md:min-w-[280px] sm:flex-1 rounded-md border border-primary/25 bg-night-800 px-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500"
          aria-label="Wallet address search"
        />
        <button onClick={onLookup} className="w-full sm:w-auto rounded-md bg-badge-gradient px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white disabled:opacity-60 hover:opacity-90 transition-opacity" disabled={!address || loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
        {lookup && lookup.length > 0 && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full sm:w-auto rounded-md border border-primary/25 bg-night-800 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary hover:bg-night-700 transition-colors"
          >
            {showFilters ? '✕ Hide Filters' : '⚙ Show Filters'}
          </button>
        )}
        <button
          onClick={() => handleExport('rounds', '/api/history/export')}
          disabled={exportStatus.type === 'rounds' && exportStatus.status === 'loading'}
          className="w-full sm:w-auto rounded-md border border-primary/25 bg-night-800 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary hover:bg-night-700 transition-colors disabled:opacity-60"
        >
          {exportStatus.type === 'rounds' && exportStatus.status === 'loading' ? 'Exporting...' : exportStatus.type === 'rounds' && exportStatus.status === 'success' ? '✓ Exported' : 'Export Rounds CSV'}
        </button>
        <button
          onClick={() => handleExport('participants', '/api/history/export/participants')}
          disabled={exportStatus.type === 'participants' && exportStatus.status === 'loading'}
          className="w-full sm:w-auto rounded-md border border-primary/25 bg-night-800 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary hover:bg-night-700 transition-colors disabled:opacity-60"
        >
          {exportStatus.type === 'participants' && exportStatus.status === 'loading' ? 'Exporting...' : exportStatus.type === 'participants' && exportStatus.status === 'success' ? '✓ Exported' : 'Export Participants CSV'}
        </button>
        {lookup && lookup.length > 0 && (
          <button
            onClick={() => {
              const headers = ['Network', 'Round', 'Tier', 'Token LOTTO Balance (Start)', 'Token LOTTO Balance (End)', 'Token USD Value', 'Trading Activity %', 'Is Eligible', 'Winner', 'Drawing Date']
              const rows = lookup.map((e) => [
                e.round?.network || '',
                e.round?.id || '',
                formatTier(e.tier),
                e.tokenLottoBalanceStart ?? '0',
                e.tokenLottoBalanceEnd ?? '0',
                e.tokenUsdBalance ?? '0',
                e.eligibilityScore ?? '0',
                e.isEligible ? 'Yes' : 'No',
                e.isWinner ? 'Yes' : 'No',
                e.round?.drawingDate || '',
              ])
              const csv = [headers, ...rows]
                .map((r) => r.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(','))
                .join('\n')
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'wallet_lookup.csv'
              a.click()
              URL.revokeObjectURL(url)
            }}
            className="w-full sm:w-auto rounded-md border border-primary/25 bg-night-800 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary"
          >
            Export Result CSV
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && lookup && lookup.length > 0 && (
        <div className="mt-4 rounded-lg border border-primary/20 bg-night-800/60 p-4">
          <h4 className="text-sm font-semibold text-primary mb-3">Filter Results</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Tier Filter */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Tier</label>
              <select
                value={filters.tier}
                onChange={(e) => setFilters({ ...filters, tier: e.target.value })}
                className="w-full rounded-md border border-primary/25 bg-night-900 px-3 py-2 text-xs text-white"
              >
                <option value="all">All Tiers</option>
                <option value="1">Tier 1</option>
                <option value="2">Tier 2</option>
                <option value="3">Tier 3</option>
                <option value="4">Tier 4</option>
                <option value="ineligible">Ineligible</option>
              </select>
            </div>

            {/* Eligibility Filter */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Eligibility Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full rounded-md border border-primary/25 bg-night-900 px-3 py-2 text-xs text-white"
              >
                <option value="all">All</option>
                <option value="eligible">Eligible Only</option>
                <option value="ineligible">Ineligible Only</option>
              </select>
            </div>

            {/* Winner Filter */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Winner Status</label>
              <select
                value={filters.isWinner}
                onChange={(e) => setFilters({ ...filters, isWinner: e.target.value })}
                className="w-full rounded-md border border-primary/25 bg-night-900 px-3 py-2 text-xs text-white"
              >
                <option value="all">All</option>
                <option value="yes">Winners Only</option>
                <option value="no">Non-Winners Only</option>
              </select>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(filters.tier !== 'all' || filters.status !== 'all' || filters.isWinner !== 'all') && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-slate-400">Active filters:</span>
              {filters.tier !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs text-primary">
                  Tier: {filters.tier === 'ineligible' ? 'Ineligible' : filters.tier}
                  <button onClick={() => setFilters({ ...filters, tier: 'all' })} className="hover:opacity-70">✕</button>
                </span>
              )}
              {filters.status !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs text-primary">
                  Status: {filters.status}
                  <button onClick={() => setFilters({ ...filters, status: 'all' })} className="hover:opacity-70">✕</button>
                </span>
              )}
              {filters.isWinner !== 'all' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-xs text-primary">
                  Winner: {filters.isWinner}
                  <button onClick={() => setFilters({ ...filters, isWinner: 'all' })} className="hover:opacity-70">✕</button>
                </span>
              )}
              <button
                onClick={() => setFilters({ tier: 'all', status: 'all', isWinner: 'all' })}
                className="text-xs text-slate-400 hover:text-primary transition-colors underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      {searchError && (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs sm:text-sm text-red-400">
          Error: {searchError}
        </div>
      )}

      {lookup && (
        <div className="mt-3 sm:mt-4">
          <div className="mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs sm:text-sm text-slate-400">
            <span>
              {filteredLookup && filteredLookup.length > 0 ? (
                <>
                  Showing {filteredLookup.length} of {lookup.length} {lookup.length === 1 ? 'entry' : 'entries'}
                  {filteredLookup.length < lookup.length && ' (filtered)'}
                </>
              ) : (
                'No entries match the current filters'
              )}
            </span>
            {filteredLookup && filteredLookup.length > 0 && (
              <span className="text-[10px] sm:hidden text-slate-500">← Scroll horizontally to view all columns</span>
            )}
          </div>
          {filteredLookup && filteredLookup.length > 0 && (
          <div className="relative overflow-x-auto shadow-inner rounded-lg border border-primary/10">
            <table className="w-full text-left text-xs sm:text-sm min-w-[640px]">
            <thead className="text-slate-400 bg-night-800/60 border-b border-primary/10">
              <tr>
                <th className="p-2 sm:p-3 font-semibold">Round</th>
                <th className="p-2 sm:p-3 font-semibold">Tier</th>
                <th className="p-2 sm:p-3 font-semibold hidden sm:table-cell">LOTTO Balance (End)</th>
                <th className="p-2 sm:p-3 font-semibold hidden md:table-cell">USD Value</th>
                <th className="p-2 sm:p-3 font-semibold hidden lg:table-cell">Trading Activity %</th>
                <th className="p-2 sm:p-3 font-semibold">Eligible</th>
                <th className="p-2 sm:p-3 font-semibold">Winner</th>
                <th className="p-2 sm:p-3 font-semibold hidden xl:table-cell">Drawing Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredLookup.map((e) => (
                <tr key={e.id} className={`border-t border-primary/5 hover:bg-night-800/40 transition-colors ${e.isWinner ? 'bg-primary/5' : ''}`}>
                  <td className="p-2 sm:p-3 text-slate-300">
                    <a className="text-primary underline break-all hover:opacity-80 transition-opacity" href={`/dashboard/history/${e.round?.id}`}>{e.round?.id}</a>
                  </td>
                  <td className="p-2 sm:p-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${e.tier ? 'bg-primary/10 text-primary' : 'bg-slate-700 text-slate-400'}`}>
                      {formatTier(e.tier)}
                    </span>
                  </td>
                  <td className="p-2 sm:p-3 hidden sm:table-cell text-slate-300">{e.tokenLottoBalanceEnd?.toFixed(2) ?? '—'}</td>
                  <td className="p-2 sm:p-3 hidden md:table-cell text-slate-300">${e.tokenUsdBalance?.toFixed(2) ?? '—'}</td>
                  <td className="p-2 sm:p-3 hidden lg:table-cell text-slate-300">{e.eligibilityScore?.toFixed(1) ?? '—'}%</td>
                  <td className="p-2 sm:p-3">
                    <span className={`inline-flex items-center gap-1 ${e.isEligible ? 'text-green-400' : 'text-slate-500'}`}>
                      {e.isEligible ? '✓' : '✗'}
                    </span>
                  </td>
                  <td className="p-2 sm:p-3">
                    {e.isWinner ? <span className="text-primary font-semibold">✓ Winner</span> : <span className="text-slate-500">—</span>}
                  </td>
                  <td className="p-2 sm:p-3 hidden xl:table-cell text-slate-400 text-xs">{e.round?.drawingDate ? new Date(e.round.drawingDate).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          )}

          {/* Statistics Dashboard */}
          {stats && lookup.length > 0 && (
            <div className="mt-4 rounded-lg border border-primary/20 bg-night-800/60 p-4">
              <h4 className="text-sm font-semibold text-primary mb-3">Participation Statistics</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <div className="rounded-md bg-night-900/60 p-3 border border-primary/10">
                  <div className="text-xs text-slate-400">Total Rounds</div>
                  <div className="mt-1 text-lg font-semibold text-primary">{stats.totalEntries}</div>
                </div>
                <div className="rounded-md bg-night-900/60 p-3 border border-primary/10">
                  <div className="text-xs text-slate-400">Total Wins</div>
                  <div className="mt-1 text-lg font-semibold text-green-400">{stats.winCount}</div>
                  <div className="text-[10px] text-slate-500">Win rate: {stats.winRate}%</div>
                </div>
                <div className="rounded-md bg-night-900/60 p-3 border border-primary/10">
                  <div className="text-xs text-slate-400">Eligible Rounds</div>
                  <div className="mt-1 text-lg font-semibold text-slate-200">{stats.eligibleCount}</div>
                  <div className="text-[10px] text-slate-500">{stats.eligibilityRate}% eligible</div>
                </div>
                <div className="rounded-md bg-night-900/60 p-3 border border-primary/10">
                  <div className="text-xs text-slate-400">Tier Breakdown</div>
                  <div className="mt-1 grid grid-cols-2 gap-1 text-xs">
                    <div className="text-slate-300">T1: <span className="font-semibold text-primary">{stats.tierCounts.t1}</span></div>
                    <div className="text-slate-300">T2: <span className="font-semibold text-primary">{stats.tierCounts.t2}</span></div>
                    <div className="text-slate-300">T3: <span className="font-semibold text-primary">{stats.tierCounts.t3}</span></div>
                    <div className="text-slate-300">T4: <span className="font-semibold text-primary">{stats.tierCounts.t4}</span></div>
                  </div>
                </div>
                <div className="rounded-md bg-night-900/60 p-3 border border-primary/10">
                  <div className="text-xs text-slate-400">Ineligible</div>
                  <div className="mt-1 text-lg font-semibold text-slate-500">{stats.tierCounts.ineligible}</div>
                  <div className="text-[10px] text-slate-500">No tier assigned</div>
                </div>
              </div>
            </div>
          )}

          {filteredLookup && filteredLookup.length === 0 && lookup.length > 0 && (
            <div className="mt-4 rounded-lg border border-primary/10 bg-night-800/40 p-6 text-center">
              <div className="text-sm sm:text-base text-slate-400">No entries match the current filters.</div>
              <div className="mt-2 text-xs text-slate-500">Try adjusting your filter settings or <button onClick={() => setFilters({ tier: 'all', status: 'all', isWinner: 'all' })} className="text-primary hover:underline">clear all filters</button>.</div>
            </div>
          )}
          {lookup.length === 0 && (
            <div className="mt-4 rounded-lg border border-primary/10 bg-night-800/40 p-6 text-center">
              <div className="text-sm sm:text-base text-slate-400">No entries found for this wallet address.</div>
              <div className="mt-2 text-xs text-slate-500">This wallet has not participated in any lottery rounds yet.</div>
            </div>
          )}
          {searching && (
            <div className="mt-3 flex items-center gap-2 text-xs sm:text-sm text-slate-400">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span>Searching…</span>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 sm:mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base sm:text-lg md:text-xl font-semibold text-primary">Recent Rounds</h2>
          {roundsLoading && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              <span>Loading...</span>
            </div>
          )}
        </div>

        {rounds.length === 0 && !roundsLoading ? (
          <div className="rounded-lg border border-primary/10 bg-night-800/40 p-8 text-center">
            <div className="text-sm sm:text-base text-slate-400">No rounds available yet.</div>
            <div className="mt-2 text-xs text-slate-500">Lottery rounds will appear here once they are created.</div>
          </div>
        ) : (
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {rounds.map((r) => (
            <div key={r.id} className="group rounded-lg border border-primary/20 bg-night-900/60 hover:bg-night-900/80 hover:border-primary/30 p-3 sm:p-4 text-xs sm:text-sm transition-all duration-200 hover:shadow-[0_0_20px_rgba(34,211,238,0.1)]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <a href={`/dashboard/history/${r.id}`} className="text-primary font-semibold break-all text-sm sm:text-base hover:underline hover:opacity-80 transition-opacity font-mono">{r.id}</a>
                <span className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[9px] sm:text-[10px] text-primary font-semibold whitespace-nowrap">
                  Prize: {Number(r.prizePoolSol).toFixed(3)} SOL
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-[10px] sm:text-xs">
                <div className="rounded-md bg-night-800/60 p-2">
                  <div className="text-slate-400 font-medium">Drawing</div>
                  <div className="mt-1 text-slate-200">{r.drawingDate ? new Date(r.drawingDate).toLocaleDateString() : <span className="text-slate-500">Pending</span>}</div>
                </div>
                <div className="rounded-md bg-night-800/60 p-2">
                  <div className="text-slate-400 font-medium">Participants</div>
                  <div className="mt-1 text-slate-200 font-semibold">{r.totalParticipants}</div>
                </div>
                <div className="rounded-md bg-night-800/60 p-2">
                  <div className="text-slate-400 font-medium">Eligible</div>
                  <div className="mt-1 text-primary font-semibold">{r.eligibleParticipants}</div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => {
                    const url = `/api/history/export/round/${r.id}/full`
                    window.location.href = url
                  }}
                  className="w-full sm:w-auto rounded-md bg-badge-gradient px-3 py-1.5 text-[10px] sm:text-xs font-semibold text-white hover:opacity-90 transition-opacity shadow-sm"
                  aria-label={`Export full CSV for round ${r.id}`}
                >
                  Export Full CSV
                </button>
              </div>
            </div>
          ))}
          </div>
        )}

        {rounds.length > 0 && (
          <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] sm:text-xs text-slate-400">
            <span className="text-slate-500">
              Showing {((roundMeta.page - 1) * roundMeta.size) + 1}-{Math.min(roundMeta.page * roundMeta.size, roundMeta.total)} of {roundMeta.total} rounds
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={roundPage <= 1 || roundsLoading}
                onClick={() => setRoundPage((p) => Math.max(1, p - 1))}
                className="w-full sm:w-auto rounded-md border border-primary/25 bg-night-800 px-3 py-1.5 sm:py-1 hover:bg-night-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="whitespace-nowrap">Page {roundMeta.page} / {roundMeta.pages}</span>
              <button
                disabled={roundMeta.page >= roundMeta.pages || roundsLoading}
                onClick={() => setRoundPage((p) => p + 1)}
                className="w-full sm:w-auto rounded-md border border-primary/25 bg-night-800 px-3 py-1.5 sm:py-1 hover:bg-night-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
