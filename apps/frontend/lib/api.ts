// apps/frontend/lib/api.ts
// ✅ Wrapper around fetch for JWT-authenticated API calls
// ✅ Exports createLotteryConfig used by ControlForm.tsx

// api.ts
// Handles all API requests from frontend to backend

import { ConfigSchemaType } from '@/lib/zodSchemas'

export const createConfig = async (data: ConfigSchemaType, token: string) => {
  if (!token) throw new Error('Missing auth token')

  // Convert local datetime-local inputs to ISO UTC
  const toIsoUtc = (v: string) => new Date(v).toISOString()

  const payload = {
    tokenMint: 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump',
    tokenDecimals: 6,
    snapshotStart: toIsoUtc(data.startDate),
    snapshotEnd: toIsoUtc(data.endDate),
    tradePercentage: data.tradeThresholdPercent,
    infraAllocationPercent: data.infraAllocationPercent,
    slippageTolerancePercent: data.slippageTolerancePercent ?? 0,
    minUsdLottoRequired: 50,
    blacklist: (data.blacklistedWallets || '')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0),
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
