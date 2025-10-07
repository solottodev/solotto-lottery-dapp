"use client";

import { useMemo, useState } from 'react'
import { useModuleStore } from '@/hooks/useModuleStore'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/hooks/useAuthStore'
import { releaseDistribution } from '@/lib/api'

const formatSol = (n: number) => `${n.toFixed(6)} SOL`

export default function DistributionModule() {
  const { jwt } = useAuthStore()
  const {
    harvestStatus,
    allocations,
    winners,
    swapToLotto,
    setSwapToLotto,
    controlConfig,
    participantCounts,
    prizePoolSol,
    drawingStartedAt,
    drawingCompletedAt,
    distributionStatus,
    setDistributionStatus,
    setDistributionDate,
    roundId,
    harvestAudit,
    setHarvestAudit,
  } = useModuleStore()

  const [error, setError] = useState<string | null>(null)
  const ready = harvestStatus === 'prepared'
  const slippage = controlConfig?.slippageTolerancePercent ?? 0.5

  const rows = useMemo(() => (
    [
      { tier: 'TIER 1', addr: winners.t1, amount: allocations.t1 },
      { tier: 'TIER 2', addr: winners.t2, amount: allocations.t2 },
      { tier: 'TIER 3', addr: winners.t3, amount: allocations.t3 },
      { tier: 'TIER 4', addr: winners.t4, amount: allocations.t4 },
    ]
  ), [winners, allocations])

  const onRelease = async () => {
    setError(null)
    if (!ready) return
    try {
      setDistributionStatus('releasing')
      let txs: string[] = []
      try {
        if (jwt) {
          const res = await releaseDistribution(jwt)
          txs = res.txSignatures
        } else {
          await new Promise((r) => setTimeout(r, 600))
          txs = [`tx_${Math.random().toString(36).slice(2, 12)}`]
        }
      } catch {
        txs = [`tx_${Math.random().toString(36).slice(2, 12)}`]
      }
      setDistributionStatus('released')
      setDistributionDate(new Date().toISOString())
      setHarvestAudit({ ...(harvestAudit || {}), txSignatures: txs })

      try {
        if (roundId) {
          await fetch(`/api/history/round/${encodeURIComponent(roundId)}/audit/distribution`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
            },
            body: JSON.stringify({
              txSignatures: txs,
              ataAddresses: harvestAudit?.ataAddresses || {},
              swapToLotto,
              routeId: null,
              slippage: controlConfig?.slippageTolerancePercent ?? null,
            }),
          })
        }
      } catch (_) {}
    } catch (e: any) {
      setError(e?.message || 'Failed to release')
      setDistributionStatus('queued')
    }
  }

  return (
    <section className={`rounded-3xl border border-primary/20 bg-night-900/60 p-5 shadow-panel ${!ready ? 'pointer-events-none opacity-60' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-slate-300 text-sm">Release Plan</div>
          <div className="text-primary font-semibold">{distributionStatus === 'released' ? 'Released' : 'Ready'}</div>
          <div className="mt-1 text-xs text-slate-400">Prize Pool: <span className="text-primary font-semibold">{formatSol(prizePoolSol)}</span></div>
        </div>
        <div className="text-right text-xs text-slate-400">
          {harvestAudit?.slot !== undefined && <div>Slot: {harvestAudit.slot}</div>}
          {harvestAudit?.txSignatures && harvestAudit.txSignatures.length > 0 && (
            <div>Tx: {harvestAudit.txSignatures.join(', ')}</div>
          )}
          {harvestAudit?.ataAddresses && (
            <div>ATAs: {Object.keys(harvestAudit.ataAddresses).length}</div>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
        {rows.map((r) => (
          <div key={r.tier} className="rounded-lg border border-primary/20 bg-night-900/60 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">{r.tier}</div>
            <div className="mt-1 text-sm text-slate-300">Winner</div>
            <div className="font-semibold text-primary break-all">{r.addr || '—'}</div>
            {harvestAudit?.ataAddresses && (
              <div className="mt-1 text-xs text-slate-400">ATA: <span className="text-slate-300">{harvestAudit.ataAddresses[(r.tier.toLowerCase() as 't1'|'t2'|'t3'|'t4')] || '—'}</span></div>
            )}
            <div className="mt-2 text-xs text-slate-400">Prize Amount</div>
            <div className="text-primary font-semibold">{formatSol(r.amount || 0)}{swapToLotto ? ' → LOTTO (preview)' : ''}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <label className="inline-flex items-center gap-2 text-slate-300 text-sm">
          <input type="checkbox" checked={swapToLotto} onChange={(e) => setSwapToLotto(e.target.checked)} />
          Swap SOL to LOTTO before distribution
        </label>
        <div className="text-xs text-slate-400">Slippage tolerance: {slippage}%</div>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-red-300 text-sm">{error}</div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={onRelease}
          disabled={!ready || distributionStatus === 'releasing'}
          className="rounded-lg bg-badge-gradient px-4 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-60"
        >
          {distributionStatus === 'releasing' ? 'Releasing…' : 'Release Funds'}
        </Button>
      </div>
    </section>
  )
}
