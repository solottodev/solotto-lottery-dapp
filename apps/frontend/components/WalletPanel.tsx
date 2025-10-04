"use client";

import { useMemo } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

import { useWalletStore } from "@/hooks/useWalletStore";
import { WalletConnect } from "@/components/WalletConnect";

export function WalletPanel() {
  const { connected, publicKey } = useWallet();
  const walletAddress = useWalletStore((state) => state.walletAddress);

  const address = useMemo(() => walletAddress ?? publicKey ?? null, [walletAddress, publicKey]);
  const addressText = useMemo(() => address?.toBase58() ?? "", [address]);

  const shortAddress = addressText ? `${addressText.slice(0, 4)}…${addressText.slice(-4)}` : "";

  return (
    <aside className="hidden w-72 rounded-2xl border border-primary/30 bg-black/80 p-6 text-slate-100 shadow-[0_25px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl lg:fixed lg:right-10 lg:top-32 lg:flex lg:flex-col lg:gap-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span
          className={`inline-flex h-2.5 w-2.5 rounded-full ${connected ? "bg-primary" : "bg-warning"} animate-glow-pulse`}
        />
        <span>{connected ? "Owner connected" : "Owner not connected"}</span>
      </div>
      <p className="text-xs text-slate-400">
        Network: <span className="font-semibold text-primary">Solana Devnet</span>
      </p>
      {shortAddress && (
        <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs font-mono text-primary/80">
          {shortAddress}
        </div>
      )}
      <WalletConnect variant="panel" />
    </aside>
  );
}
