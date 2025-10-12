"use client";

import Link from "next/link";
import OperatorLogin from "@/components/OperatorLogin";
import { WalletConnect } from "@/components/WalletConnect";
import { usePrizePool } from "@/hooks/usePrizePool";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const backendGithub = "https://github.com/solottodev/solotto-lottery-dapp/tree/main/apps/backend";

export default function SiteHeader() {
  const { prizePool, loading, error } = usePrizePool();

  const getPrizePoolValue = () => {
    if (loading) return "Loading...";
    if (error) return "Error";
    if (prizePool === null) return "N/A";
    return `${prizePool.toFixed(3)} SOL`;
  };

  const statusIndicators = [
    { label: "Backend", value: "View Source", link: backendGithub, title: backendUrl },
    { label: "Prize Pool", value: getPrizePoolValue() },
    { label: "Status", value: "Ready" },
  ];
  return (
    <header className="fixed left-0 right-0 top-0 z-[1000] w-full border-b border-primary/20 bg-night-900/90 backdrop-blur supports-[backdrop-filter]:bg-night-900/70">
      {/* Announcement strip */}
      <div className="w-full bg-gradient-to-r from-[#9945ff] via-[#14f195] to-[#00ffa3] py-2 md:py-3 text-center text-xs md:text-sm font-semibold uppercase tracking-[0.25em] md:tracking-[0.35em] text-slate-900 shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
        Secure operator environment — Wallet authentication required — Mainnet ready
      </div>

      {/* Main header area */}
      <div className="mx-auto grid w-full grid-cols-1 lg:grid-cols-12 items-center gap-3 px-4 py-3 md:gap-4 md:px-8 md:py-4">
        {/* Brand */}
        <div className="col-span-1 lg:col-span-3 flex items-center justify-center lg:justify-start">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="h-2 w-2 md:h-3 md:w-3 rounded-full bg-primary shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <span className="text-xl sm:text-2xl md:text-3xl lg:text-4xl leading-none font-semibold tracking-wider brand-gradient">
              SOLOTTO
            </span>
          </Link>
        </div>

        {/* Middle: subtitle + pills */}
        <div className="col-span-1 lg:col-span-6 flex flex-col items-center justify-center">
          <p className="mb-2 md:mb-3 lg:mb-4 text-sm sm:text-base md:text-lg lg:text-xl font-semibold text-slate-200 text-center">
            Decentralized Lottery: On-Chain & Auditable Automation
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 md:gap-2 text-[0.65rem] sm:text-[0.7rem] md:text-xs text-slate-200">
            {statusIndicators.map((indicator) => {
              const content = (
                <>
                  <span className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-primary" />
                  <span className="font-medium text-primary">{indicator.label}:</span>
                  <span className="text-slate-300 truncate max-w-[100px] sm:max-w-none">{indicator.value}</span>
                </>
              );

              return indicator.link ? (
                <a
                  key={indicator.label}
                  href={indicator.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={indicator.title}
                  className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-primary/20 bg-night-900/80 px-1.5 py-[2px] sm:px-2 md:px-3 md:py-1 shadow-[0_1px_6px_rgba(10,30,70,0.25)] backdrop-blur hover:border-primary/40 hover:bg-night-800/90 transition-colors cursor-pointer"
                >
                  {content}
                </a>
              ) : (
                <span
                  key={indicator.label}
                  className="inline-flex items-center gap-1 sm:gap-1.5 rounded-full border border-primary/20 bg-night-900/80 px-1.5 py-[2px] sm:px-2 md:px-3 md:py-1 shadow-[0_1px_6px_rgba(10,30,70,0.25)] backdrop-blur"
                >
                  {content}
                </span>
              );
            })}
          </div>
        </div>

        {/* Right: wallet + operator buttons */}
        <div className="col-span-1 lg:col-span-3 flex items-center justify-center lg:justify-end gap-2 sm:gap-3 flex-wrap lg:flex-nowrap">
          <div className="shrink-0">
            <WalletConnect size="md" />
          </div>
          <div className="shrink-0">
            <OperatorLogin />
          </div>
        </div>
      </div>
    </header>
  );
}
