"use client";

import { useParams } from 'next/navigation'

export default function HistoryDetailPage() {
  const params = useParams() as { roundId?: string }
  const id = params?.roundId || '—'
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-primary">History Detail</h2>
      <div className="text-slate-300">Round ID: {id}</div>
      <div className="rounded-3xl border border-primary/20 bg-night-900/60 p-6 shadow-panel">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-lg border border-primary/30 bg-night-800 px-6 py-3 text-[16px] md:text-[17px] font-semibold text-primary shadow-md"
            onClick={() => window.open('http://localhost:8093/api/history/export', '_blank')}
          >
            Export Lottery History (CSV)
          </button>
          <button
            className="rounded-lg border border-primary/30 bg-night-800 px-6 py-3 text-[16px] md:text-[17px] font-semibold text-primary shadow-md"
            onClick={() => window.open('http://localhost:8093/api/history/export/participants', '_blank')}
          >
            Export All Participants (CSV)
          </button>
        </div>
      </div>
    </section>
  )
}

