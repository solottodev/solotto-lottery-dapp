"use client";

import dynamic from 'next/dynamic'
const HistoryLookup = dynamic(() => import('@/components/HistoryLookup'), { ssr: false })

export default function HistoryPage() {
  return (
    <main className="relative mx-auto flex min-h-screen w-full max-w-[95vw] sm:max-w-[90vw] 2xl:max-w-[1920px] flex-col gap-6 sm:gap-8 md:gap-10 px-4 sm:px-6 md:px-8 lg:px-14 pb-20 sm:pb-24 md:pb-32 pt-10 sm:pt-12 md:pt-14 text-white">
      <section className="space-y-3 sm:space-y-4">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-semibold text-primary">History & Audit Module</h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-300">
          Browse previous drawings, audit payouts, and download compliance-ready reports.
        </p>

        <div className="rounded-2xl sm:rounded-3xl border border-primary/20 bg-night-900/60 p-4 sm:p-5 md:p-6 shadow-panel">
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-3">
            <button
              className="w-full sm:w-auto rounded-lg border border-primary/30 bg-night-800 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base font-semibold text-primary shadow-md"
              onClick={() => window.open('/api/history/export', '_blank')}
            >
              Export Lottery History (CSV)
            </button>
            <button
              className="w-full sm:w-auto rounded-lg border border-primary/30 bg-night-800 px-4 sm:px-5 md:px-6 py-2 sm:py-2.5 md:py-3 text-xs sm:text-sm md:text-base font-semibold text-primary shadow-md"
              onClick={() => window.open('/api/history/export/participants', '_blank')}
            >
              Export All Participants (CSV)
            </button>
          </div>
          {/* Embedded wallet lookup widget (shared component) */}
          <div className="mt-4 sm:mt-5 md:mt-6">
            <HistoryLookup />
          </div>
        </div>
      </section>
    </main>
  );
}
