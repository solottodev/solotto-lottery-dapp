"use client";

import type { PropsWithChildren } from "react";

import { WalletProvider } from "@/lib/wallet";

export function Providers({ children }: PropsWithChildren) {
  return <WalletProvider>{children}</WalletProvider>;
}
