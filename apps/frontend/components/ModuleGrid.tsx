// ModuleGrid.tsx
// This component renders all Solotto modules in a 2x2 grid.
// The Control Module form becomes editable only when the user is logged in AND controlEnabled is true.

'use client';

import ControlForm from '@/components/ControlForm';
import SnapshotForm from '@/components/SnapshotForm';
import DrawingForm from '@/components/DrawingForm';
import HarvestModule from '@/components/HarvestModule';
import DistributionModule from '@/components/DistributionModule';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useModuleStore } from '@/hooks/useModuleStore';
import { BarChart3, Gift, Puzzle, Users, Copy, Coins, History as HistoryIcon } from 'lucide-react';
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
    description: 'Execute VRF-backed random selection with deterministic audit trails.',
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
  const winners = useModuleStore((state) => state.winners);
  const distributionEnabled = useModuleStore((state) => state.distributionEnabled);
  const harvestStatus = useModuleStore((state) => state.harvestStatus);
  const snapshotStatus = useModuleStore((state) => state.snapshotStatus);
  const drawingStatus = useModuleStore((state) => state.drawingStatus);
  const prizePoolSol = useModuleStore((state) => state.prizePoolSol);
  const allocations = useModuleStore((state) => state.allocations);
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

  const openAndPulse = (key: keyof typeof highlight) => {
    setExpanded((s) => ({ ...s, [key]: true }))
    setHighlight((h) => ({ ...h, [key]: true }))
    setTimeout(() => setHighlight((h) => ({ ...h, [key]: false })), 2200)
  }

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

  const shorten = (addr?: string | null) => {
    if (!addr) return '—';
    if (addr.length <= 10) return addr;
    return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
  };

  return (
    <section className="grid gap-6 md:grid-cols-2">
      {modules.map((module) => {
        const isControl = module.key === 'control';
        const isSnapshot = module.key === 'snapshot';

        return (
          <article
            key={module.name}
            className="relative overflow-hidden rounded-3xl border border-primary/20 bg-panel-gradient p-6 md:p-8 shadow-panel backdrop-blur"
            id={`module-${module.key}`}
          >
            <div className="absolute -top-16 right-0 h-36 w-36 rounded-full bg-primary/15 blur-3xl" aria-hidden />
            <div className={`relative z-20 flex items-center justify-between gap-3 ${highlight[module.key] ? 'animate-glow-pulse' : ''}`}>
              <div className="flex items-center gap-3">
                <module.icon className="h-7 w-7 rounded-xl bg-badge-gradient p-1.5 text-white" />
                <h3 className="text-base md:text-lg font-semibold text-primary">{module.name}</h3>
              </div>
              <button
                onClick={() => setExpanded((s) => ({ ...s, [module.key]: !s[module.key] }))}
                className="rounded-md border border-primary/30 bg-night-800 px-3 py-1 text-xs text-primary"
                aria-label={expanded[module.key] ? 'Collapse section' : 'Expand section'}
              >
                {expanded[module.key] ? 'Collapse' : 'Expand'}
              </button>
            </div>
            <p className="mt-3 text-xs md:text-sm text-slate-300">{module.description}</p>

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
                      { label: 'Tier 2 (25%)', value: formatSol(allocations.t2 || 0) },
                      { label: 'Tier 3 (20%)', value: formatSol(allocations.t3 || 0) },
                      { label: 'Tier 4 (15%)', value: formatSol(allocations.t4 || 0) },
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
                {[
                  { id: 'round_abcd1234', drawingDate: '2025-01-09T18:00:00Z', prize: '89.215 SOL', winners: 4, status: 'Released' },
                  { id: 'round_efgh5678', drawingDate: '2024-12-31T18:00:00Z', prize: '76.532 SOL', winners: 4, status: 'Released' },
                  { id: 'round_ijkl9012', drawingDate: '2024-12-24T18:00:00Z', prize: '92.004 SOL', winners: 4, status: 'Released' },
                  { id: 'round_mnop3456', drawingDate: '2024-12-17T18:00:00Z', prize: '81.777 SOL', winners: 4, status: 'Released' },
                ].map((r) => (
                  <div key={r.id} className="rounded-lg border border-primary/20 bg-night-900/60 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-primary font-semibold">{r.id}</div>
                      <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{r.status}</span>
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-slate-400">Drawing Date</div>
                        <div className="text-slate-200">{new Date(r.drawingDate).toLocaleDateString()}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Prize Pool</div>
                        <div className="text-primary font-semibold">{r.prize}</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Winners</div>
                        <div className="text-slate-200">{r.winners}</div>
                      </div>
                    </div>
                  </div>
                ))}
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
              <div className="mt-4 text-green-400 text-sm">Snapshot confirmed. Drawing enabled.</div>
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
  );
}

  const formatSol = (n: number) => `${n.toFixed(6)} SOL`
