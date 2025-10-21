// ModuleGrid.tsx
// This component renders all Solotto modules in a 2x2 grid.
// The Control Module form becomes editable only when the user is logged in AND controlEnabled is true.

'use client';

import ControlForm from '@/components/ControlForm';
import SnapshotForm from '@/components/SnapshotForm';
import DrawingForm from '@/components/DrawingForm';
import HarvestModule from '@/components/HarvestModule';
import DistributionModule from '@/components/DistributionModule';
import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useModuleStore } from '@/hooks/useModuleStore';
import { BarChart3, Gift, Puzzle, Users, Coins, History as HistoryIcon, RotateCcw } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Metric = {
  label: string;
  value: string;
};

type ModuleInfo = {
  key: 'control' | 'snapshot' | 'drawing' | 'harvest' | 'distribution' | 'history';
  name: string;
  description: string;
  href: string;
  icon: React.ElementType;
  metrics?: Metric[];
  highlight?: { label: string; value: string; detail?: string };
};

const modules: ModuleInfo[] = [
  {
    key: 'control',
    name: '1. Control',
    description: 'Configure lottery parameters, blacklists, and validator thresholds.',
    href: '/dashboard/control',
    icon: Puzzle,
  },
  {
    key: 'snapshot',
    name: '2. Snapshot',
    description: 'Generate wallet snapshots and assign participants to tiers.',
    href: '/dashboard/snapshot',
    icon: Users,
  },
  {
    key: 'drawing',
    name: '3. Drawing',
    description: 'Execute crypto-secure random selection with deterministic audit trails.',
    href: '/dashboard/drawing',
    icon: BarChart3,
  },
  {
    key: 'harvest',
    name: '4. Harvest',
    description: 'Harvest prize pool and compute per-tier allocations.',
    href: '/dashboard/harvest',
    icon: Coins,
  },
  {
    key: 'distribution',
    name: '5. Distribution',
    description: 'Release SOL/LOTTO to winners with on-chain audit.',
    href: '/dashboard/distribution',
    icon: Gift,
  },
  {
    key: 'history',
    name: '6. History',
    description: 'Access the full History Module for all lottery data.',
    href: '/dashboard/history',
    icon: HistoryIcon,
  },
];

export function ModuleGrid() {
  const router = useRouter();
  const isLoggedIn = !!useAuthStore((state) => state.jwt);
  const controlEnabled = useModuleStore((state) => state.controlEnabled);
  const controlSubmitted = useModuleStore((state) => state.controlSubmitted);
  const participantCounts = useModuleStore((state) => state.participantCounts);
  const drawingEnabled = useModuleStore((state) => state.drawingEnabled);
  const harvestStatus = useModuleStore((state) => state.harvestStatus);
  const snapshotStatus = useModuleStore((state) => state.snapshotStatus);
  const drawingStatus = useModuleStore((state) => state.drawingStatus);
  const allocations = useModuleStore((state) => state.allocations);
  const distributionStatus = useModuleStore((state) => state.distributionStatus);
  const isRestoredSession = useModuleStore((state) => state.isRestoredSession);
  const setRestoredSession = useModuleStore((state) => state.setRestoredSession);
  const resetWorkflow = useModuleStore((state) => state.resetWorkflow);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    control: false,
    snapshot: false,
    drawing: false,
    harvest: false,
    distribution: false,
    history: false,
  });

  const [highlight, setHighlight] = useState<Record<string, boolean>>({
    control: false,
    snapshot: false,
    drawing: false,
    harvest: false,
    distribution: false,
    history: false,
  })

  const historyRounds = useModuleStore((state) => state.historyRounds)
  const setHistoryRoundsFromApi = useModuleStore((state) => state.setHistoryRoundsFromApi)

  const fetchHistoryRounds = useCallback(async () => {
    try {
      const res = await fetch('/api/history/rounds?page=1&size=4')
      const data = await res.json()
      setHistoryRoundsFromApi(data.rounds || [])
    } catch (_) {}
  }, [setHistoryRoundsFromApi])

  const openAndPulse = (key: keyof typeof highlight) => {
    setExpanded((s) => ({ ...s, [key]: true }))
    setHighlight((h) => ({ ...h, [key]: true }))
    setTimeout(() => setHighlight((h) => ({ ...h, [key]: false })), 2200)
  }

  useEffect(() => {
    fetchHistoryRounds()
  }, [fetchHistoryRounds])

  // Auto-expand subsequent cards on successful transitions
  useEffect(() => {
    if (controlSubmitted && !expanded.snapshot) {
      openAndPulse('snapshot')
    }
  }, [controlSubmitted])

  useEffect(() => {
    if (snapshotStatus === 'confirmed' && !expanded.drawing) {
      openAndPulse('drawing')
    }
  }, [snapshotStatus])

  useEffect(() => {
    if (drawingStatus === 'confirmed' && !expanded.harvest) {
      openAndPulse('harvest')
    }
  }, [drawingStatus])

  useEffect(() => {
    if (harvestStatus === 'prepared' && !expanded.distribution) {
      openAndPulse('distribution')
    }
  }, [harvestStatus])

  useEffect(() => {
    if (distributionStatus === 'released') {
      fetchHistoryRounds()
      openAndPulse('history')
    }
  }, [distributionStatus, fetchHistoryRounds])

  const shorten = (addr?: string | null) => {
    if (!addr) return '—';
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
  };

  return (
    <>
      {/* Session Restoration Banner */}
      {isRestoredSession && (
        <div className="mb-4 rounded-xl border border-blue-400/30 bg-blue-500/10 p-3 sm:p-4 flex items-start gap-3">
          <RotateCcw className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-blue-300">Session Restored</p>
            <p className="mt-1 text-xs text-blue-300/80">
              Your previous workflow state has been restored from this browser session. You can continue from where you left off.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setRestoredSession(false)}
                className="rounded-md border border-blue-400/30 bg-blue-500/20 px-3 py-1.5 text-xs font-medium text-blue-300 hover:bg-blue-500/30 transition-colors"
              >
                Continue
              </button>
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to reset the workflow? This will clear all progress and start fresh.')) {
                    resetWorkflow();
                    setRestoredSession(false);
                  }
                }}
                className="rounded-md border border-red-400/30 bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/30 transition-colors"
              >
                Reset Workflow
              </button>
            </div>
          </div>
          <button
            onClick={() => setRestoredSession(false)}
            className="text-blue-400/60 hover:text-blue-400 transition-colors"
            aria-label="Dismiss notification"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      )}

      <section className="grid gap-4 sm:gap-5 md:gap-6 md:grid-cols-2">
      {modules.map((module) => {
        const isControl = module.key === 'control';
        const isSnapshot = module.key === 'snapshot';

        return (
          <article
            key={module.name}
            className="relative overflow-hidden rounded-2xl sm:rounded-3xl border border-primary/20 bg-panel-gradient p-4 sm:p-5 md:p-6 lg:p-8 shadow-panel backdrop-blur"
            id={`module-${module.key}`}
          >
            <div className="absolute -top-16 right-0 h-36 w-36 rounded-full bg-primary/15 blur-3xl" aria-hidden />
            <div className={`relative z-20 flex items-center justify-between gap-2 sm:gap-3 ${highlight[module.key] ? 'animate-glow-pulse' : ''}`}>
              <div className="flex items-center gap-2 sm:gap-3">
                <module.icon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 rounded-lg sm:rounded-xl bg-badge-gradient p-1 sm:p-1.5 text-white" />
                <h3 className="text-sm sm:text-base md:text-lg font-semibold text-primary">{module.name}</h3>
              </div>
              <button
                onClick={() => setExpanded((s) => ({ ...s, [module.key]: !s[module.key] }))}
                className="rounded-md border border-primary/30 bg-night-800 px-2 sm:px-3 py-1 text-[10px] sm:text-xs text-primary shrink-0"
                aria-label={expanded[module.key] ? 'Collapse section' : 'Expand section'}
              >
                {expanded[module.key] ? 'Collapse' : 'Expand'}
              </button>
            </div>
            <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs md:text-sm text-slate-300">{module.description}</p>

            <div className={expanded[module.key] ? '' : 'hidden'}>
            {/* Metrics Display */}
            {module.key !== 'control' && module.key !== 'history' && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs md:text-sm">
                {(() => {
                  if (module.key === 'snapshot') {
                    return [
                      { label: 'Tier 1 (5%)', value: participantCounts ? String(participantCounts.t1) : '—' },
                      { label: 'Tier 2 (15%)', value: participantCounts ? String(participantCounts.t2) : '—' },
                      { label: 'Tier 3 (30%)', value: participantCounts ? String(participantCounts.t3) : '—' },
                      { label: 'Tier 4 (50%)', value: participantCounts ? String(participantCounts.t4) : '—' },
                    ]
                  }
                  if (module.key === 'harvest') {
                    return [
                      { label: 'Tier 1 (40%)', value: formatSol(allocations.t1 || 0) },
                      { label: 'Tier 2 (30%)', value: formatSol(allocations.t2 || 0) },
                      { label: 'Tier 3 (20%)', value: formatSol(allocations.t3 || 0) },
                      { label: 'Tier 4 (10%)', value: formatSol(allocations.t4 || 0) },
                    ]
                  }
                  return module.metrics || []
                })().map((metric) => (
                  <div key={metric.label} className="rounded-lg border border-primary/20 bg-night-900/60 p-2">
                    <p className="text-xs uppercase tracking-wide text-slate-400">{metric.label}</p>
                    <p className="mt-1 font-semibold text-primary">{metric.value}</p>
                  </div>
                ))}
              </div>
            )}

            {/* History preview list */}
            {module.key === 'history' && (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {historyRounds.length > 0 ? (
                  historyRounds.map((r) => (
                    <div key={r.id} className="rounded-lg border border-primary/20 bg-night-900/60 p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-primary font-semibold text-[10px] sm:text-xs">{shorten(r.id)}</div>
                        <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">Released</span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-slate-400">Drawing Date</div>
                          <div className="text-slate-200">{r.drawingDate ? new Date(r.drawingDate).toLocaleDateString() : '—'}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Prize Pool</div>
                          <div className="text-primary font-semibold">{formatSol(r.prizePoolSol || 0)}</div>
                        </div>
                        <div>
                          <div className="text-slate-400">Winners</div>
                          <div className="text-slate-200">{(() => {
                            const wins = r.tierWinners || {}
                            return Object.values(wins).filter(Boolean).length || '—'
                          })()}</div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <button
                          onClick={() => {
                            const url = `/api/history/export/round/${r.id}/full`
                            window.location.href = url
                          }}
                          className="w-full rounded-md bg-badge-gradient px-2 py-1.5 text-[10px] sm:text-xs font-semibold text-white shadow-sm hover:opacity-90 transition-opacity"
                        >
                          Export Full CSV
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">No rounds available yet.</p>
                )}
              </div>
            )}

            {/* Drawing actions inline */}
            {module.key === 'drawing' && (
              <div className="mt-4">
                <DrawingForm />
              </div>
            )}

            {/* Drawing ready state note */}
            {module.key === 'drawing' && drawingEnabled && (
              <div className="mt-4 text-green-400 text-sm"></div>
            )}

            {/* Control Module Form (Visible always when enabled; overlay locks until login) */}
            {isControl && controlEnabled && (
              <div className="mt-6 relative">
                {!isLoggedIn && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-night-900/40">
                    <div className="text-center">
                      <p className="text-primary font-semibold">Operator authentication required</p>
                      <p className="text-slate-400 text-sm">Login to edit and submit control parameters</p>
                    </div>
                  </div>
                )}
                <div className={!isLoggedIn ? "pointer-events-none opacity-80" : ""}>
                  <ControlForm />
                </div>
              </div>
            )}

            {/* Snapshot Module Form (gated by control submission and login) */}
            {isSnapshot && (
              <div className="mt-6 relative">
                {!controlSubmitted && (
                  <div className="rounded-xl border border-primary/25 bg-night-900/50 p-4 text-sm text-slate-400">
                    Pending Control Config — complete Control to enable snapshot.
                  </div>
                )}
                {controlSubmitted && !isLoggedIn && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-night-900/60 backdrop-blur-sm border border-primary/20">
                    <div className="text-center">
                      <p className="text-primary font-semibold">Operator authentication required</p>
                      <p className="text-slate-400 text-sm">Login to run and confirm snapshot</p>
                    </div>
                  </div>
                )}
                {controlSubmitted && (
                  <div className={!isLoggedIn ? "pointer-events-none opacity-60" : ""}>
                    <SnapshotForm />
                  </div>
                )}
              </div>
            )}

            {/* Harvest actions inline */}
            {module.key === 'harvest' && (
              <div className="mt-4">
                <HarvestModule />
              </div>
            )}

            {/* Distribution actions inline */}
            {module.key === 'distribution' && (
              <div className="mt-4">
                <DistributionModule />
              </div>
            )}

            {/* Remove View module links across modules; keep status button when relevant */}
            {/* Navigation button no longer needed for these modules since actions are inline; keep for History only. */}
            {module.key === 'history' && (
              <div className="mt-4 flex items-center justify-end">
                <button
                  onClick={() => router.push('/dashboard/history')}
                  className={`rounded-lg px-3 py-1.5 text-xs md:text-sm font-semibold shadow-md bg-badge-gradient text-white`}
                >
                  Open
                </button>
              </div>
            )}
            </div>
          </article>
        );
      })}
    </section>
    </>
  );
}

const formatSol = (n: number) => `${n.toFixed(6)} SOL`
