"use client";

import SnapshotForm from '@/components/SnapshotForm'
import { useModuleStore } from '@/hooks/useModuleStore'

export default function SnapshotPage() {
  const controlSubmitted = useModuleStore((s) => s.controlSubmitted)

  return (
    <section className="space-y-4">
      <SnapshotForm />
      {!controlSubmitted && (
        <p className="text-sm text-gray-400">Waiting for Control configuration…</p>
      )}
    </section>
  )
}
