"use client";

import OperatorLogin from "@/components/OperatorLogin";
import { WalletConnect } from "@/components/WalletConnect";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const statusIndicators = [
  { label: "Backend", value: backendUrl },
  { label: "Prize Pool", value: "89.215 SOL" },
  { label: "Status", value: "Ready" },
];

export default function SiteHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-[1000] w-full border-b border-primary/20 bg-night-900/90 backdrop-blur supports-[backdrop-filter]:bg-night-900/70">
      {/* Announcement strip */}
      <div className="w-full bg-gradient-to-r from-[#ff6b6b] via-[#ffa45b] to-[#ffd93d] py-2 md:py-3 text-center text-xs md:text-sm font-semibold uppercase tracking-[0.25em] md:tracking-[0.35em] text-slate-900 shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
        Secure operator environment — Wallet authentication required — Mainnet ready
      </div>

      {/* Main header area */}
      <div className="mx-auto grid w-full grid-cols-12 items-center gap-3 px-4 py-3 md:gap-4 md:px-8 md:py-4">
        {/* Brand */}
        <div className="col-span-4 md:col-span-3 flex items-center justify-start">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 md:h-3 md:w-3 rounded-full bg-primary shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            {/* ✅ Doubled size of SOLOTTO text */}
            <span className="text-2xl md:text-4xl leading-none font-semibold tracking-wider brand-gradient">
              SOLOTTO
            </span>
          </div>
        </div>

        {/* Middle: subtitle + pills */}
        <div className="col-span-8 md:col-span-6 flex flex-col items-center justify-center">
          <p className="mb-3 md:mb-4 text-base md:text-xl font-semibold text-slate-200 text-center">
            Decentralized Lottery: On-Chain & Verifiable Automation
          </p>
          {/* ✅ Reduced pill size by ~25% */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 md:gap-2 text-[0.7rem] md:text-xs text-slate-200">
            {statusIndicators.map((indicator) => (
              <span
                key={indicator.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-night-900/80 px-2 py-[2px] md:px-3 md:py-1 shadow-[0_1px_6px_rgba(10,30,70,0.25)] backdrop-blur"
              >
                <span className="h-1.5 w-1.5 md:h-2 md:w-2 rounded-full bg-primary" />
                <span className="font-medium text-primary">{indicator.label}:</span>
                <span className="text-slate-300">{indicator.value}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Right: wallet + operator buttons */}
        <div className="col-span-4 md:col-span-3 flex items-center justify-end gap-3 flex-nowrap">
          {/* ✅ Shift Phantom button to the right */}
          <div className="scale-[0.8] shrink-0 origin-center mr-6 relative z-10">
            <WalletConnect size="md" />
          </div>
          <div className="scale-[0.8] shrink-0 origin-right">
            <OperatorLogin />
          </div>
        </div>
      </div>
    </header>
  );
}
