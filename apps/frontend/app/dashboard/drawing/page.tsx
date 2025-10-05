"use client";

import DrawingForm from '@/components/DrawingForm'
import { useModuleStore } from '@/hooks/useModuleStore'

export default function DrawingPage() {
  const drawingEnabled = useModuleStore((s) => s.drawingEnabled)
  return (
    <section className="space-y-4">
      <h2 className="text-2xl font-semibold text-primary">Drawing Module</h2>
      {!drawingEnabled && (
        <div className="rounded-xl border border-primary/25 bg-night-900/60 p-4 text-slate-300">
          Snapshot must be confirmed to enable drawing.
        </div>
      )}
      <div className={!drawingEnabled ? 'pointer-events-none opacity-60' : ''}>
        <DrawingForm />
      </div>
    </section>
  );
}
