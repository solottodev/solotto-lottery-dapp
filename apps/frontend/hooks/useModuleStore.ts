// useModuleStore.ts
// Zustand store to coordinate module state in the Solotto dashboard.
// Tracks control module form submission and initial access control.

import { create } from 'zustand';

type ParticipantCounts = {
  t1: number
  t2: number
  t3: number
  t4: number
}

type ModuleStore = {
  controlEnabled: boolean;
  setControlEnabled: (enabled: boolean) => void;

  controlSubmitted: boolean;
  setControlSubmitted: (submitted: boolean) => void;

  participantCounts: ParticipantCounts | null;
  setParticipantCounts: (counts: ParticipantCounts | null) => void;
};

export const useModuleStore = create<ModuleStore>((set) => ({
  controlEnabled: true, // Set true for testing; login will control later
  setControlEnabled: (enabled) => set({ controlEnabled: enabled }),

  controlSubmitted: false,
  setControlSubmitted: (submitted) => set({ controlSubmitted: submitted }),

  participantCounts: null,
  setParticipantCounts: (counts) => set({ participantCounts: counts }),
}));

