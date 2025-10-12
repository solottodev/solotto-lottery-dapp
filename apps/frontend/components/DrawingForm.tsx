// DrawingForm.tsx
// Minimal drawing UI with 4 tier blocks and placeholder until winners selected

'use client'

import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useModuleStore } from '@/hooks/useModuleStore'
import { useAuthStore } from '@/hooks/useAuthStore'
import { confirmDrawing, runDrawing } from '@/lib/api'
import { HelperText } from '@/components/ui/helper-text'
import { ConfirmationModal } from '@/components/ui/confirmation-modal'
import { CheckCircle2 } from 'lucide-react'

const shorten = (addr?: string | null) => {
  if (!addr) return '—'
  if (addr.length <= 10) return addr
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`
}

const TierCard: React.FC<{ title: string; value: string | null }> = ({ title, value }) => (
  <div className="relative rounded-xl border border-primary/25 bg-night-900/70 p-3 sm:p-4">
    <div className="text-xs sm:text-sm tracking-wide text-slate-300">{title}</div>
    <div className="mt-2 text-base sm:text-lg md:text-xl font-semibold text-primary break-all pr-7">
      {shorten(value)}
    </div>
    {value && (
      <button
        aria-label="Copy address"
        title="Copy full address"
        className="absolute right-2 top-2 sm:right-3 sm:top-3 text-primary/70 hover:text-primary"
        onClick={() => navigator.clipboard?.writeText(value!)}
      >
        {/* simple copy icon */}
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 sm:h-4 sm:w-4"><path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
      </button>
    )}
  </div>
)

export const DrawingForm: React.FC = () => {
  const { jwt } = useAuthStore()
  const {
    drawingEnabled,
    winners,
    setWinners,
    participantCounts,
    drawingStatus,
    setDrawingStatus,
    drawingId,
    setDrawingId,
    drawingStartedAt,
    setDrawingStartedAt,
    drawingCompletedAt,
    setDrawingCompletedAt,
    audit,
    setAudit,
    setDistributionEnabled,
  } = useModuleStore()
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showResetModal, setShowResetModal] = useState(false)

  const canSelect = drawingEnabled && drawingStatus !== 'running' && drawingStatus !== 'confirmed' && (!winners.t1 || !winners.t2 || !winners.t3 || !winners.t4)
  const isConfirmed = drawingStatus === 'confirmed'

  const handleSelectWinners = async () => {
    setError(null)
    if (!jwt) {
      setError('Operator authentication required')
      return
    }
    try {
      const state = useModuleStore.getState()
      if (!state.roundId) {
        setError('Round not initialized; submit Control configuration first.')
        return
      }
      setRunning(true)
      setDrawingStatus('running')
      const res = await runDrawing(jwt, state.roundId)
      const w = res?.winners || {}
      setWinners({
        t1: w.t1 ?? winners.t1,
        t2: w.t2 ?? winners.t2,
        t3: w.t3 ?? winners.t3,
        t4: w.t4 ?? winners.t4,
      })
      setDrawingId(res?.drawingId || null)
      setDrawingStartedAt(res?.startedAt || null)
      setDrawingCompletedAt(res?.completedAt || null)
      setAudit(res?.audit || null)
      setDrawingStatus('completed')
    } catch (e: any) {
      setError(e?.message || 'Failed to run drawing')
      setDrawingStatus('idle')
    } finally {
      setRunning(false)
    }
  }

  const handleReset = () => {
    setWinners({ t1: null, t2: null, t3: null, t4: null })
    setDrawingId(null)
    setDrawingStartedAt(null)
    setDrawingCompletedAt(null)
    setAudit(null)
    setDrawingStatus('idle')
  }

  const handleConfirm = async () => {
    setError(null)
    if (!jwt) {
      setError('Operator authentication required')
      return
    }
    if (!drawingId) {
      setError('No drawing to confirm')
      return
    }
    try {
      setDrawingStatus('running')
      await confirmDrawing(drawingId, jwt)
      setDrawingStatus('confirmed')
      setDistributionEnabled(true)
    } catch (e: any) {
      setError(e?.message || 'Failed to confirm drawing')
      setDrawingStatus('completed')
    }
  }

  const info = useMemo(() => {
    if (!participantCounts) return 'Tier counts will display from Snapshot.'
    return `Participants — T1: ${participantCounts.t1}, T2: ${participantCounts.t2}, T3: ${participantCounts.t3}, T4: ${participantCounts.t4}`
  }, [participantCounts])

  return (
    <section className="rounded-3xl border border-primary/20 bg-night-900/60 p-4 sm:p-6 shadow-panel">
      {error && (
        <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-red-300 text-xs sm:text-sm">{error}</div>
      )}
      <div className="mb-3 flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-slate-300 text-xs sm:text-sm">Drawing Status</div>
          <div className="text-primary font-semibold text-sm sm:text-base">
            {drawingStatus === 'idle' && 'Idle'}
            {drawingStatus === 'running' && 'Running…'}
            {drawingStatus === 'completed' && 'Completed — review and confirm'}
            {drawingStatus === 'confirmed' && 'Confirmed'}
          </div>
          <div className="mt-1 text-[10px] sm:text-xs text-slate-400 space-y-0.5">
            {drawingId && <div className="truncate" title={drawingId}>ID: {drawingId}</div>}
            {drawingStartedAt && <div className="truncate">Started: {new Date(drawingStartedAt).toLocaleString()}</div>}
            {drawingCompletedAt && <div className="truncate">Completed: {new Date(drawingCompletedAt).toLocaleString()}</div>}
          </div>
        </div>
        <div className="w-full sm:w-auto sm:max-w-[40%] min-w-0 text-left sm:text-right text-[10px] sm:text-xs text-slate-400 space-y-0.5">
          {audit?.seed && <div className="truncate" title={audit.seed}>Seed: {audit.seed.slice(0, 16)}...</div>}
          {audit?.snapshotId && <div className="truncate" title={audit.snapshotId}>Snapshot: {audit.snapshotId.slice(0, 16)}...</div>}
          {/* Additional audit fields for transparency */}
          {audit && (audit as any).blockhash && <div className="truncate" title={(audit as any).blockhash}>Blockhash: {((audit as any).blockhash as string).slice(0, 12)}...</div>}
          {audit && (audit as any).slot && <div className="truncate">Slot: {(audit as any).slot}</div>}
        </div>
      </div>
      <div className="mb-4 text-xs sm:text-sm text-slate-400 truncate" title={info}>{info}</div>
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        <TierCard title="TIER 1 WINNER" value={winners.t1} />
        <TierCard title="TIER 2 WINNER" value={winners.t2} />
        <TierCard title="TIER 3 WINNER" value={winners.t3} />
        <TierCard title="TIER 4 WINNER" value={winners.t4} />
      </div>

      <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
        <Button
          type="button"
          disabled={!canSelect || running || isConfirmed}
          onClick={handleSelectWinners}
          className={`w-full sm:w-auto rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold shadow-md transition-all ${
            isConfirmed
              ? 'bg-night-800 text-slate-400 cursor-not-allowed border border-primary/20'
              : 'bg-badge-gradient text-white disabled:opacity-60'
          }`}
        >
          {isConfirmed ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Winners Selected
            </span>
          ) : running ? (
            'Selecting…'
          ) : (
            'Select Winners'
          )}
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={drawingStatus !== 'completed' || isConfirmed}
          className={`w-full sm:w-auto rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold shadow-md transition-all ${
            isConfirmed
              ? 'bg-night-800 text-slate-400 cursor-not-allowed border border-primary/20'
              : 'border border-primary/30 bg-night-800 text-primary disabled:opacity-60'
          }`}
        >
          {isConfirmed ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Drawing Confirmed
            </span>
          ) : (
            'Confirm Drawing'
          )}
        </Button>
        <Button
          type="button"
          onClick={() => setShowResetModal(true)}
          disabled={isConfirmed || drawingStatus === 'idle'}
          className="w-full sm:w-auto rounded-lg border border-amber-500/30 bg-night-800 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-amber-400 shadow-md disabled:opacity-60"
        >
          Reset Winners
        </Button>
        <Button
          type="button"
          onClick={() => {
            // Build CSV of winners + audit
            const headers = ['tier','winner','drawingId','snapshotId','startedAt','completedAt','seed','blockhash','slot']
            const rows = [
              ['TIER 1', winners.t1 || '', drawingId || '', audit?.snapshotId || '', drawingStartedAt || '', drawingCompletedAt || '', audit?.seed || '', audit?.blockhash || '', audit?.slot || ''],
              ['TIER 2', winners.t2 || '', drawingId || '', audit?.snapshotId || '', drawingStartedAt || '', drawingCompletedAt || '', audit?.seed || '', audit?.blockhash || '', audit?.slot || ''],
              ['TIER 3', winners.t3 || '', drawingId || '', audit?.snapshotId || '', drawingStartedAt || '', drawingCompletedAt || '', audit?.seed || '', audit?.blockhash || '', audit?.slot || ''],
              ['TIER 4', winners.t4 || '', drawingId || '', audit?.snapshotId || '', drawingStartedAt || '', drawingCompletedAt || '', audit?.seed || '', audit?.blockhash || '', audit?.slot || ''],
            ]
            const csv = [headers, ...rows]
              .map((r) => r.map((v) => `"${String(v).replaceAll('"','""')}"`).join(','))
              .join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `solotto_drawing_${drawingId || 'preview'}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="w-full sm:w-auto rounded-lg border border-primary/30 bg-night-800 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary shadow-md"
        >
          Export CSV
        </Button>
      </div>

      {/* Helper Text */}
      {!drawingEnabled && (
        <HelperText variant="info">
          Complete and confirm Snapshot to enable drawing.
        </HelperText>
      )}
      {drawingEnabled && drawingStatus === 'idle' && (
        <HelperText variant="info">
          Click &quot;Select Winners&quot; to randomly draw tier winners using crypto-secure random function.
        </HelperText>
      )}
      {drawingStatus === 'completed' && (
        <HelperText variant="warning">
          Review the selected winners above and click &quot;Confirm Drawing&quot; to proceed, or &quot;Reset Winners&quot; to redraw.
        </HelperText>
      )}
      {isConfirmed && (
        <HelperText variant="success">
          Drawing confirmed successfully! Proceed to the Harvest module.
        </HelperText>
      )}

      {/* Confirmation Modal for Reset */}
      <ConfirmationModal
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleReset}
        title="Reset Drawing Winners"
        message="Are you sure you want to reset the selected winners? This will clear all current winners and allow you to run the drawing again. This action cannot be undone."
        confirmText="Reset Winners"
        cancelText="Cancel"
        variant="warning"
      />
    </section>
  )
}

export default DrawingForm
