import { ModuleGrid } from "@/components/ModuleGrid";
import Link from "next/link";

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

const workflow = ["Control", "Snapshot", "Drawing", "Harvest", "Distribution", "History & Audit Module"] as const;

export default function HomePage() {
  return (
    <>
      <main className="relative mx-auto flex min-h-screen w-full max-w-[95vw] sm:max-w-[90vw] 2xl:max-w-[1920px] flex-col gap-6 sm:gap-8 md:gap-10 px-4 sm:px-6 md:px-8 lg:px-14 pb-20 sm:pb-24 md:pb-32 pt-10 sm:pt-12 md:pt-14 text-white">

        <section className="grid gap-2 sm:gap-3 grid-cols-2 lg:grid-cols-4">
          {stats.map((item) => (
            <article
              key={item.label}
              className="rounded-xl sm:rounded-2xl border border-primary/15 bg-card-gradient p-3 sm:p-4 text-center shadow-card backdrop-blur"
            >
              <p className="text-xl sm:text-2xl md:text-3xl font-semibold text-primary">{item.value}</p>
              <p className="mt-1 text-[10px] sm:text-xs md:text-sm font-medium text-slate-200">{item.label}</p>
              <p className="text-[8px] sm:text-[10px] uppercase tracking-wide text-slate-500">{item.detail}</p>
            </article>
          ))}
        </section>

        <section className="p-0">
          <header className="space-y-2 text-center">
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl font-semibold uppercase tracking-[0.2em] sm:tracking-[0.3em] md:tracking-[0.35em] text-primary">Lottery execution workflow</p>
          </header>

          <div className="mt-3 sm:mt-4">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 md:gap-4 text-xs sm:text-sm md:text-base lg:text-lg font-semibold tracking-wide text-indigo">
              {workflow.map((step, index) => (
                <div key={step} className="flex items-center">
                  {step === "History & Audit Module" ? (
                    <Link href="/dashboard/history" className="rounded-full border border-indigo bg-indigo/10 px-3 py-1 sm:px-4 sm:py-1.5 md:px-6 md:py-2 text-primary shadow-indigo-glow underline hover:bg-indigo/20 transition-colors">
                      {step}
                    </Link>
                  ) : (
                    <span className="rounded-full border border-indigo/60 bg-indigo/10 px-3 py-1 sm:px-4 sm:py-1.5 md:px-6 md:py-2 text-primary shadow-indigo-glow">
                      {step}
                    </span>
                  )}
                  {index < workflow.length - 1 ? <span className="px-1 sm:px-2 md:px-3 text-indigo/70">&gt;</span> : null}
                </div>
              ))}
            </div>

            <div className="relative h-2 sm:h-3 w-full overflow-hidden rounded-full bg-night-900/0 mt-5 sm:mt-6 md:mt-8">
              <div
                className="absolute left-0 top-0 h-full rounded-full bg-gradient-to-r from-primary via-accent to-indigo"
                style={{ width: "100%" }}
              />
            </div>

            {/* System status banner removed per request */}
          </div>
        </section>

        <ModuleGrid />

        {/* History card is now in the ModuleGrid next to Distribution */}
      </main>
    </>
  );
}
