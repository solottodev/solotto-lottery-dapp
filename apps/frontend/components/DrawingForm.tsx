// DrawingForm.tsx
// Minimal drawing UI with 4 tier blocks and placeholder until winners selected

'use client'

import React, { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useModuleStore } from '@/hooks/useModuleStore'
import { useAuthStore } from '@/hooks/useAuthStore'
import { confirmDrawing, runDrawing } from '@/lib/api'

const TierCard: React.FC<{ title: string; value: string | null }> = ({ title, value }) => (
  <div className="rounded-xl border border-primary/25 bg-night-900/70 p-5">
    <div className="text-sm tracking-wide text-slate-300">{title}</div>
    <div className="mt-2 text-xl font-semibold text-primary break-all">
      {value || '—'}
    </div>
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

  const canSelect = drawingEnabled && drawingStatus !== 'running' && (!winners.t1 || !winners.t2 || !winners.t3 || !winners.t4)

  const handleSelectWinners = async () => {
    setError(null)
    if (!jwt) {
      setError('Operator authentication required')
      return
    }
    try {
      setRunning(true)
      setDrawingStatus('running')
      const res = await runDrawing(jwt)
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
    <section className="rounded-3xl border border-primary/20 bg-night-900/60 p-6 shadow-panel">
      {error && (
        <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-red-300 text-sm">{error}</div>
      )}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-slate-300 text-sm">Drawing Status</div>
          <div className="text-primary font-semibold">
            {drawingStatus === 'idle' && 'Idle'}
            {drawingStatus === 'running' && 'Running…'}
            {drawingStatus === 'completed' && 'Completed — review and confirm'}
            {drawingStatus === 'confirmed' && 'Confirmed'}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {drawingId && <div>ID: {drawingId}</div>}
            {drawingStartedAt && <div>Started: {new Date(drawingStartedAt).toLocaleString()}</div>}
            {drawingCompletedAt && <div>Completed: {new Date(drawingCompletedAt).toLocaleString()}</div>}
          </div>
        </div>
        <div className="text-right text-xs text-slate-400">
          {audit?.seed && <div>Seed: {audit.seed}</div>}
          {audit?.vrfRequestId && <div>VRF: {audit.vrfRequestId}</div>}
          {audit?.snapshotId && <div>Snapshot: {audit.snapshotId}</div>}
        </div>
      </div>
      <div className="mb-4 text-sm text-slate-400">{info}</div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <TierCard title="TIER 1 WINNER" value={winners.t1} />
        <TierCard title="TIER 2 WINNER" value={winners.t2} />
        <TierCard title="TIER 3 WINNER" value={winners.t3} />
        <TierCard title="TIER 4 WINNER" value={winners.t4} />
      </div>

      <div className="mt-6 flex gap-3">
        <Button
          type="button"
          disabled={!canSelect || running}
          onClick={handleSelectWinners}
          className="rounded-lg bg-badge-gradient px-6 py-3 text-[16px] md:text-[17px] font-semibold text-white shadow-md disabled:opacity-60"
        >
          {running ? 'Selecting…' : 'Select Winners'}
        </Button>
        <Button
          type="button"
          onClick={handleReset}
          className="rounded-lg border border-primary/30 bg-night-800 px-6 py-3 text-[16px] md:text-[17px] font-semibold text-primary shadow-md"
        >
          Reset Winners
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={drawingStatus !== 'completed'}
          className="rounded-lg border border-primary/30 bg-night-800 px-6 py-3 text-[16px] md:text-[17px] font-semibold text-primary shadow-md disabled:opacity-60"
        >
          Confirm Drawing
        </Button>
        <Button
          type="button"
          onClick={() => {
            // Build CSV of winners + audit
            const headers = ['tier','winner','drawingId','startedAt','completedAt','seed','vrfRequestId','snapshotId']
            const rows = [
              ['TIER 1', winners.t1 || '', drawingId || '', drawingStartedAt || '', drawingCompletedAt || '', audit?.seed || '', audit?.vrfRequestId || '', audit?.snapshotId || ''],
              ['TIER 2', winners.t2 || '', drawingId || '', drawingStartedAt || '', drawingCompletedAt || '', audit?.seed || '', audit?.vrfRequestId || '', audit?.snapshotId || ''],
              ['TIER 3', winners.t3 || '', drawingId || '', drawingStartedAt || '', drawingCompletedAt || '', audit?.seed || '', audit?.vrfRequestId || '', audit?.snapshotId || ''],
              ['TIER 4', winners.t4 || '', drawingId || '', drawingStartedAt || '', drawingCompletedAt || '', audit?.seed || '', audit?.vrfRequestId || '', audit?.snapshotId || ''],
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
          className="rounded-lg border border-primary/30 bg-night-800 px-6 py-3 text-[16px] md:text-[17px] font-semibold text-primary shadow-md"
        >
          Export CSV
        </Button>
      </div>
    </section>
  )
}

export default DrawingForm
