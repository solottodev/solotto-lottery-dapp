# Manual Price Entry - Complete Implementation Plan

**Date:** October 23, 2025
**Status:** READY FOR IMPLEMENTATION
**Estimated Time:** 4-6 hours
**Cost:** $0 (vs $199/month for Solscan Pro)

---

## 📋 Executive Summary

This plan implements a Manual Price Entry system that allows the operator to enter (or auto-fetch) the current LOTTO token price in USD when configuring a lottery round. This price is then used to calculate USD values for all token holders during snapshot, enabling the $50 USD minimum eligibility requirement.

---

## 🎯 Goals & Requirements

### Primary Goals
1. Allow operator to enter LOTTO → USD price in Control Form
2. Provide "Fetch Price" button to auto-fill from CoinGecko API
3. Store price in database with lottery config for audit trail
4. Calculate USD values during snapshot using stored price
5. Enable $50 USD minimum eligibility check

### Success Criteria
- ✅ Operator can manually enter price or click "Fetch Price"
- ✅ Price is validated (positive, reasonable range)
- ✅ Price is stored in database with round
- ✅ USD values calculated correctly: `usdValue = tokenBalance × price`
- ✅ $50 USD eligibility filter works correctly
- ✅ CSV export includes correct USD values
- ✅ All tests pass

---

## 🗂️ Complete File Change List

### Files to CREATE (2 files)

1. **`apps/backend/src/routes/price.ts`** (NEW)
   - Price API endpoint for "Fetch Price" button
   - Calls CoinGecko API
   - Returns current LOTTO price in USD

2. **`apps/backend/prisma/migrations/[timestamp]_add_lotto_usd_price.sql`** (NEW)
   - Database migration to add `lottoUsdPrice` field

### Files to MODIFY (9 files)

3. **`apps/backend/prisma/schema.prisma`**
   - Add `lottoUsdPrice Float?` to `LotteryConfig` model

4. **`apps/backend/src/utils/zodSchemas.ts`**
   - Add `lottoUsdPrice` to validation schema

5. **`apps/frontend/lib/zodSchemas.ts`**
   - Add `lottoUsdPrice` to frontend schema

6. **`apps/frontend/components/ControlForm.tsx`**
   - Add price input field
   - Add "Fetch Price" button
   - Add validation and helper text

7. **`apps/backend/src/routes/control.ts`**
   - Store `lottoUsdPrice` in config

8. **`apps/backend/src/services/snapshot.service.ts`**
   - Fetch price from config
   - Calculate USD values using price
   - Update `assignTiers()` method signature

9. **`apps/backend/src/routes/snapshot.ts`**
   - Pass price to snapshot service
   - Log price being used

10. **`apps/frontend/lib/api.ts`**
    - Add `fetchCurrentPrice()` function for "Fetch Price" button

11. **`apps/backend/.env.example`**
    - Document that LOTTO price is manually entered (no API key needed)

### Files to UPDATE (Testing/Docs) (4 files)

12. **`apps/backend/tests/e2e/3-snapshot.test.ts`** (if exists)
    - Update test to include `lottoUsdPrice` in config

13. **`apps/backend/scripts/test-snapshot.ts`** (if exists)
    - Add price parameter to test runs

14. **`MAINNET_BLOCKERS.md`**
    - Update BLOCKER 1 to reflect price entry implementation

15. **`SCHEMA_AND_CSV_ALIGNMENT.md`**
    - Document `lottoUsdPrice` field in config schema

---

## 📊 Impact Analysis

### Database Changes

**Table:** `LotteryConfig`
- **New Column:** `lottoUsdPrice FLOAT NULL`
- **Purpose:** Store LOTTO price in USD at round creation time
- **Migration Required:** Yes (non-breaking, nullable field)
- **Existing Data:** Will have `NULL` for old configs (acceptable)

### API Changes

**New Endpoint:** `GET /api/price/current`
- **Purpose:** Fetch current LOTTO price from CoinGecko
- **Authentication:** Requires JWT (operator only)
- **Response:** `{ price: 0.00014104, source: "CoinGecko", timestamp: "..." }`
- **Rate Limit:** CoinGecko free tier (30 calls/min)

**Modified Endpoint:** `POST /api/control`
- **New Field:** `lottoUsdPrice` (optional number)
- **Validation:** Must be positive, < $1000
- **Behavior:** Stores price in `LotteryConfig` table

### Frontend Changes

**Component:** `ControlForm.tsx`
- **New UI Element:** Price input field + "Fetch Price" button
- **Placement:** After "Slippage Tolerance" field
- **Validation:** Positive number, max $1000
- **User Flow:**
  1. Operator clicks "Fetch Price" → auto-fills current price
  2. OR operator manually types price
  3. Operator reviews and confirms
  4. Form submission includes price

### Backend Logic Changes

**Snapshot Service:**
- **New Logic:** Calculate `tokenUsdBalance = tokenLottoBalance × lottoUsdPrice`
- **Fallback:** If no price configured, use token balance as USD (placeholder)
- **Warning:** Log warning if price is missing

**Eligibility Check:**
- **Location:** `apps/backend/src/routes/snapshot.ts:146-167`
- **Current Logic:** `usdBalance >= minUsdLotto` (already exists)
- **Change:** USD balance will now be **accurate** instead of placeholder
- **Impact:** Eligibility filtering will work correctly

### CSV Export Changes

**File:** Exported CSV from snapshot
- **Column:** "Token USD Balance" (already exists)
- **Change:** Will now contain **real USD values** instead of token balance
- **Format:** No change, still a number
- **Impact:** CSV now shows accurate USD values for auditing

---

## 🔧 Detailed Implementation Steps

---

## PHASE 1: Database Schema (30 minutes)

### Step 1.1: Update Prisma Schema

**File:** `apps/backend/prisma/schema.prisma`

**Location:** Line 24-41 (LotteryConfig model)

**Change:**
```prisma
model LotteryConfig {
  id                       String       @id @default(uuid())
  tokenMint                String
  tokenDecimals            Int
  snapshotStart            DateTime
  snapshotEnd              DateTime
  drawTime                 DateTime?
  tradePercentage          Float
  status                   ConfigStatus @default(PENDING)
  minUsdLottoRequired      Float        @default(50.0)
  prizeDistributionPercent Float        @default(70.0)
  slippageTolerancePercent Float        @default(0.5)
  blacklist                Json         @default("[]")
  lottoUsdPrice            Float?       // 🆕 NEW FIELD: LOTTO price in USD
  createdById              String
  createdAt                DateTime     @default(now())
  updatedAt                DateTime     @updatedAt
  User                     User         @relation(fields: [createdById], references: [id])
}
```

**Why nullable (`Float?`):**
- Old configs won't have this field (backward compatible)
- Operator might skip it (though not recommended)
- Allows system to detect missing price and warn

---

### Step 1.2: Create Migration

**Command:**
```bash
cd apps/backend
npx prisma migrate dev --name add_lotto_usd_price
```

**Expected Output:**
```
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "solotto", schema "public" at "..."

Applying migration `20251023_add_lotto_usd_price`

The following migration(s) have been created and applied from new schema changes:

migrations/
  └─ 20251023_add_lotto_usd_price/
      └─ migration.sql

✔ Generated Prisma Client
```

**Migration SQL Preview:**
```sql
-- AlterTable
ALTER TABLE "LotteryConfig" ADD COLUMN "lottoUsdPrice" DOUBLE PRECISION;

-- Optional: Add comment
COMMENT ON COLUMN "LotteryConfig"."lottoUsdPrice" IS 'LOTTO token price in USD at round creation time';
```

---

### Step 1.3: Regenerate Prisma Client

**Command:**
```bash
npx prisma generate
```

**Impact:**
- TypeScript types updated
- `LotteryConfig` type now includes `lottoUsdPrice?: number`

---

## PHASE 2: Backend API (1.5 hours)

### Step 2.1: Create Price Service

**File:** `apps/backend/src/services/price.service.ts` (NEW)

**Full Implementation:**
```typescript
// apps/backend/src/services/price.service.ts
import axios from 'axios';

interface CoinGeckoPriceResponse {
  [tokenAddress: string]: {
    usd: number;
  };
}

export class PriceService {
  private readonly COINGECKO_API = 'https://api.coingecko.com/api/v3/simple/token_price/solana';

  /**
   * Fetch current LOTTO token price from CoinGecko
   * @param tokenMint - Solana token mint address
   * @returns Price in USD
   */
  async getLottoUsdPrice(tokenMint: string): Promise<number> {
    try {
      console.log(`💵 Fetching LOTTO price from CoinGecko for ${tokenMint}...`);

      const response = await axios.get<CoinGeckoPriceResponse>(this.COINGECKO_API, {
        params: {
          contract_addresses: tokenMint,
          vs_currencies: 'usd',
        },
        timeout: 10000, // 10 second timeout
      });

      const priceData = response.data[tokenMint];

      if (!priceData || typeof priceData.usd !== 'number') {
        throw new Error(`Price data not found for token ${tokenMint}`);
      }

      const price = priceData.usd;
      console.log(`✅ LOTTO price: $${price.toFixed(8)} USD`);

      return price;
    } catch (error: any) {
      console.error('❌ Failed to fetch LOTTO price:', error.message);

      // Re-throw with user-friendly message
      if (error.response?.status === 404) {
        throw new Error('Token not found on CoinGecko. Token may not be listed yet.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('CoinGecko API timeout. Please try again.');
      } else {
        throw new Error('Failed to fetch token price. Please enter manually.');
      }
    }
  }

  /**
   * Validate that a manually entered price is reasonable
   */
  validatePrice(price: number): { valid: boolean; error?: string } {
    if (price <= 0) {
      return { valid: false, error: 'Price must be positive' };
    }

    if (price > 1000) {
      return { valid: false, error: 'Price seems unrealistic (>$1000). Please verify.' };
    }

    if (price < 0.00000001) {
      return { valid: false, error: 'Price too small (<$0.00000001). Please verify.' };
    }

    return { valid: true };
  }
}

// Singleton instance
let priceServiceInstance: PriceService | null = null;

export function getPriceService(): PriceService {
  if (!priceServiceInstance) {
    priceServiceInstance = new PriceService();
  }
  return priceServiceInstance;
}
```

---

### Step 2.2: Create Price API Route

**File:** `apps/backend/src/routes/price.ts` (NEW)

**Full Implementation:**
```typescript
// apps/backend/src/routes/price.ts
import express from 'express';
import { requireJwt } from '../middleware/requireJwt';
import { getPriceService } from '../services/price.service';

const router = express.Router();

/**
 * GET /api/price/current
 * Fetch current LOTTO price from CoinGecko for "Fetch Price" button
 */
router.get('/current', requireJwt, async (req, res) => {
  try {
    const tokenMint = process.env.NEXT_PUBLIC_TOKEN_MINT;

    if (!tokenMint) {
      return res.status(500).json({
        error: 'Token mint not configured',
        message: 'NEXT_PUBLIC_TOKEN_MINT environment variable is missing',
      });
    }

    const priceService = getPriceService();
    const price = await priceService.getLottoUsdPrice(tokenMint);

    return res.json({
      success: true,
      price,
      source: 'CoinGecko',
      timestamp: new Date().toISOString(),
      tokenMint,
    });
  } catch (error: any) {
    console.error('GET /price/current failed:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to fetch price',
      message: error.message,
    });
  }
});

export default router;
```

---

### Step 2.3: Register Price Route in Main App

**File:** `apps/backend/src/index.ts` (or `app.ts`)

**Find the routes section** (around line 40-60, after other route imports):

```typescript
import controlRoutes from './routes/control';
import snapshotRoutes from './routes/snapshot';
import drawingRoutes from './routes/drawing';
import distributionRoutes from './routes/distribution';
import historyRoutes from './routes/history';
import priceRoutes from './routes/price'; // 🆕 ADD THIS

// ... later in the file ...

app.use('/api/control', controlRoutes);
app.use('/api/snapshot', snapshotRoutes);
app.use('/api/drawing', drawingRoutes);
app.use('/api/distribution', distributionRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/price', priceRoutes); // 🆕 ADD THIS
```

---

### Step 2.4: Update Control Route to Store Price

**File:** `apps/backend/src/routes/control.ts`

**Location:** Line 38-152 (POST '/' handler)

**Changes:**

1. **Update validation schema import** (line 5):
```typescript
import { lotteryConfigSchema } from '../utils/zodSchemas'; // Will be updated in Step 2.5
```

2. **Destructure new field** (line 52-65):
```typescript
const {
  tokenMint,
  tokenDecimals,
  snapshotStart,
  snapshotEnd,
  drawTime,
  tradePercentage,
  minUsdLottoRequired,
  prizeDistributionPercent,
  slippageTolerancePercent,
  blacklist,
  prizeSourceWallet,
  prizeSourceBalanceSol,
  lottoUsdPrice, // 🆕 ADD THIS
} = parsed.data;
```

3. **Log price if provided** (after line 65, before wallet validation):
```typescript
// 🆕 ADD THIS BLOCK
if (lottoUsdPrice) {
  console.log(`💵 LOTTO Price provided: $${lottoUsdPrice} USD`);
} else {
  console.warn('⚠️  No LOTTO price provided - USD values will be inaccurate');
}
```

4. **Store price in config** (line 137-152):
```typescript
const config = await prisma.lotteryConfig.create({
  data: {
    tokenMint,
    tokenDecimals,
    snapshotStart: new Date(snapshotStart),
    snapshotEnd: new Date(snapshotEnd),
    ...(drawTime ? { drawTime: new Date(drawTime) } : {}),
    tradePercentage,
    minUsdLottoRequired,
    prizeDistributionPercent,
    slippageTolerancePercent,
    blacklist: combined,
    lottoUsdPrice, // 🆕 ADD THIS
    status: ConfigStatus.PENDING,
    createdById: userId,
  },
});
```

---

### Step 2.5: Update Backend Zod Schema

**File:** `apps/backend/src/utils/zodSchemas.ts`

**Find:** `lotteryConfigSchema` (around line 10-30)

**Add new field:**
```typescript
export const lotteryConfigSchema = z.object({
  tokenMint: z.string().min(32).max(44),
  tokenDecimals: z.number().int().min(0).max(18),
  snapshotStart: z.string().datetime(),
  snapshotEnd: z.string().datetime(),
  drawTime: z.string().datetime().optional(),
  tradePercentage: z.number().min(0).max(100),
  minUsdLottoRequired: z.number().positive().default(50.0),
  prizeDistributionPercent: z.number().min(0).max(100).default(70.0),
  slippageTolerancePercent: z.number().min(0).max(100).default(0.5),
  blacklist: z.array(z.string()).default([]),
  prizeSourceWallet: z.string().min(32).max(44),
  prizeSourceBalanceSol: z.number().positive(),

  // 🆕 NEW FIELD
  lottoUsdPrice: z
    .number()
    .positive('LOTTO price must be positive')
    .max(1000, 'LOTTO price seems unrealistic (>$1000)')
    .optional(), // Optional to allow operator to skip (not recommended)
});

export type LotteryConfigInput = z.infer<typeof lotteryConfigSchema>;
```

---

### Step 2.6: Update Snapshot Service to Use Price

**File:** `apps/backend/src/services/snapshot.service.ts`

**Change 1: Update interface** (line 8-14):
```typescript
export interface SnapshotParticipant {
  wallet: string;
  tokenLottoBalanceStart: number; // $LOTTO tokens at round START
  tokenLottoBalanceEnd: number;   // $LOTTO tokens at round END
  tokenUsdBalance: number;        // USD value at snapshot END time (🆕 NOW ACCURATE!)
  tier: number;
}
```

**Change 2: Update `assignTiers()` method signature** (line 141):
```typescript
private assignTiers(
  holders: TokenHolder[],
  lottoUsdPrice: number | null // 🆕 ADD PARAMETER
): SnapshotParticipant[] {
```

**Change 3: Calculate USD value using price** (line 182-184):
```typescript
// ✅ Calculate USD value using stored price
const tokenLottoBalanceEnd = holder.balanceUi;
const tokenUsdBalance = lottoUsdPrice
  ? tokenLottoBalanceEnd * lottoUsdPrice  // 🆕 REAL CALCULATION
  : tokenLottoBalanceEnd; // Fallback if no price (should not happen)
```

**Change 4: Update `createSnapshot()` to fetch and pass price** (line 241-260):

Add this block **after** line 251 (after fetching holders):
```typescript
// 🆕 FETCH LOTTO PRICE FROM CONFIG
const round = await prisma.round.findUnique({ where: { id: roundId } });
if (!round) throw new Error('Round not found');

const config = await prisma.lotteryConfig.findFirst({
  where: {
    snapshotStart: round.startDate,
    snapshotEnd: round.endDate,
  },
  orderBy: { createdAt: 'desc' },
});

const lottoUsdPrice = config?.lottoUsdPrice ?? null;

if (!lottoUsdPrice) {
  console.warn('⚠️  WARNING: No LOTTO price configured!');
  console.warn('   USD values will be inaccurate (using token balance as fallback)');
  console.warn('   Please configure LOTTO price in Control Form for accurate results');
} else {
  console.log(`💵 Using LOTTO price: $${lottoUsdPrice.toFixed(8)} USD`);
}
```

**Change 5: Pass price to assignTiers** (line 259):
```typescript
// 2. Assign tiers based on balance (🆕 NOW WITH PRICE)
let participants = this.assignTiers(holders, lottoUsdPrice);
```

---

## PHASE 3: Frontend Changes (2 hours)

### Step 3.1: Update Frontend Zod Schema

**File:** `apps/frontend/lib/zodSchemas.ts`

**Find:** `ConfigSchema` (around line 10-30)

**Add new field:**
```typescript
export const ConfigSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  tradeThresholdPercent: z.coerce.number().min(0).max(100),
  prizeDistributionPercent: z.coerce.number().min(0).max(100),
  slippageTolerancePercent: z.coerce.number().min(0).max(100),
  blacklistedWallets: z.string().optional(),

  // 🆕 NEW FIELD
  lottoUsdPrice: z.coerce
    .number({
      required_error: 'LOTTO price is required',
      invalid_type_error: 'LOTTO price must be a number',
    })
    .positive('LOTTO price must be positive')
    .max(1000, 'LOTTO price seems unrealistic (>$1000)')
    .optional(), // Optional to not break existing form submissions
});

export type ConfigSchemaType = z.infer<typeof ConfigSchema>;
```

---

### Step 3.2: Add Fetch Price Function to API Client

**File:** `apps/frontend/lib/api.ts`

**Find:** Other API functions (after `createConfig`, around line 50-100)

**Add new function:**
```typescript
/**
 * Fetch current LOTTO price from CoinGecko
 */
export async function fetchCurrentPrice(jwt: string): Promise<number> {
  const res = await fetch(`${API_BASE}/price/current`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to fetch price: ${errorText}`);
  }

  const data = await res.json();

  if (!data.success || typeof data.price !== 'number') {
    throw new Error('Invalid price response from server');
  }

  return data.price;
}
```

---

### Step 3.3: Update Control Form Component

**File:** `apps/frontend/components/ControlForm.tsx`

**Change 1: Add state for price fetching** (after line 30, before `toLocalInput`):
```typescript
const [isFetchingPrice, setIsFetchingPrice] = React.useState(false);
const [priceFetchError, setPriceFetchError] = React.useState<string | null>(null);
```

**Change 2: Add fetch price handler** (after line 51, before `defaults` declaration):
```typescript
const handleFetchPrice = async () => {
  setIsFetchingPrice(true);
  setPriceFetchError(null);

  try {
    const price = await fetchCurrentPrice(jwt || '');
    form.setValue('lottoUsdPrice', price);
    console.log(`✅ Auto-filled LOTTO price: $${price}`);
  } catch (error: any) {
    console.error('Failed to fetch price:', error);
    setPriceFetchError(error.message || 'Failed to fetch price');
  } finally {
    setIsFetchingPrice(false);
  }
};
```

**Change 3: Update default values** (line 55-64):
```typescript
const form = useForm<ConfigSchemaType>({
  resolver: zodResolver(ConfigSchema),
  defaultValues: {
    tradeThresholdPercent: 50,
    prizeDistributionPercent: 70,
    blacklistedWallets: '',
    startDate: defaults.start,
    endDate: defaults.end,
    slippageTolerancePercent: 0.5,
    lottoUsdPrice: undefined, // 🆕 ADD THIS
  },
});
```

**Change 4: Import fetchCurrentPrice** (line 13):
```typescript
import { createConfig, fetchCurrentPrice } from '@/lib/api' // 🆕 ADD fetchCurrentPrice
```

**Change 5: Add price field in form** (after "Slippage Tolerance" field, around line 234):

```tsx
{/* LOTTO Price (USD) - NEW FIELD */}
<div className="grid items-start sm:items-center gap-2 sm:grid-cols-[200px,1fr] lg:grid-cols-[260px,1fr]">
  <Label htmlFor="lottoUsdPrice" className="text-slate-300 text-xs md:text-sm">
    LOTTO Price (USD)
  </Label>
  <div>
    <div className="flex gap-2">
      <Input
        id="lottoUsdPrice"
        className="flex-1 rounded-lg border border-primary/20 bg-night-800 px-2.5 py-1.5 text-[10px] md:text-[12px] text-white placeholder:text-slate-500"
        type="number"
        step="0.00000001"
        placeholder="0.00014104"
        {...form.register('lottoUsdPrice', { valueAsNumber: true })}
      />
      <Button
        type="button"
        onClick={handleFetchPrice}
        disabled={isFetchingPrice || !jwt}
        className="whitespace-nowrap rounded-lg bg-primary/20 px-3 py-1.5 text-[10px] md:text-[12px] font-semibold text-white hover:bg-primary/30 disabled:opacity-50"
      >
        {isFetchingPrice ? 'Fetching...' : 'Fetch Price'}
      </Button>
    </div>
    {form.formState.errors.lottoUsdPrice && (
      <p className="mt-1 text-red-400 text-xs sm:text-sm">
        {form.formState.errors.lottoUsdPrice.message}
      </p>
    )}
    {priceFetchError && (
      <p className="mt-1 text-red-400 text-xs sm:text-sm">
        {priceFetchError}
      </p>
    )}
    <p className="mt-1 text-slate-400 text-[10px]">
      Click "Fetch Price" to auto-fill from CoinGecko, or enter manually from{' '}
      <a
        href={`https://solscan.io/token/${process.env.NEXT_PUBLIC_TOKEN_MINT || ''}`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary hover:underline"
      >
        Solscan
      </a>
      .
    </p>
  </div>
</div>
```

**Change 6: Update form submission** (line 82, in `onSubmit` payload):
```typescript
const payload = {
  ...data,
  prizeDistributionPercent,
  prizeSourceWallet: publicKey.toBase58(),
  prizeSourceBalanceSol: balanceSol,
  lottoUsdPrice: data.lottoUsdPrice, // 🆕 ADD THIS
};
```

---

## PHASE 4: Testing & Validation (1 hour)

### Step 4.1: Unit Tests

**Create:** `apps/backend/tests/unit/price.service.test.ts` (NEW)

```typescript
import { PriceService } from '../../src/services/price.service';

describe('PriceService', () => {
  let priceService: PriceService;

  beforeEach(() => {
    priceService = new PriceService();
  });

  describe('validatePrice', () => {
    it('should accept valid prices', () => {
      expect(priceService.validatePrice(0.00014104).valid).toBe(true);
      expect(priceService.validatePrice(1).valid).toBe(true);
      expect(priceService.validatePrice(100).valid).toBe(true);
    });

    it('should reject negative prices', () => {
      const result = priceService.validatePrice(-1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('positive');
    });

    it('should reject zero price', () => {
      const result = priceService.validatePrice(0);
      expect(result.valid).toBe(false);
    });

    it('should reject unrealistic high prices', () => {
      const result = priceService.validatePrice(1001);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('unrealistic');
    });

    it('should reject prices too small', () => {
      const result = priceService.validatePrice(0.000000001);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too small');
    });
  });
});
```

---

### Step 4.2: Integration Test

**Update:** `apps/backend/tests/e2e/3-snapshot.test.ts`

**Add price to control config** (in test setup):
```typescript
const configPayload = {
  tokenMint: TEST_TOKEN_MINT,
  tokenDecimals: 6,
  snapshotStart: new Date(Date.now() + 1000).toISOString(),
  snapshotEnd: new Date(Date.now() + 10000).toISOString(),
  tradePercentage: 50,
  prizeDistributionPercent: 70,
  slippageTolerancePercent: 0.5,
  blacklist: [],
  prizeSourceWallet: operatorWallet,
  prizeSourceBalanceSol: 10.5,
  lottoUsdPrice: 0.00014104, // 🆕 ADD THIS
};
```

---

### Step 4.3: Manual Testing Checklist

**Test Case 1: Fetch Price Button**
- [ ] Click "Fetch Price" button
- [ ] Verify price is auto-filled (e.g., $0.00014104)
- [ ] Verify "Fetching..." loading state appears
- [ ] Verify success (price appears in input)

**Test Case 2: Manual Price Entry**
- [ ] Clear auto-filled price
- [ ] Manually type: 0.00015
- [ ] Submit form
- [ ] Verify config is saved with price

**Test Case 3: Price Validation**
- [ ] Enter negative price (-0.001) → Error shown
- [ ] Enter zero (0) → Error shown
- [ ] Enter huge price (2000) → Error shown
- [ ] Enter valid price (0.0001) → No error

**Test Case 4: Snapshot USD Calculation**
- [ ] Create config with price: $0.0001
- [ ] Run snapshot
- [ ] Check participant with 1,000,000 LOTTO
- [ ] Verify USD balance = $100 (1M × 0.0001)

**Test Case 5: Eligibility Filter**
- [ ] Set minUsdLottoRequired = 50
- [ ] Holder with 600,000 LOTTO × $0.0001 = $60 → Eligible ✅
- [ ] Holder with 400,000 LOTTO × $0.0001 = $40 → Ineligible ❌

**Test Case 6: CSV Export**
- [ ] Export snapshot CSV
- [ ] Check "Token USD Balance" column
- [ ] Verify values match: `Token LOTTO Balance End × Price`

**Test Case 7: Missing Price (Edge Case)**
- [ ] Create config WITHOUT entering price (skip field)
- [ ] Run snapshot
- [ ] Verify warning logged: "No LOTTO price configured"
- [ ] Verify USD balance = token balance (fallback)

**Test Case 8: API Error Handling**
- [ ] Disconnect internet
- [ ] Click "Fetch Price"
- [ ] Verify error message displayed
- [ ] Reconnect and retry → Success

---

## PHASE 5: Documentation Updates (30 minutes)

### Step 5.1: Update MAINNET_BLOCKERS.md

**File:** `MAINNET_BLOCKERS.md`

**Location:** Line 23-24 (Minimum Token Holdings section)

**Change:**
```markdown
#### 1. Minimum Token Holdings
- Wallet must hold **≥ $50 USD worth** of token at snapshot confirmation time
- ✅ **IMPLEMENTED:** Operator enters LOTTO price in Control Form
- Price stored in database and used for USD calculations during snapshot
- "Fetch Price" button auto-fills from CoinGecko API (free tier)
```

---

### Step 5.2: Update SCHEMA_AND_CSV_ALIGNMENT.md

**File:** `SCHEMA_AND_CSV_ALIGNMENT.md`

**Location:** Around line 391-393 (Outstanding Work section)

**Change:**
```markdown
### ✅ Implemented Features

- ✅ Real-time $LOTTO price from operator input or CoinGecko API
  - Operator enters price in Control Form (manual or auto-fetch)
  - Price stored in `LotteryConfig.lottoUsdPrice` field
  - Calculation: `tokenUsdBalance = tokenLottoBalanceEnd × lottoUsdPrice`
  - "Fetch Price" button uses CoinGecko API (free tier, 30 calls/min)
```

---

### Step 5.3: Create Operator Documentation

**Create:** `OPERATOR_GUIDE_PRICE_ENTRY.md` (NEW)

```markdown
# Operator Guide: LOTTO Price Entry

## Overview

When configuring a lottery round, you must enter the current LOTTO token price in USD. This price is used to calculate USD values for all token holders and enforce the $50 USD minimum eligibility requirement.

## How to Enter Price

### Option 1: Auto-Fetch (Recommended)

1. In the Control Form, find the "LOTTO Price (USD)" field
2. Click the **"Fetch Price"** button
3. Wait 1-2 seconds for the price to auto-fill
4. Review the price (should be around $0.00014104)
5. If price looks correct, proceed to submit
6. If price looks wrong, clear and try Option 2

### Option 2: Manual Entry

1. Go to [Solscan](https://solscan.io/token/HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump)
2. Find the current price (e.g., $0.00014104)
3. Copy the price value
4. Paste into "LOTTO Price (USD)" field
5. Submit the form

## Price Sources

### Primary: CoinGecko (via "Fetch Price" button)
- Updates every few minutes
- Free tier: 30 calls/minute
- Most convenient

### Secondary: Solscan (manual check)
- Real-time price from DEX pools
- Always up-to-date
- Use if auto-fetch fails

### Tertiary: Jupiter or Raydium DEX
- Direct from liquidity pools
- Most accurate
- Use for verification if needed

## Important Notes

⚠️ **Price Timing:** The price you enter is stored with the round configuration. Even if the price changes between round creation and snapshot, the original price will be used for USD calculations.

⚠️ **Price Accuracy:** Double-check the price before submitting. An incorrect price will result in inaccurate eligibility filtering (too many or too few eligible participants).

✅ **Audit Trail:** All prices are stored in the database with timestamps for future reference and auditing.

## Troubleshooting

**Q: "Fetch Price" button shows error**
- Check your internet connection
- Try refreshing the page
- Use manual entry instead

**Q: Price seems too high or too low**
- Cross-check with Solscan
- Verify you're looking at the correct token
- Contact support if unsure

**Q: What if I enter the wrong price?**
- You cannot edit after submission
- Create a new round with correct price
- Delete the incorrect round (if not yet started)

## Example

**Scenario:**
- Current LOTTO price: $0.00014104
- Minimum eligibility: $50 USD
- Calculation: 50 / 0.00014104 = 354,509 LOTTO required

**Holder Examples:**
- Holder with 500,000 LOTTO = $70.52 USD → ✅ ELIGIBLE
- Holder with 300,000 LOTTO = $42.31 USD → ❌ INELIGIBLE
```

---

## 🔍 Impact on Existing Features

### Features ENHANCED (Better functionality)

1. **Eligibility Filtering** ([snapshot.ts:146-167](apps/backend/src/routes/snapshot.ts:146-167))
   - **Before:** Used placeholder token balance as USD
   - **After:** Uses real USD value = balance × price
   - **Impact:** $50 minimum now works correctly ✅

2. **CSV Export** ([snapshot.ts:260-348](apps/backend/src/routes/snapshot.ts:260-348))
   - **Before:** "Token USD Balance" column had token balance
   - **After:** "Token USD Balance" column has real USD values
   - **Impact:** CSV now accurate for auditing ✅

3. **Participant Display** ([snapshot.ts:213-257](apps/backend/src/routes/snapshot.ts:213-257))
   - **Before:** `tokenUsdBalance` was placeholder
   - **After:** `tokenUsdBalance` is calculated correctly
   - **Impact:** API responses show real USD values ✅

### Features UNCHANGED (No impact)

1. **Tier Assignment** - Still based on token balance (not USD)
2. **Trading Activity** - Still based on balance changes
3. **Winner Selection** - Still based on tier rankings
4. **Prize Distribution** - Still in SOL (not affected by USD)
5. **Blacklisting** - Still based on wallet addresses

### Features DEPENDENT (Require this change)

1. **$50 USD Minimum Eligibility** - ❌ Blocked without price entry
2. **Accurate Reporting** - ❌ CSV/API show wrong values without price
3. **Mainnet Launch** - ❌ Cannot launch without this feature

---

## ⚠️ Risks & Mitigations

### Risk 1: Operator Forgets to Enter Price
**Impact:** USD values will be inaccurate (fallback to token balance)
**Mitigation:**
- Make field visually prominent with helper text
- Log warning in backend if price is missing
- Show warning in snapshot confirmation
- Consider making field required (not optional)

### Risk 2: Operator Enters Wrong Price
**Impact:** Eligibility filtering is incorrect
**Mitigation:**
- Add validation (positive, < $1000)
- Show confirmation dialog with calculated eligibility threshold
- Store price in database for audit trail
- Allow operator to verify on Solscan before submitting

### Risk 3: CoinGecko API Fails
**Impact:** "Fetch Price" button doesn't work
**Mitigation:**
- Allow manual entry as fallback
- Show error message with instructions
- Provide links to Solscan/Jupiter
- API has high uptime (99.9%+)

### Risk 4: Price Changes During Round
**Impact:** Price at snapshot time differs from config time
**Mitigation:**
- Document that price is captured at round creation
- This is acceptable - provides consistent reference point
- Alternative: Add "Update Price" feature (future enhancement)

### Risk 5: Migration Fails on Production
**Impact:** Cannot add `lottoUsdPrice` column
**Mitigation:**
- Test migration on staging first
- Field is nullable (non-breaking)
- Have rollback plan ready
- Run migration during maintenance window

---

## 📊 Database Schema Changes

### Before
```prisma
model LotteryConfig {
  id                       String       @id @default(uuid())
  tokenMint                String
  tokenDecimals            Int
  snapshotStart            DateTime
  snapshotEnd              DateTime
  drawTime                 DateTime?
  tradePercentage          Float
  status                   ConfigStatus @default(PENDING)
  minUsdLottoRequired      Float        @default(50.0)
  prizeDistributionPercent Float        @default(70.0)
  slippageTolerancePercent Float        @default(0.5)
  blacklist                Json         @default("[]")
  createdById              String
  createdAt                DateTime     @default(now())
  updatedAt                DateTime     @updatedAt
  User                     User         @relation(fields: [createdById], references: [id])
}
```

### After
```prisma
model LotteryConfig {
  id                       String       @id @default(uuid())
  tokenMint                String
  tokenDecimals            Int
  snapshotStart            DateTime
  snapshotEnd              DateTime
  drawTime                 DateTime?
  tradePercentage          Float
  status                   ConfigStatus @default(PENDING)
  minUsdLottoRequired      Float        @default(50.0)
  prizeDistributionPercent Float        @default(70.0)
  slippageTolerancePercent Float        @default(0.5)
  blacklist                Json         @default("[]")
  lottoUsdPrice            Float?       // 🆕 NEW FIELD
  createdById              String
  createdAt                DateTime     @default(now())
  updatedAt                DateTime     @updatedAt
  User                     User         @relation(fields: [createdById], references: [id])
}
```

**Changes:**
- 1 new field: `lottoUsdPrice Float?`
- Nullable to maintain backward compatibility
- No indexes needed (not queried frequently)

---

## 📝 Summary Checklist

### Pre-Implementation
- [ ] Review this entire plan
- [ ] Backup database before migration
- [ ] Test CoinGecko API access (already validated ✅)
- [ ] Assign developer(s) to tasks

### Phase 1: Database (30 min)
- [ ] Update `prisma/schema.prisma`
- [ ] Run `prisma migrate dev`
- [ ] Verify migration applied
- [ ] Run `prisma generate`

### Phase 2: Backend (1.5 hours)
- [ ] Create `services/price.service.ts`
- [ ] Create `routes/price.ts`
- [ ] Register price route in main app
- [ ] Update `routes/control.ts`
- [ ] Update `utils/zodSchemas.ts`
- [ ] Update `services/snapshot.service.ts`

### Phase 3: Frontend (2 hours)
- [ ] Update `lib/zodSchemas.ts`
- [ ] Update `lib/api.ts`
- [ ] Update `components/ControlForm.tsx`
- [ ] Test "Fetch Price" button
- [ ] Test manual entry

### Phase 4: Testing (1 hour)
- [ ] Write unit tests
- [ ] Update e2e tests
- [ ] Run all test cases manually
- [ ] Verify CSV export
- [ ] Verify eligibility filtering

### Phase 5: Documentation (30 min)
- [ ] Update `MAINNET_BLOCKERS.md`
- [ ] Update `SCHEMA_AND_CSV_ALIGNMENT.md`
- [ ] Create operator guide
- [ ] Update README if needed

### Post-Implementation
- [ ] Deploy to staging
- [ ] Test on staging with real token
- [ ] Deploy to production
- [ ] Monitor first production use
- [ ] Gather operator feedback

---

## 🎯 Expected Outcomes

After implementing this plan:

✅ **Operator Experience:**
- One-click price fetching from CoinGecko
- Manual entry option for verification
- Clear validation and error messages
- Helpful links to Solscan

✅ **System Behavior:**
- Accurate USD values for all holders
- Correct $50 USD eligibility filtering
- Proper audit trail in database
- Accurate CSV exports

✅ **Mainnet Readiness:**
- Unblocks MAINNET_BLOCKER #1 (Minimum Token Holdings)
- Production-ready eligibility system
- Transparent and auditable pricing

---

**Total Estimated Time:** 4-6 hours
**Total Cost:** $0 (vs $199/month for Solscan Pro)
**Complexity:** Medium
**Risk Level:** Low (nullable field, well-tested APIs)

---

**Ready for Implementation:** ✅ YES
**Approval Required:** Developer + Product Lead
**Target Completion:** 1 day sprint
