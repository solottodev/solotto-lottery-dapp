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
  size?: "md" | "lg" | "xl";
};

export function WalletConnect({ variant = "inline", size = "md" }: WalletConnectProps) {
  const { publicKey } = useWallet();
  const setWallet = useWalletStore((state) => state.setWalletAddress);

  useEffect(() => {
    setWallet(publicKey ?? null);
  }, [publicKey, setWallet]);

  const wrapperClass =
    variant === "panel" ? "mt-4 flex w-full" : "flex items-center justify-end";

  const inlineSize =
    size === "xl"
      ? " rounded-lg px-7 py-3.5 text-[20px]"
      : size === "lg"
      ? " rounded-lg px-6 py-3 text-[18px]"
      : " rounded-lg px-5 py-2.5 text-[15px]";
  const panelSize =
    size === "xl"
      ? " w-full justify-center rounded-lg px-7 py-4 text-[20px]"
      : size === "lg"
      ? " w-full justify-center rounded-lg px-6 py-3.5 text-[18px]"
      : " w-full justify-center rounded-lg px-5 py-3 text-[15px]";
  const buttonClass =
    "bg-primary text-night font-semibold transition-shadow shadow-glow hover:brightness-110" +
    (variant === "panel" ? panelSize : inlineSize);

  return (
    <div className={wrapperClass}>
      <WalletMultiButton className={buttonClass} />
    </div>
  );
}
