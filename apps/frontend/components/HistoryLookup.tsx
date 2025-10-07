"use client";

import { useEffect, useState } from 'react'

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
  const [roundMeta, setRoundMeta] = useState<{page:number,size:number,total:number,pages:number}>({page:1,size:20,total:0,pages:1})
  const [roundPage, setRoundPage] = useState(1)

  useEffect(() => {
    fetch(`/api/history/rounds?page=${roundPage}&size=10`).then((r) => r.json()).then((d) => {
      setRounds(d.rounds || [])
      if (d.meta) setRoundMeta(d.meta)
    }).catch(() => {})
  }, [roundPage])

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

  return (
    <div className="rounded-2xl border border-primary/20 bg-night-900/60 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          placeholder="Enter wallet address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="min-w-[280px] flex-1 rounded-md border border-primary/25 bg-night-800 px-3 py-2 text-sm text-white placeholder:text-slate-500"
        />
        <button onClick={onLookup} className="rounded-md bg-badge-gradient px-4 py-2 text-sm font-semibold text-white disabled:opacity-60" disabled={!address || loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
        <button onClick={() => { window.open('/api/history/export','_blank') }} className="rounded-md border border-primary/25 bg-night-800 px-4 py-2 text-sm font-semibold text-primary">Export Rounds CSV</button>
        <button onClick={() => { window.open('/api/history/export/participants','_blank') }} className="rounded-md border border-primary/25 bg-night-800 px-4 py-2 text-sm font-semibold text-primary">Export Participants CSV</button>
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
            className="rounded-md border border-primary/25 bg-night-800 px-4 py-2 text-sm font-semibold text-primary"
          >
            Export Result CSV
          </button>
        )}
      </div>

      {lookup && (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-slate-400">
              <tr>
                <th className="p-2">Round</th>
                <th className="p-2">Tier</th>
                <th className="p-2">Token Balance</th>
                <th className="p-2">Eligibility</th>
                <th className="p-2">Winner</th>
                <th className="p-2">Drawing Date</th>
              </tr>
            </thead>
            <tbody>
              {lookup.map((e) => (
                <tr key={e.id} className="border-t border-primary/10">
                  <td className="p-2 text-slate-300">
                    <a className="text-primary underline" href={`/history/${e.round?.id}`}>{e.round?.id}</a>
                  </td>
                  <td className="p-2">{e.tier ?? '—'}</td>
                  <td className="p-2">{e.tokenBalance ?? '—'}</td>
                  <td className="p-2">{e.eligibilityScore ?? '—'}</td>
                  <td className="p-2">{e.isWinner ? 'Yes' : 'No'}</td>
                  <td className="p-2">{e.round?.drawingDate ? new Date(e.round.drawingDate).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {lookup.length === 0 && <div className="mt-3 text-slate-400">No entries found for this wallet.</div>}
          {searching && <div className="mt-3 text-slate-400">Searching…</div>}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-primary">Recent Rounds</h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {rounds.map((r) => (
            <div key={r.id} className="rounded-lg border border-primary/20 bg-night-900/60 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-primary font-semibold">{r.id}</span>
                <span className="rounded-full border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Prize: {Number(r.prizePoolSol).toFixed(3)} SOL</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-slate-300">
                <div>
                  <div className="text-slate-400">Drawing</div>
                  <div>{r.drawingDate ? new Date(r.drawingDate).toLocaleDateString() : '—'}</div>
                </div>
                <div>
                  <div className="text-slate-400">Participants</div>
                  <div>{r.totalParticipants}</div>
                </div>
                <div>
                  <div className="text-slate-400">Eligible</div>
                  <div>{r.eligibleParticipants}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-slate-400">
          <button disabled={roundPage<=1} onClick={() => setRoundPage((p)=>Math.max(1,p-1))} className="rounded-md border border-primary/25 px-3 py-1 disabled:opacity-50">Prev</button>
          <span>Page {roundMeta.page} / {roundMeta.pages}</span>
          <button disabled={roundMeta.page>=roundMeta.pages} onClick={() => setRoundPage((p)=>p+1)} className="rounded-md border border-primary/25 px-3 py-1 disabled:opacity-50">Next</button>
        </div>
      </div>
    </div>
  )
}
