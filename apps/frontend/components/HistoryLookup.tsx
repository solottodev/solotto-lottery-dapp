"use client";

import { useEffect, useState } from 'react'
import { useModuleStore } from '@/hooks/useModuleStore'

type Entry = {
  id: string
  wallet: string
  tokenBalance?: number
  tier?: number
  eligibilityScore?: number
  isWinner: boolean
  round?: { id: string; drawingDate?: string }
}

export default function HistoryLookup() {
  const [address, setAddress] = useState('')
  const [lookup, setLookup] = useState<Entry[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(false)
  const [rounds, setRounds] = useState<any[]>([])
  const [roundMeta, setRoundMeta] = useState<{page:number,size:number,total:number,pages:number}>({ page: 1, size: 20, total: 0, pages: 1 })
  const [roundPage, setRoundPage] = useState(1)
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
      }
    }
    load()
    return () => { cancelled = true }
  }, [roundPage, setHistoryRoundsFromApi])



  const onLookup = async () => {
    setLoading(true)
    setLookup(null)
    try {
      const res = await fetch(`/api/history/wallet?address=${encodeURIComponent(address)}`)
      const data = await res.json()
      setLookup(data.entries || [])
    } catch {
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
      p.tier ?? '',
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
          className="w-full sm:min-w-[240px] md:min-w-[280px] sm:flex-1 rounded-md border border-primary/25 bg-night-800 px-3 py-2 text-xs sm:text-sm text-white placeholder:text-slate-500"
        />
        <button onClick={onLookup} className="w-full sm:w-auto rounded-md bg-badge-gradient px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white disabled:opacity-60" disabled={!address || loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
        <button onClick={() => { window.open('/api/history/export','_blank') }} className="w-full sm:w-auto rounded-md border border-primary/25 bg-night-800 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary">Export Rounds CSV</button>
        <button onClick={() => { window.open('/api/history/export/participants','_blank') }} className="w-full sm:w-auto rounded-md border border-primary/25 bg-night-800 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary">Export Participants CSV</button>
        {lookup && lookup.length > 0 && (
          <button
            onClick={() => {
              const headers = ['Round','Tier','Token Balance','Eligibility','Winner','Drawing Date']
              const rows = lookup.map((e) => [
                e.round?.id || '',
                e.tier ?? '',
                e.tokenBalance ?? '',
                e.eligibilityScore ?? '',
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

      {lookup && (
        <div className="mt-3 sm:mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="p-1.5 sm:p-2">Round</th>
                <th className="p-1.5 sm:p-2">Tier</th>
                <th className="p-1.5 sm:p-2 hidden sm:table-cell">Token Balance</th>
                <th className="p-1.5 sm:p-2 hidden md:table-cell">Eligibility</th>
                <th className="p-1.5 sm:p-2">Winner</th>
                <th className="p-1.5 sm:p-2 hidden lg:table-cell">Drawing Date</th>
              </tr>
            </thead>
            <tbody>
              {lookup.map((e) => (
                <tr key={e.id} className="border-t border-primary/10">
                  <td className="p-1.5 sm:p-2 text-slate-300">
                    <a className="text-primary underline break-all" href={`/history/${e.round?.id}`}>{e.round?.id}</a>
                  </td>
                  <td className="p-1.5 sm:p-2">{e.tier ?? '—'}</td>
                  <td className="p-1.5 sm:p-2 hidden sm:table-cell">{e.tokenBalance ?? '—'}</td>
                  <td className="p-1.5 sm:p-2 hidden md:table-cell">{e.eligibilityScore ?? '—'}</td>
                  <td className="p-1.5 sm:p-2">{e.isWinner ? 'Yes' : 'No'}</td>
                  <td className="p-1.5 sm:p-2 hidden lg:table-cell">{e.round?.drawingDate ? new Date(e.round.drawingDate).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {lookup.length === 0 && <div className="mt-3 text-xs sm:text-sm text-slate-400">No entries found for this wallet.</div>}
          {searching && <div className="mt-3 text-xs sm:text-sm text-slate-400">Searching…</div>}
        </div>
      )}

      <div className="mt-6 sm:mt-8">
        <h2 className="text-base sm:text-lg md:text-xl font-semibold text-primary">Recent Rounds</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {rounds.map((r) => (
            <div key={r.id} className="rounded-lg border border-primary/20 bg-night-900/60 p-3 sm:p-4 text-xs sm:text-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <span className="text-primary font-semibold break-all text-sm sm:text-base">{r.id}</span>
                <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[9px] sm:text-[10px] text-primary whitespace-nowrap">Prize: {Number(r.prizePoolSol).toFixed(3)} SOL</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] sm:text-xs text-slate-300">
                <div>
                  <div className="text-slate-400">Drawing</div>
                  <div className="mt-0.5">{r.drawingDate ? new Date(r.drawingDate).toLocaleDateString() : 'N/A'}</div>
                </div>
                <div>
                  <div className="text-slate-400">Participants</div>
                  <div className="mt-0.5">{r.totalParticipants}</div>
                </div>
                <div>
                  <div className="text-slate-400">Eligible</div>
                  <div className="mt-0.5">{r.eligibleParticipants}</div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => {
                    const url = `/api/history/export/round/${r.id}/full`
                    window.location.href = url
                  }}
                  className="w-full sm:w-auto rounded-md bg-badge-gradient px-3 py-1.5 text-[10px] sm:text-xs font-semibold text-white hover:opacity-90"
                >
                  Export Full CSV
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-col sm:flex-row items-center justify-center sm:justify-end gap-2 text-[10px] sm:text-xs text-slate-400">
          <button disabled={roundPage<=1} onClick={() => setRoundPage((p)=>Math.max(1,p-1))} className="w-full sm:w-auto rounded-md border border-primary/25 px-3 py-1.5 sm:py-1 disabled:opacity-50">Prev</button>
          <span className="whitespace-nowrap">Page {roundMeta.page} / {roundMeta.pages}</span>
          <button disabled={roundMeta.page>=roundMeta.pages} onClick={() => setRoundPage((p)=>p+1)} className="w-full sm:w-auto rounded-md border border-primary/25 px-3 py-1.5 sm:py-1 disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  )
}
