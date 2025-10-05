// useAuthStore.ts
// Tracks and sets JWT for authenticated API calls

import { create } from "zustand";

type AuthState = {
  jwt: string | null;
  setJwt: (token: string | null) => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  jwt: null,
  setJwt: (token) => set({ jwt: token }),
}));
