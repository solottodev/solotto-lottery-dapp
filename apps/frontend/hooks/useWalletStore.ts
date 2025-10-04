import { PublicKey } from "@solana/web3.js";
import { create } from "zustand";

type WalletState = {
  walletAddress: PublicKey | null;
  setWalletAddress: (wallet: PublicKey | null) => void;
};

export const useWalletStore = create<WalletState>((set) => ({
  walletAddress: null,
  setWalletAddress: (wallet) => set({ walletAddress: wallet })
}));
