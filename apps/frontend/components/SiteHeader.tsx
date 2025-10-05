"use client";

import OperatorLogin from '@/components/OperatorLogin'
import { WalletConnect } from '@/components/WalletConnect'

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
const statusIndicators = [
  { label: 'Backend', value: backendUrl },
  { label: 'Prize Pool', value: '89.215 SOL' },
  { label: 'Status', value: 'Ready' },
]

export default function SiteHeader() {
  return (
    <header className="fixed left-0 right-0 top-0 z-[1000] w-full border-b border-primary/20 bg-night-900/90 backdrop-blur supports-[backdrop-filter]:bg-night-900/70">
      {/* Announcement strip */}
      <div className="w-full bg-gradient-to-r from-[#ff6b6b] via-[#ffa45b] to-[#ffd93d] py-6 text-center text-[32px] font-semibold uppercase tracking-[0.7em] text-slate-900 shadow-[0_6px_24px_rgba(0,0,0,0.25)]">
        Secure operator environment — Wallet authentication required — Mainnet ready
      </div>
      <div className="mx-auto grid w-full grid-cols-12 items-center gap-6 px-8 py-4 md:gap-10 md:px-12">
        {/* Brand */}
        <div className="col-span-4 md:col-span-3 flex items-center justify-start">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full bg-primary shadow-[0_0_22px_rgba(34,211,238,0.9)]" />
            <span className="text-[144px] leading-none font-semibold tracking-wider brand-gradient">SOLOTTO</span>
          </div>
        </div>

        {/* Middle: subtitle + pills spanning center */}
        <div className="col-span-8 md:col-span-6 flex flex-col items-center justify-center">
          <p className="mb-2 text-4xl font-semibold text-slate-200">
            Decentralized Lottery: Command Each Phase with Verifiable Automation
          </p>
          <div className="flex w-full flex-nowrap items-center justify-center gap-8 text-[28px] text-slate-200">
            {statusIndicators.map((indicator) => (
              <span
                key={indicator.label}
                className="inline-flex items-center gap-4 rounded-full border border-primary/20 bg-night-900/80 px-6 py-2 shadow-[0_8px_20px_rgba(10,30,70,0.35)] backdrop-blur"
              >
                <span className="h-4 w-4 rounded-full bg-primary" />
                <span className="font-medium text-primary">{indicator.label}:</span>
                <span className="text-slate-300">{indicator.value}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Right: wallet + operator, scaled, aligned to edge */}
        <div className="col-span-4 md:col-span-3 flex items-center justify-end gap-6 flex-nowrap">
          <div className="scale-[2] shrink-0 origin-center mr-64 lg:mr-80 relative z-10">
            <WalletConnect size="xl" />
          </div>
          <div className="scale-[2] shrink-0 origin-right">
            <OperatorLogin />
          </div>
        </div>
      </div>
    </header>
  )
}
