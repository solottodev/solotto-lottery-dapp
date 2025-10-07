"use client";

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function PublicRoundDetailPage({ params }: { params: { roundId: string } }) {
  const { roundId } = params
  const [data, setData] = useState<any | null>(null)

  useEffect(() => {
    fetch(`/api/history/round/${encodeURIComponent(roundId)}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData(null))
  }, [roundId])

  if (!data) {
    return (
      <main className="mx-auto max-w-5xl px-6 py-10 text-white">
        <p className="text-slate-300">Round not found.</p>
        <Link className="text-primary underline" href="/history">Back to History</Link>
      </main>
    )
  }

  const round = data.round || data
  const winners = (data.winners || round?.tierWinners || {}) as Record<string,string>
  const payouts = (data.payouts || round?.tierPayouts || {}) as Record<string,number>
  const audit = data.audit || {}

  return (
    <main className="mx-auto max-w-5xl px-6 py-10 text-white">
      <h1 className="text-2xl font-semibold text-primary">Round {round?.id}</h1>
      <div className="mt-2 grid grid-cols-2 gap-3 text-sm text-slate-300">
        <div>Drawing: {round?.drawingDate ? new Date(round.drawingDate).toLocaleString() : '—'}</div>
        <div>Distribution: {round?.distributionDate ? new Date(round.distributionDate).toLocaleString() : '—'}</div>
        <div>Prize Pool: {Number(round?.prizePoolSol ?? 0).toFixed(3)} SOL</div>
        <div>Participants: {round?.totalParticipants} (eligible {round?.eligibleParticipants})</div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        {(['t1','t2','t3','t4'] as const).map((t) => (
          <div key={t} className="rounded-lg border border-primary/20 bg-night-900/60 p-3">
            <div className="text-xs uppercase tracking-wide text-slate-400">{t.toUpperCase()}</div>
            <div className="mt-1 text-slate-300">Winner</div>
            <div className="font-semibold text-primary break-all">{winners[t] || '—'}</div>
            <div className="mt-2 text-xs text-slate-400">Payout</div>
            <div className="text-primary font-semibold">{payouts[t]?.toFixed?.(3) ?? '0.000'} SOL</div>
          </div>
        ))}
      </div>
      {/* Audit section with placeholders; will fill with on-chain data */}
      <div className="mt-6 rounded-2xl border border-primary/20 bg-night-900/60 p-4">
        <h2 className="text-lg font-semibold text-primary">Audit</h2>
        <div className="mt-2 text-sm text-slate-300">Tx Signatures</div>
        {Array.isArray(audit.txSignatures) && audit.txSignatures.length > 0 ? (
          <ul className="mt-1 space-y-1 text-xs">
            {audit.txSignatures.map((sig: string, idx: number) => (
              <li key={idx} className="flex items-center justify-between gap-2 rounded-md border border-primary/20 bg-night-900/60 px-2 py-1">
                <span className="break-all">{sig}</span>
                <button className="rounded-md border border-primary/30 px-2 py-0.5 text-primary" onClick={() => navigator.clipboard?.writeText(sig)}>Copy</button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-xs text-slate-400">No on-chain audit signatures provided yet.</div>
        )}
        <div className="mt-4 text-sm text-slate-300">ATA Addresses</div>
        {audit.ataAddresses && Object.keys(audit.ataAddresses).length > 0 ? (
          <div className="mt-1 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
            {(['t1','t2','t3','t4'] as const).map((t) => (
              <div key={t} className="rounded-md border border-primary/20 bg-night-900/60 p-2">
                <div className="text-slate-400">{t.toUpperCase()}</div>
                <div className="mt-1 break-all text-slate-300">{audit.ataAddresses[t] || '—'}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-slate-400">No ATA addresses yet.</div>
        )}
      </div>
      <div className="mt-6">
        <Link className="text-primary underline" href="/history">Back to History</Link>
      </div>
    </main>
  )
}
