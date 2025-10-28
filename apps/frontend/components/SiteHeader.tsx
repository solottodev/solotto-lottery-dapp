"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import OperatorLogin from "@/components/OperatorLogin";
import { WalletConnect } from "@/components/WalletConnect";
import { usePrizePool } from "@/hooks/usePrizePool";

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const backendGithub = "https://github.com/solottodev/solotto-lottery-dapp/tree/main/apps/backend";

export default function SiteHeader() {
  const { prizePool, loading, error } = usePrizePool();
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        const height = headerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--header-height', `${height}px`);
      }
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);

    // Use a small delay to ensure header is fully rendered
    const timer = setTimeout(updateHeaderHeight, 100);

    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
      clearTimeout(timer);
    };
  }, [prizePool, loading, error]);

  const getPrizePoolValue = () => {
    if (loading) return "Loading...";
    if (error) return "Error";
    if (prizePool === null) return "N/A";
    return `${prizePool.toFixed(3)} SOL`;
  };

  const statusIndicators = [
    { label: "Backend", value: "View Source", link: backendGithub, title: backendUrl },
    { label: "Prize Pool", value: getPrizePoolValue() },
  ];
  return (
    <header ref={headerRef} className="fixed left-0 right-0 top-0 z-[1000] w-full border-b border-primary/20 bg-night-900/90 backdrop-blur supports-[backdrop-filter]:bg-night-900/70" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Announcement strip */}
      <div className="w-full bg-gradient-to-r from-[#9945ff] via-[#14f195] to-[#00ffa3] py-1.5 sm:py-2 md:py-3 text-center text-[9px] sm:text-xs md:text-sm font-semibold uppercase tracking-[0.15em] sm:tracking-[0.2em] md:tracking-[0.25em] text-slate-900 shadow-[0_4px_16px_rgba(0,0,0,0.25)]">
        <span className="sm:hidden">Secure On-Chain Lottery System</span>
        <span className="hidden sm:inline">Secure and Transparent on-chain lottery — Built On Solana</span>
      </div>

      {/* Row 1: Main Navigation Bar */}
      <div className="mx-auto w-full border-b border-primary/10">
        <div className="mx-auto flex items-center justify-between gap-1 sm:gap-3 md:gap-4 px-2 sm:px-4 md:px-8 lg:px-12 py-3 sm:py-4 md:py-6">
          {/* Brand */}
          <div className="flex items-center flex-shrink min-w-0">
            <Link href="/" className="flex items-center gap-1 sm:gap-2 hover:opacity-80 transition-opacity min-w-0">
              <div className="h-2 w-2 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5 rounded-full bg-primary shadow-[0_0_12px_rgba(34,211,238,0.8)] flex-shrink-0" />
              <span className="text-[15px] sm:text-2xl md:text-3xl lg:text-4xl leading-none font-semibold tracking-wider brand-gradient whitespace-nowrap">
                SOLOTTO LOTTERY
              </span>
            </Link>
          </div>

          {/* Center: Subtitle */}
          <div className="hidden md:flex items-center">
            <p className="text-base md:text-lg lg:text-xl text-slate-200 tracking-wide text-center">
              On-Chain:Automated & Auditable
            </p>
          </div>

          {/* Right: Wallet + Operator buttons */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
            <div className="shrink-0">
              <WalletConnect variant="compact" size="md" />
            </div>
            <div className="shrink-0">
              <OperatorLogin />
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Status Bar */}
      <div className="mx-auto w-full bg-night-900/50">
        <div className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 px-3 sm:px-4 md:px-8 lg:px-12 py-2 sm:py-3 md:py-4">
          {/* Navigation Links */}
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/history"
              className="rounded-lg border border-primary/30 bg-night-800/80 px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-primary hover:bg-night-700 hover:border-primary/50 transition-all hover:shadow-[0_0_12px_rgba(34,211,238,0.3)] whitespace-nowrap"
            >
              <span className="sm:hidden">History Module</span>
              <span className="hidden sm:inline">History & Audit Module</span>
            </Link>
            <Link
              href="/transparency"
              className="rounded-lg border border-primary/30 bg-night-800/80 px-2.5 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-primary hover:bg-night-700 hover:border-primary/50 transition-all hover:shadow-[0_0_12px_rgba(34,211,238,0.3)] whitespace-nowrap"
            >
              <span className="sm:hidden">Transparency Portal</span>
              <span className="hidden sm:inline">Transparency Portal</span>
            </Link>
          </div>

          {/* Status Indicators */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 md:gap-3 text-xs md:text-xs text-slate-200">
            {statusIndicators.map((indicator) => {
              const content = (
                <>
                  <span className="h-2 w-2 rounded-full bg-primary" />
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
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-night-900/80 px-3 py-1.5 shadow-[0_2px_8px_rgba(10,30,70,0.3)] backdrop-blur hover:border-primary/40 hover:bg-night-800/90 hover:shadow-[0_0_12px_rgba(34,211,238,0.2)] transition-all cursor-pointer"
                >
                  {content}
                </a>
              ) : (
                <span
                  key={indicator.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-night-900/80 px-3 py-1.5 shadow-[0_2px_8px_rgba(10,30,70,0.3)] backdrop-blur"
                >
                  {content}
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </header>
  );
}
