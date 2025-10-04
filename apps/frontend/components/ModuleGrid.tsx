"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { BarChart3, Gift, Puzzle, Users } from "lucide-react";

type Metric = {
  label: string;
  value: string;
};

type ModuleInfo = {
  name: string;
  description: string;
  href: string;
  icon: LucideIcon;
  metrics?: Metric[];
  actionLabel: string;
  highlight?: { label: string; value: string; detail?: string };
};

const modules: ModuleInfo[] = [
  {
    name: "Control Module",
    description: "Configure lottery parameters, blacklists, and validator thresholds.",
    href: "/dashboard/control",
    icon: Puzzle,
    metrics: [
      { label: "Trade threshold", value: "50%" },
      { label: "Infrastructure", value: "70%" },
    ],
    actionLabel: "Configure parameters",
  },
  {
    name: "Snapshot Module",
    description: "Generate wallet snapshots and assign participants to tiers.",
    href: "/dashboard/snapshot",
    icon: Users,
    metrics: [
      { label: "Tier 1 (5%)", value: "147" },
      { label: "Tier 2 (15%)", value: "441" },
      { label: "Tier 3 (30%)", value: "882" },
      { label: "Tier 4 (50%)", value: "1,470" },
    ],
    actionLabel: "Create snapshot",
  },
  {
    name: "Drawing Module",
    description: "Execute VRF-backed random selection with deterministic audit trails.",
    href: "/dashboard/drawing",
    icon: BarChart3,
    highlight: { label: "Selected winners", value: "4", detail: "1 per tier" },
    actionLabel: "Execute VRF drawing",
  },
  {
    name: "Prize & Distribution",
    description: "Harvest prize pools, queue treasury actions, and release funds to winners.",
    href: "/dashboard/history",
    icon: Gift,
    metrics: [
      { label: "Tier 1 (40%)", value: "35.69 SOL" },
      { label: "Tier 2 (25%)", value: "22.30 SOL" },
      { label: "Tier 3 (20%)", value: "17.84 SOL" },
      { label: "Tier 4 (15%)", value: "13.39 SOL" },
    ],
    actionLabel: "Release payouts",
  },
];

export function ModuleGrid() {
  return (
    <section className="grid gap-6 md:grid-cols-2">
      {modules.map((module) => (
        <article
          key={module.name}
          className="relative overflow-hidden rounded-3xl border border-primary/20 bg-panel-gradient p-8 shadow-panel backdrop-blur"
        >
          <div className="absolute -top-16 right-0 h-36 w-36 translate-x-1/3 rounded-full bg-primary/15 blur-3xl" aria-hidden />
          <div className="flex items-center gap-4">
            <module.icon className="h-10 w-10 rounded-xl bg-badge-gradient p-2 text-white" />
            <h3 className="text-lg font-semibold text-primary">{module.name}</h3>
          </div>
          <p className="mt-4 text-sm text-slate-300">{module.description}</p>

          {module.metrics ? (
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              {module.metrics.map((metric) => (
                <div key={metric.label} className="rounded-lg border border-primary/20 bg-night-900/60 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">{metric.label}</p>
                  <p className="mt-1 font-semibold text-primary">{metric.value}</p>
                </div>
              ))}
            </div>
          ) : null}

          {module.highlight ? (
            <div className="mt-6 rounded-xl border border-primary/25 bg-primary/10 p-4 text-center text-sm text-primary">
              <p className="text-xs uppercase tracking-wide text-primary/70">{module.highlight.label}</p>
              <p className="mt-1 text-lg font-semibold text-white">{module.highlight.value}</p>
              {module.highlight.detail ? (
                <p className="text-xs text-primary/70">{module.highlight.detail}</p>
              ) : null}
            </div>
          ) : null}

          <div className="mt-6 flex items-center justify-between">
            <Link href={module.href} className="text-sm font-semibold text-primary hover:text-primary/60">
              View module
            </Link>
            <button className="rounded-lg bg-badge-gradient px-4 py-2 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(6,182,212,0.35)] transition hover:shadow-[0_24px_45px_rgba(6,182,212,0.45)]">
              {module.actionLabel}
            </button>
          </div>
        </article>
      ))}
    </section>
  );
}