// useModuleStore.ts
// Zustand store to coordinate module state in the Solotto dashboard.
// Tracks control module form submission and initial access control.
// Includes persistence middleware to maintain state across page refreshes.

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type ParticipantCounts = {
  t1: number
  t2: number
  t3: number
  t4: number
}

type HistoryRoundPreview = {
  id: string
  drawingDate?: string | null
  distributionDate?: string | null
  prizePoolSol?: number | null
  totalParticipants?: number | null
  eligibleParticipants?: number | null
  tierWinners?: { t1?: string | null; t2?: string | null; t3?: string | null; t4?: string | null }
  tierPayouts?: { t1?: number | null; t2?: number | null; t3?: number | null; t4?: number | null }
  txSignatures?: string[]
  swapToLotto?: boolean
  isLocal?: boolean
}

type HistoryParticipant = {
  roundId: string
  wallet: string
  lottoUsdValue?: number | null
  tier?: string | number | null
  percentTraded?: number | null
  isWinner?: boolean | null
  drawingDate?: string | null
  distributionTx?: string | null
  isLocal?: boolean
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
  audit: { seed?: string; blockhash?: string; slot?: number; snapshotId?: string } | null;
  setAudit: (a: { seed?: string; blockhash?: string; slot?: number; snapshotId?: string } | null) => void;

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
    tradeThresholdPercent?: number;
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

  historyRounds: HistoryRoundPreview[];
  setHistoryRoundsFromApi: (rounds: HistoryRoundPreview[]) => void;
  upsertHistoryRound: (round: HistoryRoundPreview) => void;
  historyParticipants: Record<string, HistoryParticipant[]>;
  setHistoryParticipants: (roundId: string, participants: HistoryParticipant[], source: 'api' | 'local') => void;

  // Session restoration tracking
  isRestoredSession: boolean;
  setRestoredSession: (restored: boolean) => void;

  // Round completion and workflow reset
  resetWorkflow: () => void;
};

export const useModuleStore = create<ModuleStore>()(
  persist(
    (set) => ({
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
  historyRounds: [],
  setHistoryRoundsFromApi: (rounds) => set((state) => {
    const list = Array.isArray(rounds) ? rounds : []
    const apiRounds = list.map((r) => ({ ...r, isLocal: false }))
    const localPreviews = (state.historyRounds || []).filter(
      (r) => r.isLocal && !apiRounds.some((api) => api.id === r.id)
    )
    return { historyRounds: [...apiRounds, ...localPreviews] }
  }),
  upsertHistoryRound: (round) => set((state) => {
    const next = [...(state.historyRounds || [])]
    const idx = next.findIndex((r) => r.id === round.id)
    const base = idx >= 0 ? next[idx] : undefined
    const merged = {
      ...base,
      ...round,
      isLocal: round.isLocal !== undefined ? round.isLocal : base?.isLocal ?? true,
    }
    if (idx >= 0) {
      next[idx] = merged
    } else {
      next.unshift(merged)
    }
    return { historyRounds: next }
  }),
  historyParticipants: {},
  setHistoryParticipants: (roundId, participants, source) => set((state) => {
    const existing = state.historyParticipants?.[roundId] || []
    const normalized = (Array.isArray(participants) ? participants : []).map((p) => ({
      ...p,
      roundId,
      isLocal: source === 'local',
    }))
    let combined: HistoryParticipant[]
    if (source === 'api') {
      const locals = existing.filter((p) => p.isLocal)
      combined = [
        ...normalized.map((p) => ({ ...p, isLocal: false })),
        ...locals.filter((l) => !normalized.some((n) => n.wallet === l.wallet)),
      ]
    } else {
      const others = existing.filter((p) => !(p.isLocal && normalized.some((n) => n.wallet === p.wallet)))
      combined = [
        ...normalized.map((p) => ({ ...p, isLocal: true })),
        ...others,
      ]
    }
    return {
      historyParticipants: {
        ...(state.historyParticipants || {}),
        [roundId]: combined,
      },
    }
  }),

  isRestoredSession: false,
  setRestoredSession: (restored) => set({ isRestoredSession: restored }),

  // Reset entire workflow to start a new round
  resetWorkflow: () => set({
    controlSubmitted: false,
    snapshotStatus: 'idle',
    snapshotId: null,
    snapshotStartedAt: null,
    snapshotCompletedAt: null,
    drawingEnabled: false,
    drawingStatus: 'idle',
    drawingId: null,
    drawingStartedAt: null,
    drawingCompletedAt: null,
    audit: null,
    winners: { t1: null, t2: null, t3: null, t4: null },
    distributionEnabled: false,
    harvestStatus: 'idle',
    harvestPreparedAt: null,
    harvestAudit: null,
    allocations: { t1: 0, t2: 0, t3: 0, t4: 0 },
    distributionStatus: 'idle',
    distributionDate: null,
    prizePoolSol: 0,
    participantCounts: null,
    roundId: null,
    controlConfig: null,
    swapToLotto: false,
    isRestoredSession: false,
  }),
}),
    {
      name: 'solotto-module-storage',
      storage: createJSONStorage(() => sessionStorage),
      // Only persist critical workflow state, not UI-only state
      partialize: (state) => ({
        controlSubmitted: state.controlSubmitted,
        snapshotStatus: state.snapshotStatus,
        snapshotId: state.snapshotId,
        drawingStatus: state.drawingStatus,
        drawingId: state.drawingId,
        harvestStatus: state.harvestStatus,
        distributionStatus: state.distributionStatus,
        roundId: state.roundId,
        winners: state.winners,
        participantCounts: state.participantCounts,
        allocations: state.allocations,
        prizePoolSol: state.prizePoolSol,
        controlConfig: state.controlConfig,
      }),
      onRehydrateStorage: () => (state) => {
        // Mark session as restored if any workflow state exists
        if (state && (state.controlSubmitted || state.snapshotStatus !== 'idle' || state.drawingStatus !== 'idle')) {
          state.setRestoredSession(true);
        }
      },
    }
  )
);

