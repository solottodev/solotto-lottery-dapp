// SnapshotForm.tsx
// Handles Snapshot module actions: run snapshot, view progress, confirm results

'use client'

import React, { useCallback, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/hooks/useAuthStore'
import { useModuleStore } from '@/hooks/useModuleStore'
import { confirmSnapshot, generateSnapshot, exportParticipantsCSV } from '@/lib/api'
import { HelperText } from '@/components/ui/helper-text'
import { IndeterminateProgressBar } from '@/components/ui/progress-bar'
import { CheckCircle2 } from 'lucide-react'

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
    setParticipantCounts,
  } = useModuleStore()

  const [error, setError] = useState<string | null>(null)

  const onCancelSnapshot = useCallback(() => {
    if (confirm('Are you sure you want to cancel this snapshot? This will reset the snapshot module to idle.')) {
      setSnapshotStatus('idle')
      setSnapshotId(null)
      setSnapshotStartedAt(null)
      setSnapshotCompletedAt(null)
      setParticipantCounts(null)
      setError(null)
    }
  }, [setSnapshotStatus, setSnapshotId, setSnapshotStartedAt, setSnapshotCompletedAt, setParticipantCounts])

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
      // Update participant counts if available
      if (res?.participantCounts) {
        useModuleStore.getState().setParticipantCounts(res.participantCounts)
      }
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
      const res = await confirmSnapshot(snapshotId, jwt)
      console.log('Confirm snapshot response:', res)
      // Update participant counts from API response
      if (res?.participantCounts) {
        console.log('Setting participant counts:', res.participantCounts)
        useModuleStore.getState().setParticipantCounts(res.participantCounts)
      } else {
        console.warn('No participantCounts in response:', res)
      }
      setSnapshotStatus('confirmed')
      setDrawingEnabled(true)
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Failed to confirm snapshot')
      setSnapshotStatus('completed')
    }
  }, [jwt, snapshotId, setSnapshotStatus, setDrawingEnabled])

  const onExportCSV = useCallback(async () => {
    if (!jwt) {
      setError('Operator authentication required')
      return
    }
    if (!snapshotId) {
      setError('No snapshot to export')
      return
    }
    setError(null)
    try {
      await exportParticipantsCSV(snapshotId, jwt)
      // Success - file will download automatically
    } catch (e: any) {
      console.error(e)
      setError(e?.message || 'Failed to export participants')
    }
  }, [jwt, snapshotId])

  const statusLabel =
    snapshotStatus === 'idle'
      ? 'Idle'
      : snapshotStatus === 'running'
      ? 'Running snapshot…'
      : snapshotStatus === 'completed'
      ? 'Completed — review and confirm'
      : 'Confirmed — ready for drawing'

  const canRun = snapshotStatus === 'idle'
  const canConfirm = snapshotStatus === 'completed' && !!snapshotId
  const isConfirmed = snapshotStatus === 'confirmed'

  return (
    <section className="rounded-3xl border border-primary/20 bg-night-900/60 p-4 sm:p-5 shadow-panel">
      {/* Progress Bar - shown during snapshot generation */}
      {snapshotStatus === 'running' && (
        <div className="mb-4">
          <IndeterminateProgressBar label="Generating snapshot and assigning participants to tiers..." />
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <p className="text-slate-300 text-xs sm:text-sm">Snapshot Status</p>
          <p className="mt-1 font-semibold text-primary text-sm sm:text-base">{statusLabel}</p>
          <div className="mt-2 text-[10px] sm:text-xs text-slate-400">
            {snapshotStartedAt && <div>Started: {new Date(snapshotStartedAt).toLocaleString()}</div>}
            {snapshotCompletedAt && <div>Completed: {new Date(snapshotCompletedAt).toLocaleString()}</div>}
            {snapshotId && <div>ID: {snapshotId}</div>}
          </div>
        </div>
        <div className="w-full sm:w-auto text-left sm:text-right">
          {participantCounts ? (
            <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
              <div className="rounded-lg border border-primary/20 bg-night-900/60 p-2">
                <div className="text-[10px] sm:text-xs text-slate-400">Tier 1 (5%)</div>
                <div className="text-primary font-semibold">{participantCounts.t1}</div>
              </div>
              <div className="rounded-lg border border-primary/20 bg-night-900/60 p-2">
                <div className="text-[10px] sm:text-xs text-slate-400">Tier 2 (15%)</div>
                <div className="text-primary font-semibold">{participantCounts.t2}</div>
              </div>
              <div className="rounded-lg border border-primary/20 bg-night-900/60 p-2">
                <div className="text-[10px] sm:text-xs text-slate-400">Tier 3 (30%)</div>
                <div className="text-primary font-semibold">{participantCounts.t3}</div>
              </div>
              <div className="rounded-lg border border-primary/20 bg-night-900/60 p-2">
                <div className="text-[10px] sm:text-xs text-slate-400">Tier 4 (50%)</div>
                <div className="text-primary font-semibold">{participantCounts.t4}</div>
              </div>
            </div>
          ) : (
            <p className="text-xs sm:text-sm text-slate-400">Tier counts will appear after Snapshot confirmation.</p>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-red-300 text-xs sm:text-sm">
          {error}
        </div>
      )}

      <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
        <Button
          type="button"
          onClick={onRunSnapshot}
          disabled={!controlSubmitted || !canRun || isConfirmed}
          className={`w-full sm:w-auto rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold shadow-md transition-all ${
            isConfirmed
              ? 'bg-night-800 text-slate-400 cursor-not-allowed border border-primary/20'
              : 'bg-badge-gradient text-white disabled:opacity-60'
          }`}
        >
          {isConfirmed ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Snapshot Generated
            </span>
          ) : snapshotStatus === 'running' ? (
            'Generating…'
          ) : (
            'Generate Snapshot'
          )}
        </Button>

        <Button
          type="button"
          onClick={onConfirmSnapshot}
          disabled={!canConfirm || isConfirmed}
          className={`w-full sm:w-auto rounded-lg px-4 py-2 text-xs sm:text-sm font-semibold shadow-md transition-all ${
            isConfirmed
              ? 'bg-night-800 text-slate-400 cursor-not-allowed border border-primary/20'
              : 'border border-primary/30 bg-night-800 text-primary disabled:opacity-60'
          }`}
        >
          {isConfirmed ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Snapshot Confirmed
            </span>
          ) : (
            'Confirm Snapshot'
          )}
        </Button>

        <Button
          type="button"
          onClick={onExportCSV}
          disabled={!snapshotId || snapshotStatus === 'idle'}
          className="w-full sm:w-auto rounded-lg border border-accent/30 bg-night-800 px-4 py-2 text-xs sm:text-sm font-semibold text-accent shadow-md disabled:opacity-60"
        >
          Export Participants CSV
        </Button>

        {/* Cancel/Reset Button - shown when snapshot is in progress, completed, or has error */}
        {(snapshotStatus === 'running' || snapshotStatus === 'completed' || error) && !isConfirmed && (
          <Button
            type="button"
            onClick={onCancelSnapshot}
            className="w-full sm:w-auto rounded-lg border border-red-400/30 bg-red-500/20 px-4 py-2 text-xs sm:text-sm font-semibold text-red-300 hover:bg-red-500/30 shadow-md transition-all"
          >
            Cancel Snapshot
          </Button>
        )}
      </div>

      {/* Helper Text */}
      {!controlSubmitted && (
        <HelperText variant="info">
          Complete Control configuration to enable snapshot generation.
        </HelperText>
      )}
      {controlSubmitted && snapshotStatus === 'idle' && (
        <HelperText variant="info">
          Click &quot;Generate Snapshot&quot; to capture eligible participants and assign them to tiers.
        </HelperText>
      )}
      {snapshotStatus === 'completed' && (
        <HelperText variant="warning">
          Review the tier distribution above and click &quot;Confirm Snapshot&quot; to proceed.
        </HelperText>
      )}
      {isConfirmed && (
        <HelperText variant="success">
          Snapshot confirmed successfully! Proceed to the Drawing module.
        </HelperText>
      )}
    </section>
  )
}

export default SnapshotForm
