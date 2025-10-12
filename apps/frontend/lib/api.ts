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

  // Use environment variable for token mint (supports devnet/mainnet switching)
  // Mainnet: HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump
  // Devnet: 3peF9pJGVuUfVQQc2Gh7UXyz8Z3HM3oQAHJht3SrfDhf
  const tokenMint = process.env.NEXT_PUBLIC_LOTTO_MINT || 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump'
  const payload = {
    tokenMint,
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

  const response = await fetch('/api/snapshot/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ snapshotId }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to confirm snapshot: ${errorText}`)
  }

  return await response.json()
}

// Get participants list as JSON
export const getParticipants = async (snapshotId: string, token: string) => {
  if (!token) throw new Error('Missing auth token')
  if (!snapshotId) throw new Error('Missing snapshot id')

  const response = await fetch(`/api/snapshot/${snapshotId}/participants`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to fetch participants: ${errorText}`)
  }

  return await response.json()
}

// Export participants as CSV
export const exportParticipantsCSV = async (snapshotId: string, token: string) => {
  if (!token) throw new Error('Missing auth token')
  if (!snapshotId) throw new Error('Missing snapshot id')

  const response = await fetch(`/api/snapshot/${snapshotId}/participants/export`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Failed to export participants: ${errorText}`)
  }

  // Create blob and trigger download
  const blob = await response.blob()
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `snapshot-${snapshotId}-participants.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
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
  prizePoolSol: number
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
  ataAddresses?: Record<string, string>
  audit?: {
    blockhash: string
    slot: number
  }
}

export const releaseDistribution = async (
  token: string,
  roundId: string,
  swapToLotto: boolean
): Promise<ReleaseDistributionResponse> => {
  if (!token) throw new Error('Missing auth token')
  if (!roundId) throw new Error('Missing round ID')
  const response = await fetch('/api/distribution/release', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ roundId, swapToLotto }),
  })
  if (!response.ok) throw new Error(await response.text())
  return await response.json()
}
