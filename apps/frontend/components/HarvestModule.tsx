"use client"

import { useMemo, useState } from 'react'
import { useModuleStore } from '@/hooks/useModuleStore'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/hooks/useAuthStore'
import { prepareHarvest } from '@/lib/api'

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
    <section className="rounded-3xl border border-primary/20 bg-night-900/60 p-5 shadow-panel">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-slate-300 text-sm">Harvest Status</div>
          <div className="text-primary font-semibold">
            {harvestStatus === 'idle' && 'Idle'}
            {harvestStatus === 'preparing' && 'Preparing…'}
            {harvestStatus === 'prepared' && 'Prepared — ready to release'}
            {harvestStatus === 'released' && 'Released'}
          </div>
          <div className="mt-1 text-xs text-slate-400">
            <div>Total Pool: <span className="text-primary font-semibold">{formatSol(prizePoolSol)}</span></div>
            {harvestPreparedAt && <div>Prepared: {new Date(harvestPreparedAt).toLocaleString()}</div>}
          </div>
        </div>
        <div className="text-right text-xs text-slate-400">
          {harvestAudit?.blockhash && <div>Blockhash: {harvestAudit.blockhash}</div>}
          {harvestAudit?.slot !== undefined && <div>Slot: {harvestAudit.slot}</div>}
          {harvestAudit?.txSignatures && harvestAudit.txSignatures.length > 0 && (
            <div>Tx: {harvestAudit.txSignatures.join(', ')}</div>
          )}
        </div>
      </div>

      {!distributionEnabled && (
        <div className="mb-4 rounded-lg border border-primary/25 bg-night-900/60 p-3 text-slate-300">
          Drawing must be confirmed to enable Harvest.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-400/30 bg-red-500/10 p-3 text-red-300 text-sm">{error}</div>
      )}

      <div className={`grid grid-cols-1 gap-3 md:grid-cols-2 ${!distributionEnabled ? 'pointer-events-none opacity-60' : ''}`}> 
        {rows.map((r) => (
          <div key={r.tier} className="relative rounded-lg border border-primary/20 bg-night-900/60 p-4">
            <div className="text-xs uppercase tracking-wide text-slate-400">{r.tier}</div>
            <div className="mt-1 text-sm text-slate-300">Winner</div>
            <div className="relative mt-1 pr-7 font-semibold text-primary break-all">{shorten(r.addr)}
              {r.addr && (
                <button
                  aria-label="Copy address"
                  title="Copy full address"
                  className="absolute right-3 top-3 text-primary/70 hover:text-primary"
                  onClick={() => navigator.clipboard?.writeText(r.addr!)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>
                </button>
              )}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {harvestAudit?.ataAddresses && (
                <div>ATA: <span className="text-slate-300">{harvestAudit.ataAddresses[(r.tier.toLowerCase() as 't1'|'t2'|'t3'|'t4')] || '—'}</span></div>
              )}
            </div>
            <div className="mt-2 text-xs text-slate-400">Allocation</div>
            <div className="text-primary font-semibold">{formatSol(r.amount || 0)}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={handlePrepare}
          disabled={!distributionEnabled || harvestStatus === 'preparing'}
          className="rounded-lg bg-badge-gradient px-4 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-60"
        >
          {harvestStatus === 'preparing' ? 'Preparing…' : 'Prepare Release'}
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
          className="rounded-lg border border-primary/30 bg-night-800 px-4 py-2 text-sm font-semibold text-primary shadow-md"
        >
          Export CSV
        </Button>

        <Button
          type="button"
          onClick={() => {
            document.getElementById('module-distribution')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }}
          disabled={harvestStatus !== 'prepared'}
          className="rounded-lg border border-primary/30 bg-night-800 px-4 py-2 text-sm font-semibold text-primary shadow-md disabled:opacity-60"
        >
          View Distribution Card
        </Button>
      </div>
    </section>
  )
}
