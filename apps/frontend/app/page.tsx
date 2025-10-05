import { ModuleGrid } from "@/components/ModuleGrid";

const statusIndicators = [
  { label: "Backend", value: "http://localhost:8093" },
  { label: "Prize Pool", value: "89.215 SOL" },
  { label: "Status", value: "Ready" },
];

const stats = [
  { label: "Total Rounds", value: "2", detail: "since genesis" },
  { label: "Total SOL Distributed", value: "178.43", detail: "aggregate" },
  { label: "Total Winners", value: "8", detail: "across tiers" },
  { label: "Avg Prize Pool (SOL)", value: "89.22", detail: "per drawing" },
];

const workflow = ["Control", "Snapshot", "Drawing", "Harvest", "Distribution", "History"] as const;

export default function HomePage() {
  return (
    <>
      <main className="relative mx-auto flex min-h-screen w-full max-w-[90vw] 2xl:max-w-[1920px] flex-col gap-10 px-8 pb-32 pt-14 text-white md:px-14 bg-grid-dark rounded-3xl border border-white/5">

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <article
              key={item.label}
              className="rounded-2xl border border-primary/15 bg-card-gradient p-5 text-center shadow-card backdrop-blur"
            >
              <p className="text-3xl font-semibold text-primary">{item.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-200">{item.label}</p>
              <p className="text-xs uppercase tracking-wide text-slate-500">{item.detail}</p>
            </article>
          ))}
        </section>

        <section className="rounded-3xl border border-primary/25 bg-panel-gradient p-10 shadow-panel backdrop-blur-xl">
          <header className="space-y-2 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-primary/70">Lottery execution workflow</p>
          </header>

          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-semibold tracking-wide text-primary">
              {workflow.map((step, index) => (
                <div key={step} className="flex items-center">
                  <span className="rounded-full border border-primary/40 bg-primary/10 px-4 py-1 text-primary shadow-glow">
                    {step}
                  </span>
                  {index < workflow.length - 1 ? <span className="px-2 text-primary/70">&gt;</span> : null}
                </div>
              ))}
            </div>

            <div className="relative h-2 w-full overflow-hidden rounded-full bg-night-900/80">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-primary via-accent to-indigo"
                style={{ width: "100%" }}
              />
            </div>

            {/* System status banner removed per request */}
          </div>
        </section>

        <ModuleGrid />
      </main>
    </>
  );
}
