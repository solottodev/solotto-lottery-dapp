// ✅ Frontend Zod schema (strictly for ControlForm.tsx)
// ✅ Mirrors backend's LotteryConfig model fields

// zodSchemas.ts
// ✅ Zod schema definitions for frontend form validation in Control module

import { z } from 'zod'

const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
function isLikelySolanaAddress(s: string) {
  const len = s.length;
  return base58Regex.test(s) && len >= 32 && len <= 44;
}

// Form validation schema used by ControlForm
export const ConfigSchema = z.object({
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  tradeThresholdPercent: z.number({ invalid_type_error: 'Enter a number' })
    .min(0)
    .max(100),
  infraAllocationPercent: z.number({ invalid_type_error: 'Enter a number' })
    .min(0)
    .max(100),
  slippageTolerancePercent: z
    .number({ invalid_type_error: 'Enter a number' })
    .min(0)
    .max(100),
  blacklistedWallets: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val.trim().length === 0) return true; // optional
        const items = val
          .split(',')
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        return items.every(isLikelySolanaAddress);
      },
      {
        message:
          'Blacklist contains invalid addresses. Use comma-separated Solana addresses (base58, 32–44 chars).',
      }
    ),
})

export type ConfigSchemaType = z.infer<typeof ConfigSchema>

