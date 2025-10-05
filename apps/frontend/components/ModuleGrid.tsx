// ModuleGrid.tsx
// This component renders all Solotto modules in a 2x2 grid.
// The Control Module form becomes editable only when the user is logged in AND controlEnabled is true.

'use client';

import ControlForm from '@/components/ControlForm';
import { useAuthStore } from '@/hooks/useAuthStore';
import { useModuleStore } from '@/hooks/useModuleStore';
import { BarChart3, Gift, Puzzle, Users } from 'lucide-react';

type Metric = {
  label: string;
  value: string;
};

type ModuleInfo = {
  name: string;
  description: string;
  href: string;
  icon: React.ElementType;
  metrics?: Metric[];
  highlight?: { label: string; value: string; detail?: string };
};

const modules: ModuleInfo[] = [
  {
    name: 'Control Module',
    description: 'Configure lottery parameters, blacklists, and validator thresholds.',
    href: '/dashboard/control',
    icon: Puzzle,
  },
  {
    name: 'Snapshot Module',
    description: 'Generate wallet snapshots and assign participants to tiers.',
    href: '/dashboard/snapshot',
    icon: Users,
  },
  {
    name: 'Drawing Module',
    description: 'Execute VRF-backed random selection with deterministic audit trails.',
    href: '/dashboard/drawing',
    icon: BarChart3,
    highlight: { label: 'Selected winners', value: '4', detail: '1 per tier' },
  },
  {
    name: 'Prize & Distribution',
    description: 'Harvest prize pools, queue treasury actions, and release funds to winners.',
    href: '/dashboard/history',
    icon: Gift,
    metrics: [
      { label: 'Tier 1 (40%)', value: '35.69 SOL' },
      { label: 'Tier 2 (25%)', value: '22.30 SOL' },
      { label: 'Tier 3 (20%)', value: '17.84 SOL' },
      { label: 'Tier 4 (15%)', value: '13.39 SOL' },
    ],
  },
];

export function ModuleGrid() {
  const isLoggedIn = !!useAuthStore((state) => state.jwt);
  const controlEnabled = useModuleStore((state) => state.controlEnabled);
  const controlSubmitted = useModuleStore((state) => state.controlSubmitted);
  const participantCounts = useModuleStore((state) => state.participantCounts);

  return (
    <section className="grid gap-6 md:grid-cols-2">
      {modules.map((module) => {
        const isControl = module.name === 'Control Module';
        const isSnapshot = module.name === 'Snapshot Module';

        return (
          <article
            key={module.name}
            className="relative overflow-hidden rounded-3xl border border-primary/20 bg-panel-gradient p-10 md:p-12 shadow-panel backdrop-blur"
          >
            <div className="absolute -top-16 right-0 h-36 w-36 rounded-full bg-primary/15 blur-3xl" aria-hidden />
            <div className="flex items-center gap-4">
              <module.icon className="h-10 w-10 rounded-xl bg-badge-gradient p-2 text-white" />
              <h3 className="text-lg font-semibold text-primary">{module.name}</h3>
            </div>
            <p className="mt-4 text-sm text-slate-300">{module.description}</p>

            {/* Metrics Display */}
            {module.name !== 'Control Module' && (
              <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                {module.name === 'Snapshot Module'
                  ? [
                      { label: 'Tier 1 (5%)', value: participantCounts ? String(participantCounts.t1) : '—' },
                      { label: 'Tier 2 (15%)', value: participantCounts ? String(participantCounts.t2) : '—' },
                      { label: 'Tier 3 (30%)', value: participantCounts ? String(participantCounts.t3) : '—' },
                      { label: 'Tier 4 (50%)', value: participantCounts ? String(participantCounts.t4) : '—' },
                    ].map((metric) => (
                      <div key={metric.label} className="rounded-lg border border-primary/20 bg-night-900/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">{metric.label}</p>
                        <p className="mt-1 font-semibold text-primary">{metric.value}</p>
                      </div>
                    ))
                  : module.metrics?.map((metric) => (
                      <div key={metric.label} className="rounded-lg border border-primary/20 bg-night-900/60 p-3">
                        <p className="text-xs uppercase tracking-wide text-slate-400">{metric.label}</p>
                        <p className="mt-1 font-semibold text-primary">{metric.value}</p>
                      </div>
                    ))}
              </div>
            )}

            {/* Highlight Box (Drawing Module Only) */}
            {module.highlight && (
              <div className="mt-6 rounded-xl border border-primary/25 bg-primary/10 p-4 text-center text-sm text-primary">
                <p className="text-xs uppercase tracking-wide text-primary/70">{module.highlight.label}</p>
                <p className="mt-1 text-lg font-semibold text-white">{module.highlight.value}</p>
                {module.highlight.detail && (
                  <p className="text-xs text-primary/70">{module.highlight.detail}</p>
                )}
              </div>
            )}

            {/* Control Module Form (Visible always when enabled; overlay locks until login) */}
            {isControl && controlEnabled && (
              <div className="mt-6 relative">
                {!isLoggedIn && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-3xl bg-night-900/60 backdrop-blur-sm border border-primary/20">
                    <div className="text-center">
                      <p className="text-primary font-semibold">Operator authentication required</p>
                      <p className="text-slate-400 text-sm">Login to edit and submit control parameters</p>
                    </div>
                  </div>
                )}
                <div className={!isLoggedIn ? "pointer-events-none opacity-60" : ""}>
                  <ControlForm />
                </div>
              </div>
            )}

            {/* Snapshot Module state info */}
            {isSnapshot && controlSubmitted && (
              <div className="mt-4 text-green-400 text-sm">Control config completed. Snapshot ready.</div>
            )}

            {/* Remove View module links across modules; keep status button when relevant */}
            <div className="mt-6 flex items-center justify-end">
              {!isControl && (
                <button
                  className="rounded-lg bg-badge-gradient px-4 py-2 text-sm font-semibold text-white shadow-md"
                  disabled
                >
                  {isSnapshot && !controlSubmitted ? 'Pending Control Config' : 'Open'}
                </button>
              )}
            </div>
          </article>
        );
      })}
    </section>
  );
}

