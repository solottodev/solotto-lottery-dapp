import { ModuleGrid } from "@/components/ModuleGrid";
import { WalletConnect } from "@/components/WalletConnect";
import { WalletPanel } from "@/components/WalletPanel";
import OperatorLogin from "@/components/OperatorLogin"; // ✅ Already present

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
      <div className="sticky top-0 z-40 w-full bg-gradient-to-r from-[#ff6b6b] via-[#ffa45b] to-[#ffd93d] py-2 text-center text-[0.7rem] font-semibold uppercase tracking-[0.35em] text-slate-900 shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
        Secure operator environment - Wallet authentication required - Mainnet ready
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 pb-24 pt-12 text-white md:px-12 bg-grid-dark rounded-3xl border border-white/5">
        <WalletPanel />

        <header className="space-y-6 text-center">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.6em] text-primary/80">Solotto Pro</p>
            <h1 className="text-4xl font-semibold tracking-tight text-primary md:text-6xl">SOLOTTO</h1>
            <p className="mx-auto max-w-2xl text-sm text-slate-300 md:text-base">
              Decentralized lottery - built on Solana. Command every phase from control to distribution with verifiable
              automation.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-4 text-sm text-slate-200">
            {statusIndicators.map((indicator) => (
              <span
                key={indicator.label}
                className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-night-900/80 px-5 py-2 shadow-[0_12px_30px_rgba(10,30,70,0.45)] backdrop-blur"
              >
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="font-medium text-primary">{indicator.label}:</span>
                <span className="text-slate-300">{indicator.value}</span>
              </span>
            ))}
          </div>

          <div className="flex items-center justify-center">
            <WalletConnect />
          </div>

          {/* ✅ NEW: Operator Authentication Button */}
          <div className="mt-4 flex justify-center">
            <OperatorLogin />
          </div>
        </header>

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
            <h2 className="text-3xl font-bold text-white">Command modules wired for production</h2>
            <p className="mx-auto max-w-3xl text-sm text-slate-300 md:text-base">
              Every stage emits auditable logs, supports multi-sig overrides, and enforces policy checks before funds move
              on-chain.
            </p>
          </header>

          <div className="mt-8 space-y-6">
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

            <div className="rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/20 via-transparent to-accent/10 px-6 py-4 text-sm text-cyan-100 shadow-[0_25px_60px_rgba(7,35,85,0.5)]">
              <span className="font-semibold text-primary">System status:</span> Ready for lottery execution. All security checks
              passed. Multi-sig authentication required for critical actions.
            </div>
          </div>
        </section>

        <ModuleGrid />
      </main>
    </>
  );
}
