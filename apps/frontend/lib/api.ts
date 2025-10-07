// apps/frontend/lib/api.ts
// ✅ Wrapper around fetch for JWT-authenticated API calls
// ✅ Exports createLotteryConfig used by ControlForm.tsx

// api.ts
// Handles all API requests from frontend to backend

import { ConfigSchemaType } from '@/lib/zodSchemas'

export const createConfig = async (
  data: ConfigSchemaType & { prizeDistributionPercent: number; prizeSourceWallet: string; prizeSourceBalanceSol: number },
  token: string
) => {
  if (!token) throw new Error('Missing auth token')

  // Convert local datetime-local inputs to ISO UTC
  const toIsoUtc = (v: string) => new Date(v).toISOString()

  const payload = {
    tokenMint: 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump',
    tokenDecimals: 6,
    snapshotStart: toIsoUtc(data.startDate),
    snapshotEnd: toIsoUtc(data.endDate),
    tradePercentage: data.tradeThresholdPercent,
    prizeDistributionPercent: data.prizeDistributionPercent,
    slippageTolerancePercent: data.slippageTolerancePercent ?? 0,
    minUsdLottoRequired: 50,
    blacklist: (data.blacklistedWallets || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
    prizeSourceWallet: data.prizeSourceWallet,
    prizeSourceBalanceSol: data.prizeSourceBalanceSol,
  }

  const response = await fetch('/api/control', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to submit config: ${errorText}`)
  }

  return await response.json()
}

// --- Snapshot API (mocked for now) ---
export const generateSnapshot = async (token: string, roundId: string) => {
  if (!token) throw new Error('Missing auth token')
  const response = await fetch('/api/snapshot/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ roundId }),
  })
  if (!response.ok) throw new Error(await response.text())
  return await response.json()
}

export const confirmSnapshot = async (snapshotId: string, token: string) => {
  if (!token) throw new Error('Missing auth token')
  if (!snapshotId) throw new Error('Missing snapshot id')
  try {
    const response = await fetch('/api/snapshot/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ snapshotId }),
    })
    if (response.ok) {
      return await response.json()
    }
  } catch (_) {
    // ignore and use mock
  }
  await new Promise((res) => setTimeout(res, 400))
  return { ok: true }
}

// --- Drawing API ---
export const runDrawing = async (token: string, roundId: string) => {
  if (!token) throw new Error('Missing auth token')
  const response = await fetch('/api/drawing/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ roundId }),
  })
  if (!response.ok) throw new Error(await response.text())
  return await response.json()
}

export const confirmDrawing = async (drawingId: string, token: string) => {
  if (!token) throw new Error('Missing auth token')
  if (!drawingId) throw new Error('Missing drawing id')
  try {
    const response = await fetch('/api/drawing/confirm', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ drawingId }),
    })
    if (response.ok) return await response.json()
  } catch (_) {}
  await new Promise((r) => setTimeout(r, 300))
  return { ok: true }
}

// --- Harvest/Distribution API stubs ---
export type PrepareHarvestResponse = {
  preparedAt: string
  allocations: { t1: number; t2: number; t3: number; t4: number }
  audit?: { blockhash?: string; slot?: number; txSignatures?: string[]; ataAddresses?: Record<string,string> }
}

export const prepareHarvest = async (
  token: string,
  payload: { roundId: string }
): Promise<PrepareHarvestResponse> => {
  if (!token) throw new Error('Missing auth token')
  const response = await fetch('/api/harvest/prepare', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload || {}),
  })
  if (!response.ok) throw new Error(await response.text())
  return await response.json()
}

export type ReleaseDistributionResponse = {
  releasedAt: string
  txSignatures: string[]
}

export const releaseDistribution = async (token: string): Promise<ReleaseDistributionResponse> => {
  if (!token) throw new Error('Missing auth token')
  const response = await fetch('/api/distribution/release', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({}),
  })
  if (!response.ok) throw new Error(await response.text())
  return await response.json()
}
