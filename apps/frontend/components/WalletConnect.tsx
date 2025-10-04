"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useWallet } from "@solana/wallet-adapter-react";

import { useWalletStore } from "@/hooks/useWalletStore";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

type WalletConnectProps = {
  variant?: "inline" | "panel";
};

export function WalletConnect({ variant = "inline" }: WalletConnectProps) {
  const { publicKey } = useWallet();
  const setWallet = useWalletStore((state) => state.setWalletAddress);

  useEffect(() => {
    setWallet(publicKey ?? null);
  }, [publicKey, setWallet]);

  const wrapperClass =
    variant === "panel" ? "mt-4 flex w-full" : "flex items-center justify-end";

  const buttonClass =
    "bg-primary text-night font-semibold transition-shadow shadow-glow hover:brightness-110" +
    (variant === "panel" ? " w-full justify-center rounded-lg px-4 py-3 text-base" : " rounded px-4 py-2");

  return (
    <div className={wrapperClass}>
      <WalletMultiButton className={buttonClass} />
    </div>
  );
}
