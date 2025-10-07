"use client";

import dynamic from 'next/dynamic'
const HistoryLookup = dynamic(() => import('@/components/HistoryLookup'), { ssr: false })

export default function HistoryPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-primary">History</h2>
      <p className="text-slate-300">
        Browse previous drawings, audit payouts, and download compliance-ready reports.
      </p>

      <div className="rounded-3xl border border-primary/20 bg-night-900/60 p-6 shadow-panel">
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-lg border border-primary/30 bg-night-800 px-6 py-3 text-[16px] md:text-[17px] font-semibold text-primary shadow-md"
            onClick={() => window.open('/api/history/export', '_blank')}
          >
            Export Lottery History (CSV)
          </button>
          <button
            className="rounded-lg border border-primary/30 bg-night-800 px-6 py-3 text-[16px] md:text-[17px] font-semibold text-primary shadow-md"
            onClick={() => window.open('/api/history/export/participants', '_blank')}
          >
            Export All Participants (CSV)
          </button>
        </div>
        {/* Embedded wallet lookup widget (shared component) */}
        <div className="mt-6">
          <HistoryLookup />
        </div>
      </div>
    </section>
  );
}
