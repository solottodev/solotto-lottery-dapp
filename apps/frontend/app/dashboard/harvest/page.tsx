"use client";

import HarvestModule from '@/components/HarvestModule'

export default function HarvestPage() {
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-primary">Harvest Module</h2>
      <p className="text-slate-300">Prepare per-tier allocations and build a release plan.</p>
      <HarvestModule />
    </section>
  )
}

