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

  // Snapshot module state
  snapshotStatus: 'idle' | 'running' | 'completed' | 'confirmed';
  setSnapshotStatus: (status: 'idle' | 'running' | 'completed' | 'confirmed') => void;
  snapshotId: string | null;
  setSnapshotId: (id: string | null) => void;
  snapshotStartedAt: string | null; // ISO
  setSnapshotStartedAt: (iso: string | null) => void;
  snapshotCompletedAt: string | null; // ISO
  setSnapshotCompletedAt: (iso: string | null) => void;

  // Drawing module gate (enabled after snapshot confirmed)
  drawingEnabled: boolean;
  setDrawingEnabled: (enabled: boolean) => void;

  // Drawing results (winners per tier)
  winners: { t1: string | null; t2: string | null; t3: string | null; t4: string | null };
  setWinners: (w: { t1: string | null; t2: string | null; t3: string | null; t4: string | null }) => void;

  // Drawing lifecycle
  drawingStatus: 'idle' | 'running' | 'completed' | 'confirmed';
  setDrawingStatus: (s: 'idle' | 'running' | 'completed' | 'confirmed') => void;
  drawingId: string | null;
  setDrawingId: (id: string | null) => void;
  drawingStartedAt: string | null;
  setDrawingStartedAt: (iso: string | null) => void;
  drawingCompletedAt: string | null;
  setDrawingCompletedAt: (iso: string | null) => void;
  audit: { seed?: string; vrfRequestId?: string; snapshotId?: string } | null;
  setAudit: (a: { seed?: string; vrfRequestId?: string; snapshotId?: string } | null) => void;

  distributionEnabled: boolean;
  setDistributionEnabled: (enabled: boolean) => void;

  // Harvest module state
  harvestStatus: 'idle' | 'preparing' | 'prepared' | 'released';
  setHarvestStatus: (s: 'idle' | 'preparing' | 'prepared' | 'released') => void;
  prizePoolSol: number; // current total pool for this round
  setPrizePoolSol: (n: number) => void;
  allocations: { t1: number; t2: number; t3: number; t4: number };
  setAllocations: (a: { t1: number; t2: number; t3: number; t4: number }) => void;
  harvestPreparedAt: string | null;
  setHarvestPreparedAt: (iso: string | null) => void;
  harvestAudit: { blockhash?: string; slot?: number; txSignatures?: string[]; ataAddresses?: Record<string, string> } | null;
  setHarvestAudit: (a: { blockhash?: string; slot?: number; txSignatures?: string[]; ataAddresses?: Record<string, string> } | null) => void;

  // Control config (for client-side preview derivations)
  controlConfig: {
    startDate?: string;
    endDate?: string;
    prizeDistributionPercent?: number;
    slippageTolerancePercent?: number;
  } | null;
  setControlConfig: (c: ModuleStore['controlConfig']) => void;

  // Round context
  roundId: string | null;
  setRoundId: (id: string | null) => void;

  // Distribution module state
  swapToLotto: boolean;
  setSwapToLotto: (b: boolean) => void;
  distributionStatus: 'idle' | 'queued' | 'releasing' | 'released';
  setDistributionStatus: (s: 'idle' | 'queued' | 'releasing' | 'released') => void;
  distributionDate: string | null;
  setDistributionDate: (iso: string | null) => void;
};

export const useModuleStore = create<ModuleStore>((set) => ({
  controlEnabled: true, // Set true for testing; login will control later
  setControlEnabled: (enabled) => set({ controlEnabled: enabled }),

  controlSubmitted: false,
  setControlSubmitted: (submitted) => set({ controlSubmitted: submitted }),

  participantCounts: null,
  setParticipantCounts: (counts) => set({ participantCounts: counts }),

  snapshotStatus: 'idle',
  setSnapshotStatus: (status) => set({ snapshotStatus: status }),
  snapshotId: null,
  setSnapshotId: (id) => set({ snapshotId: id }),
  snapshotStartedAt: null,
  setSnapshotStartedAt: (iso) => set({ snapshotStartedAt: iso }),
  snapshotCompletedAt: null,
  setSnapshotCompletedAt: (iso) => set({ snapshotCompletedAt: iso }),

  drawingEnabled: false,
  setDrawingEnabled: (enabled) => set({ drawingEnabled: enabled }),

  winners: { t1: null, t2: null, t3: null, t4: null },
  setWinners: (w) => set({ winners: w }),

  drawingStatus: 'idle',
  setDrawingStatus: (s) => set({ drawingStatus: s }),
  drawingId: null,
  setDrawingId: (id) => set({ drawingId: id }),
  drawingStartedAt: null,
  setDrawingStartedAt: (iso) => set({ drawingStartedAt: iso }),
  drawingCompletedAt: null,
  setDrawingCompletedAt: (iso) => set({ drawingCompletedAt: iso }),
  audit: null,
  setAudit: (a) => set({ audit: a }),

  // Harvest/Distribution gate (enabled after drawing confirmed)
  distributionEnabled: false,
  setDistributionEnabled: (enabled) => set({ distributionEnabled: enabled }),

  // Harvest state defaults
  harvestStatus: 'idle',
  setHarvestStatus: (s) => set({ harvestStatus: s }),
  prizePoolSol: 0,
  setPrizePoolSol: (n) => set({ prizePoolSol: n }),
  allocations: { t1: 0, t2: 0, t3: 0, t4: 0 },
  setAllocations: (a) => set({ allocations: a }),
  harvestPreparedAt: null,
  setHarvestPreparedAt: (iso) => set({ harvestPreparedAt: iso }),
  harvestAudit: null,
  setHarvestAudit: (a) => set({ harvestAudit: a }),

  controlConfig: null,
  setControlConfig: (c) => set({ controlConfig: c }),

  roundId: null,
  setRoundId: (id) => set({ roundId: id }),

  swapToLotto: false,
  setSwapToLotto: (b) => set({ swapToLotto: b }),
  distributionStatus: 'idle',
  setDistributionStatus: (s) => set({ distributionStatus: s }),
  distributionDate: null,
  setDistributionDate: (iso) => set({ distributionDate: iso }),
}));

