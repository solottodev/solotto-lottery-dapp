"use client";

import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider as BaseWalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo } from "react";

import "@solana/wallet-adapter-react-ui/styles.css";

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  const envNet = (process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet").toLowerCase();
  const network: WalletAdapterNetwork = envNet.startsWith("mainnet")
    ? WalletAdapterNetwork.Mainnet
    : envNet.startsWith("testnet")
    ? WalletAdapterNetwork.Testnet
    : WalletAdapterNetwork.Devnet;

  const endpoint = useMemo(() => {
    const custom = process.env.NEXT_PUBLIC_SOLANA_RPC;
    return custom && custom.length > 0 ? custom : clusterApiUrl(network);
  }, [network]);

  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <BaseWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </BaseWalletProvider>
    </ConnectionProvider>
  );
};
