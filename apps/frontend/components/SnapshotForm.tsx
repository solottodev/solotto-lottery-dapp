// SnapshotForm.tsx
// Handles Snapshot module actions: run snapshot, view progress, confirm results

'use client'

import React, { useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useModuleStore } from '@/hooks/useModuleStore'
import { confirmSnapshot, generateSnapshot } from '@/lib/api'

export const SnapshotForm: React.FC = () => {
  const { jwt } = useAuthStore()
  const {
    controlSubmitted,
    participantCounts,
    snapshotStatus,
    setSnapshotStatus,
    snapshotId,
    setSnapshotId,
    snapshotStartedAt,
    setSnapshotStartedAt,
    snapshotCompletedAt,
    setSnapshotCompletedAt,
    setDrawingEnabled,
  } = useModuleStore()

  const [error, setError] = useState<string | null>(null)

  const onRunSnapshot = useCallback(async () => {
    if (!jwt) {
      setError('Operator authentication required')
      return
    }
    if (!controlSubmitted) {
      setError('Control configuration must be submitted first')
      return
    }
    setError(null)
    try {
      const state = useModuleStore.getState()
      if (!state.roundId) {
        setError('Round not initialized; submit Control configuration first.')
        return
      }
      setSnapshotStatus('running')
      const res = await generateSnapshot(jwt, state.roundId)
      setSnapshotId(res.snapshotId)
      setSnapshotStartedAt(res.startedAt)
      setSnapshotCompletedAt(res.completedAt)
      setSnapshotStatus('completed')
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Failed to generate snapshot')
      setSnapshotStatus('idle')
    }
  }, [jwt, controlSubmitted, setSnapshotStatus, setSnapshotId, setSnapshotStartedAt, setSnapshotCompletedAt])

  const onConfirmSnapshot = useCallback(async () => {
    if (!jwt) {
      setError('Operator authentication required')
      return
    }
    if (!snapshotId) return
    setError(null)
    try {
      setSnapshotStatus('running')
      await confirmSnapshot(snapshotId, jwt)
      setSnapshotStatus('confirmed')
      setDrawingEnabled(true)
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Failed to confirm snapshot')
      setSnapshotStatus('completed')
    }
  }, [jwt, snapshotId, setSnapshotStatus, setDrawingEnabled])

  const statusLabel =
    snapshotStatus === 'idle'
      ? 'Idle'
      : snapshotStatus === 'running'
      ? 'Running snapshot…'
      : snapshotStatus === 'completed'
      ? 'Completed — review and confirm'
      : 'Confirmed — ready for drawing'

  const canRun = snapshotStatus === 'idle' || snapshotStatus === 'completed'
  const canConfirm = snapshotStatus === 'completed' && !!participantCounts

  return (
    <section className="rounded-3xl border border-primary/20 bg-night-900/60 p-5 shadow-panel">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-300">Snapshot Status</p>
          <p className="mt-1 font-semibold text-primary">{statusLabel}</p>
          <div className="mt-2 text-xs text-slate-400">
            {snapshotStartedAt && <div>Started: {new Date(snapshotStartedAt).toLocaleString()}</div>}
            {snapshotCompletedAt && <div>Completed: {new Date(snapshotCompletedAt).toLocaleString()}</div>}
            {snapshotId && <div>ID: {snapshotId}</div>}
          </div>
        </div>
        <div className="text-right">
          {participantCounts ? (
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-primary/20 bg-night-900/60 p-2">
                <div className="text-xs text-slate-400">Tier 1 (5%)</div>
                <div className="text-primary font-semibold">{participantCounts.t1}</div>
              </div>
              <div className="rounded-lg border border-primary/20 bg-night-900/60 p-2">
                <div className="text-xs text-slate-400">Tier 2 (15%)</div>
                <div className="text-primary font-semibold">{participantCounts.t2}</div>
              </div>
              <div className="rounded-lg border border-primary/20 bg-night-900/60 p-2">
                <div className="text-xs text-slate-400">Tier 3 (30%)</div>
                <div className="text-primary font-semibold">{participantCounts.t3}</div>
              </div>
              <div className="rounded-lg border border-primary/20 bg-night-900/60 p-2">
                <div className="text-xs text-slate-400">Tier 4 (50%)</div>
                <div className="text-primary font-semibold">{participantCounts.t4}</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">Tier counts will appear after Control submission.</p>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-red-300 text-sm">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={onRunSnapshot}
          disabled={!controlSubmitted || !canRun}
          className="rounded-lg bg-badge-gradient px-4 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-60"
        >
          {snapshotStatus === 'running' ? 'Running…' : 'Generate Snapshot'}
        </Button>

        <Button
          type="button"
          onClick={onConfirmSnapshot}
          disabled={!canConfirm}
          className="rounded-lg border border-primary/30 bg-night-800 px-4 py-2 text-sm font-semibold text-primary shadow-md disabled:opacity-60"
        >
          Confirm Snapshot
        </Button>
      </div>
    </section>
  )
}

export default SnapshotForm
