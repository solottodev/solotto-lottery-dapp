"use client"

import { useMemo, useState } from 'react'
import { useModuleStore } from '@/hooks/useModuleStore'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/hooks/useAuthStore'
import { prepareHarvest } from '@/lib/api'
import { HelperText } from '@/components/ui/helper-text'
import { CheckCircle2 } from 'lucide-react'

const formatSol = (n: number) => `${n.toFixed(6)} SOL`
const shorten = (addr?: string | null) => {
  if (!addr) return '—'
  if (addr.length <= 10) return addr
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`
}

export default function HarvestModule() {
  const { jwt } = useAuthStore()
  const {
    distributionEnabled,
    prizePoolSol,
    allocations,
    setAllocations,
    harvestStatus,
    setHarvestStatus,
    harvestPreparedAt,
    setHarvestPreparedAt,
    harvestAudit,
    setHarvestAudit,
    winners,
  } = useModuleStore()

  const [error, setError] = useState<string | null>(null)
  const isPrepared = harvestStatus === 'prepared'

  const handlePrepare = async () => {
    setError(null)
    if (!distributionEnabled) return
    try {
      if (!jwt) {
        setError('Operator authentication required')
        return
      }
      const state = useModuleStore.getState()
      if (!state.roundId) {
        setError('Round not initialized; submit Control configuration first.')
        return
      }
      setHarvestStatus('preparing')
      const res = await prepareHarvest(jwt, { roundId: state.roundId })
      setAllocations(res.allocations)
      setHarvestPreparedAt(res.preparedAt)
      if (res.prizePoolSol !== undefined) {
        useModuleStore.getState().setPrizePoolSol(res.prizePoolSol)
      }
      if (res.audit) {
        setHarvestAudit({
          blockhash: res.audit.blockhash,
          slot: res.audit.slot,
          txSignatures: res.audit.txSignatures || [],
          ataAddresses: res.audit.ataAddresses || undefined,
        })
      } else {
        setHarvestAudit(null)
      }
      setHarvestStatus('prepared')
    } catch (e: any) {
      setError(e?.message || 'Failed to prepare release')
      setHarvestStatus('idle')
    }
  }

  const rows = useMemo(() => (
    [
      { tier: 'TIER 1', addr: winners.t1, amount: allocations.t1 },
      { tier: 'TIER 2', addr: winners.t2, amount: allocations.t2 },
      { tier: 'TIER 3', addr: winners.t3, amount: allocations.t3 },
      { tier: 'TIER 4', addr: winners.t4, amount: allocations.t4 },
    ]
  ), [winners, allocations])

  return (
    <section className="rounded-3xl border border-primary/20 bg-night-900/60 p-4 sm:p-5 shadow-panel">
      <div className="mb-4 flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-slate-300 text-xs sm:text-sm">Harvest Status</div>
          <div className="text-primary font-semibold text-sm sm:text-base">
            {harvestStatus === 'idle' && 'Idle'}
            {harvestStatus === 'preparing' && 'Preparing…'}
            {harvestStatus === 'prepared' && 'Prepared — ready to release'}
            {harvestStatus === 'released' && 'Released'}
          </div>
          <div className="mt-1 text-[10px] sm:text-xs text-slate-400 space-y-0.5">
            <div className="truncate">Total Pool: <span className="text-primary font-semibold">{formatSol(prizePoolSol)}</span></div>
            {harvestPreparedAt && <div className="truncate">Prepared: {new Date(harvestPreparedAt).toLocaleString()}</div>}
          </div>
        </div>
        <div className="w-full sm:w-auto sm:max-w-[40%] min-w-0 text-left sm:text-right text-[10px] sm:text-xs text-slate-400 space-y-0.5">
          {harvestAudit?.blockhash && <div className="truncate" title={harvestAudit.blockhash}>Blockhash: {harvestAudit.blockhash.slice(0, 12)}...</div>}
          {harvestAudit?.slot !== undefined && <div className="truncate">Slot: {harvestAudit.slot}</div>}
          {harvestAudit?.txSignatures && harvestAudit.txSignatures.length > 0 && (
            <div className="truncate" title={harvestAudit.txSignatures.join(', ')}>Tx: {harvestAudit.txSignatures[0]?.slice(0, 8)}...{harvestAudit.txSignatures.length > 1 ? ` +${harvestAudit.txSignatures.length - 1}` : ''}</div>
          )}
        </div>
      </div>

      {!distributionEnabled && (
        <div className="mb-4 rounded-lg border border-primary/25 bg-night-900/60 p-3 text-xs sm:text-sm text-slate-300">
          Drawing must be confirmed to enable Harvest.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-red-300 text-xs sm:text-sm">{error}</div>
      )}

      <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${!distributionEnabled ? 'pointer-events-none opacity-60' : ''}`}>
        {rows.map((r) => (
          <div key={r.tier} className="relative rounded-lg border border-primary/20 bg-night-900/60 p-3 sm:p-4 min-w-0">
            <div className="text-[10px] sm:text-xs uppercase tracking-wide text-slate-400">{r.tier}</div>
            <div className="mt-1 text-xs sm:text-sm text-slate-300">Winner</div>
            <div className="relative mt-1 pr-7 text-sm sm:text-base font-semibold text-primary truncate" title={r.addr || '—'}>{shorten(r.addr)}
              {r.addr && (
                <button
                  aria-label="Copy address"
                  title="Copy full address"
                  className="absolute right-0 top-0 text-primary/70 hover:text-primary"
                  onClick={() => navigator.clipboard?.writeText(r.addr!)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3 w-3 sm:h-4 sm:w-4"><path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
              )}
            </div>
            <div className="mt-2 text-[10px] sm:text-xs text-slate-400">Allocation</div>
            <div className="text-primary font-semibold text-sm sm:text-base truncate">{formatSol(r.amount || 0)}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
        <Button
          type="button"
          onClick={handlePrepare}
          disabled={!distributionEnabled || harvestStatus === 'preparing' || isPrepared}
          className={`w-full sm:w-auto rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold shadow-md transition-all ${
            isPrepared
              ? 'bg-night-800 text-slate-400 cursor-not-allowed border border-primary/20'
              : 'bg-badge-gradient text-white disabled:opacity-60'
          }`}
        >
          {isPrepared ? (
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Release Prepared
            </span>
          ) : harvestStatus === 'preparing' ? (
            'Preparing…'
          ) : (
            'Prepare Release'
          )}
        </Button>

        <Button
          type="button"
          onClick={() => {
            document.getElementById('module-distribution')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          disabled={!isPrepared}
          className="w-full sm:w-auto rounded-lg border border-primary/30 bg-night-800 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary shadow-md disabled:opacity-60"
        >
          View Distribution Card
        </Button>

        <Button
          type="button"
          onClick={() => {
            const headers = ['tier','winner','amount']
            const csvRows = rows.map((r) => [r.tier, r.addr || '', (r.amount || 0).toFixed(6)])
            const csv = [headers, ...csvRows]
              .map((row) => row.map((v) => `"${String(v).replaceAll('"','""')}"`).join(','))
              .join('\n')
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `solotto_harvest_${harvestPreparedAt ? new Date(harvestPreparedAt).toISOString() : 'preview'}.csv`
            a.click()
            URL.revokeObjectURL(url)
          }}
          className="w-full sm:w-auto rounded-lg border border-primary/30 bg-night-800 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-primary shadow-md"
        >
          Export CSV
        </Button>
      </div>

      {/* Helper Text */}
      {!distributionEnabled && (
        <HelperText variant="info">
          Complete and confirm Drawing to enable harvest preparation.
        </HelperText>
      )}
      {distributionEnabled && harvestStatus === 'idle' && (
        <HelperText variant="info">
          Click &quot;Prepare Release&quot; to harvest the prize pool and compute per-tier allocations.
        </HelperText>
      )}
      {isPrepared && (
        <HelperText variant="success">
          Release prepared successfully! Click &quot;View Distribution Card&quot; or proceed to the Distribution module.
        </HelperText>
      )}
    </section>
  )
}
