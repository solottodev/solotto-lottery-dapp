# Fallback Price Conversion Options - Comparison Analysis

**Date:** October 23, 2025
**Context:** If Solscan API tests fail, we need a fallback method to convert Token LOTTO Balance → USD Balance
**Status:** ANALYSIS - For decision making if Solscan integration doesn't work

---

## 🎯 The Problem

If we continue using **Alchemy** (or RPC) to get wallet addresses and token balances, we still need to convert the token balance to USD for the **≥$50 USD minimum eligibility requirement**.

**Current State:**
- ✅ Alchemy provides: `wallet address`, `token LOTTO balance`
- ❌ Alchemy does NOT provide: `USD value`

**We need to add the USD conversion ourselves.**

---

## 📊 Two Fallback Options

### **Option 1: Manual Price Entry (Operator Input)**
Allow the operator to enter the current LOTTO → USD price in the Control Form at round creation time.

### **Option 2: Hardcoded Conversion Rate**
Store a fixed conversion rate in the codebase/config that's used for all snapshots.

---

## 🔍 Detailed Analysis

---

## **OPTION 1: Manual Price Entry in Control Form**

### Implementation Overview

Add a new field to the Control Form where the operator manually enters the current LOTTO price in USD.

#### Frontend Changes ([ControlForm.tsx](apps/frontend/components/ControlForm.tsx))

**Add new field after "Slippage Tolerance":**

```tsx
{/* LOTTO Price (USD) - NEW FIELD */}
<div className="grid items-start sm:items-center gap-2 sm:grid-cols-[200px,1fr] lg:grid-cols-[260px,1fr]">
  <Label htmlFor="lottoUsdPrice" className="text-slate-300 text-xs md:text-sm">
    LOTTO Price (USD)
  </Label>
  <div>
    <Input
      id="lottoUsdPrice"
      className="w-full rounded-lg border border-primary/20 bg-night-800 px-2.5 py-1.5 text-[10px] md:text-[12px] text-white placeholder:text-slate-500"
      type="number"
      step="0.00000001"
      placeholder="0.00001420"
      {...form.register('lottoUsdPrice', { valueAsNumber: true })}
    />
    {form.formState.errors.lottoUsdPrice && (
      <p className="mt-1 text-red-400 text-xs sm:text-sm">
        {form.formState.errors.lottoUsdPrice.message}
      </p>
    )}
    <p className="mt-1 text-slate-400 text-[10px]">
      Current LOTTO price in USD. Check Solscan or DEX for latest price.
    </p>
  </div>
</div>
```

#### Schema Changes

**Update [zodSchemas](apps/frontend/lib/zodSchemas.ts) and [backend zodSchemas](apps/backend/src/utils/zodSchemas.ts):**

```typescript
export const ConfigSchema = z.object({
  // ... existing fields
  lottoUsdPrice: z
    .number()
    .positive('LOTTO price must be positive')
    .max(1000, 'LOTTO price seems unrealistic (>$1000)')
    .optional() // Optional for backward compatibility
});
```

#### Database Changes ([schema.prisma](apps/backend/prisma/schema.prisma))

**Add field to LotteryConfig model:**

```prisma
model LotteryConfig {
  // ... existing fields
  lottoUsdPrice        Float?  // Price of LOTTO in USD at round creation
}
```

**Migration required:** `npx prisma migrate dev --name add_lotto_usd_price`

#### Backend Changes ([control.ts](apps/backend/src/routes/control.ts:211))

**Store the price in the config:**

```typescript
const config = await prisma.lotteryConfig.create({
  data: {
    // ... existing fields
    lottoUsdPrice: parsed.data.lottoUsdPrice ?? null,
  },
});
```

#### Snapshot Service Changes ([snapshot.service.ts](apps/backend/src/services/snapshot.service.ts:184))

**Use the stored price to calculate USD values:**

```typescript
// In assignTiers() method
private assignTiers(
  holders: TokenHolder[],
  lottoUsdPrice: number | null
): SnapshotParticipant[] {
  // ... existing tier logic

  const participants: SnapshotParticipant[] = sorted.map((holder, index) => {
    // ... tier assignment

    const tokenLottoBalanceEnd = holder.balanceUi;

    // ✅ Calculate USD value using operator-provided price
    const tokenUsdBalance = lottoUsdPrice
      ? tokenLottoBalanceEnd * lottoUsdPrice
      : tokenLottoBalanceEnd; // Fallback to token balance if no price

    return {
      wallet: holder.owner,
      tokenLottoBalanceStart: holder.balanceUi, // Will be updated by trading service
      tokenLottoBalanceEnd,
      tokenUsdBalance,
      tier,
    };
  });

  return participants;
}
```

**Update createSnapshot() to fetch and pass the price:**

```typescript
async createSnapshot(
  roundId: string,
  mintAddress: string,
  configBlacklist: string[] = []
): Promise<SnapshotResult> {
  // ... existing code

  // Fetch the lottery config to get the LOTTO price
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
    console.warn('⚠️  No LOTTO price configured - USD values will be inaccurate');
  } else {
    console.log(`💵 Using LOTTO price: $${lottoUsdPrice} USD`);
  }

  // ... fetch holders

  // Assign tiers with price
  let participants = this.assignTiers(holders, lottoUsdPrice);

  // ... rest of the method
}
```

---

### ✅ Pros of Manual Price Entry

1. **Full operator control** - Operator chooses which price source to trust
2. **Flexibility** - Can use Solscan, Jupiter, CoinGecko, or any DEX price
3. **Transparency** - Operator knows exactly what price is being used
4. **Audit trail** - Price is stored in database with the round
5. **No external API dependencies** - Works offline if needed
6. **Can be updated** - If initial price is wrong, operator can recreate the config
7. **Low complexity** - Simple implementation, no API integration needed
8. **Zero cost** - No API fees

---

### ❌ Cons of Manual Price Entry

1. **Manual effort required** - Operator must check price before each round
2. **Human error risk** - Operator could enter wrong price (typo, wrong decimal, etc.)
3. **No validation** - Hard to verify if entered price is accurate
4. **Snapshot timing issue** - Price at round creation may differ from price at snapshot time
5. **Potential disputes** - Participants may argue the wrong price was used
6. **Not real-time** - Price is static from round creation, doesn't update
7. **User experience** - Adds friction to the Control Form workflow
8. **Responsibility burden** - Operator is solely responsible for price accuracy

---

### 🎯 Best Practices for Manual Entry

If this option is chosen, implement these safeguards:

1. **Price validation** - Add min/max bounds (e.g., $0.000001 to $1000)
2. **Confirmation dialog** - Show "You entered $X USD - is this correct?"
3. **Price source links** - Provide links to Solscan, Jupiter, etc. in the form
4. **Snapshot time warning** - Warn that price may change between config and snapshot
5. **Price history** - Display previous round prices for reference
6. **Sanity check** - Compare entered price to recent historical average
7. **Documentation** - Clear instructions on where to find accurate price

---

## **OPTION 2: Hardcoded Conversion Rate**

### Implementation Overview

Store a fixed LOTTO → USD conversion rate in environment variables or config file.

#### Environment Variable Approach

**Add to [.env](apps/backend/.env):**

```bash
# Hardcoded LOTTO price for USD conversion
# WARNING: This is a static value and will not reflect market changes
LOTTO_USD_PRICE="0.00001420"
```

**Add to [.env.example](apps/backend/.env.example):**

```bash
# LOTTO Price (USD) - Hardcoded conversion rate
# Update this value when LOTTO price changes significantly
# Default: $0.00001420 (example value)
LOTTO_USD_PRICE="0.00001420"
```

#### Snapshot Service Changes

**Read from environment and apply:**

```typescript
// In snapshot.service.ts
private getHardcodedLottoPrice(): number {
  const priceStr = process.env.LOTTO_USD_PRICE;

  if (!priceStr) {
    console.warn('⚠️  LOTTO_USD_PRICE not configured - using fallback of 1:1');
    return 1.0; // Fallback: treat 1 LOTTO = $1 USD (clearly wrong, but safe)
  }

  const price = parseFloat(priceStr);

  if (isNaN(price) || price <= 0) {
    console.error('❌ Invalid LOTTO_USD_PRICE in .env - using fallback');
    return 1.0;
  }

  console.log(`💵 Using hardcoded LOTTO price: $${price} USD (from .env)`);
  return price;
}

// Use in assignTiers()
const tokenUsdBalance = holder.balanceUi * this.getHardcodedLottoPrice();
```

#### Alternative: Config File Approach

**Create [price-config.json](apps/backend/config/price-config.json):**

```json
{
  "lottoUsdPrice": 0.00001420,
  "lastUpdated": "2025-10-23T00:00:00Z",
  "source": "Solscan",
  "notes": "Update this file when LOTTO price changes significantly"
}
```

**Read in snapshot service:**

```typescript
import priceConfig from '../config/price-config.json';

const tokenUsdBalance = holder.balanceUi * priceConfig.lottoUsdPrice;
```

---

### ✅ Pros of Hardcoded Conversion Rate

1. **Zero operator effort** - No manual entry needed per round
2. **No human error** - Once set correctly, always uses same value
3. **Simple implementation** - Just read from env/config file
4. **Fast** - No API calls, no user input validation
5. **Predictable** - Same conversion rate every time
6. **No external dependencies** - Works completely offline
7. **Zero cost** - No API fees
8. **Easy to audit** - Single source of truth in one file

---

### ❌ Cons of Hardcoded Conversion Rate

1. **Static/stale price** - Doesn't reflect real market changes
2. **Inaccurate over time** - LOTTO price will fluctuate, hardcoded value won't
3. **Manual updates required** - Developer must update .env when price changes
4. **No price history** - Can't see when/why price was updated
5. **Deployment friction** - Requires code/config change + redeploy to update price
6. **Potential unfairness** - Using outdated price harms participants
7. **Disconnect from reality** - May not match any actual market price
8. **No flexibility** - Can't adjust per round without code change
9. **Hidden from operator** - Operator may not know what price is being used
10. **Regulatory risk** - Using incorrect prices could be seen as misleading

---

### 🎯 Best Practices for Hardcoded Rate

If this option is chosen, implement these safeguards:

1. **Clear documentation** - Comment in .env explaining this is a static value
2. **Price staleness warning** - Log warning if price is >7 days old
3. **Admin dashboard** - Show current hardcoded price in UI
4. **Price update workflow** - Document how/when to update the value
5. **Monitoring** - Alert if hardcoded price deviates >50% from market
6. **Changelog** - Track when and why price was updated
7. **User disclosure** - Inform participants that a fixed price is used

---

## 📊 Side-by-Side Comparison

| Aspect | Manual Price Entry | Hardcoded Conversion |
|--------|-------------------|----------------------|
| **Operator effort per round** | High (must check and enter) | Zero (automatic) |
| **Price accuracy** | Moderate (depends on operator) | Low (static value) |
| **Real-time price** | Snapshot-time price possible | Never real-time |
| **Implementation complexity** | Medium (UI + DB changes) | Low (just env/config) |
| **Human error risk** | High (typos, wrong source) | Low (once set correctly) |
| **Audit trail** | Yes (stored in DB per round) | No (single env value) |
| **External dependencies** | None (operator is the source) | None |
| **Flexibility** | High (can change per round) | Low (requires redeploy) |
| **Transparency** | High (visible in form) | Low (hidden in .env) |
| **Maintenance burden** | Operator (per round) | Developer (when price changes) |
| **Cost** | $0 | $0 |
| **Scalability** | Good (works for any round) | Poor (manual updates) |
| **Fairness** | Good (operator chooses latest) | Poor (stale price) |
| **User trust** | Moderate (depends on operator) | Low (no visibility) |
| **Development time** | 4-6 hours | 1-2 hours |
| **Testing needed** | Moderate | Low |
| **Documentation needed** | High | Medium |

---

## 🎯 Recommendation: **Option 1 (Manual Price Entry)** is Better

### Why Manual Entry Wins

1. **More accurate** - Operator can check current price at snapshot time
2. **Transparent** - Everyone knows what price was used
3. **Flexible** - Can adapt to market conditions per round
4. **Auditable** - Price stored in database with round data
5. **Fair** - Participants can verify the price was correct
6. **Better UX** - Clear what's happening vs hidden .env value

### When Hardcoded Might Be Acceptable

Only use hardcoded conversion if:
- LOTTO price is extremely stable (doesn't change much)
- You plan to update it frequently (weekly/daily)
- You have automated price monitoring alerts
- You're willing to redeploy when price changes >10%

**But even then, manual entry is still better.**

---

## 🛠️ Recommended Implementation: Manual Price Entry + Price Helper

### Enhanced Option 1: Add Price Lookup Helper

To reduce operator burden, add a **"Fetch Current Price"** button in the Control Form:

```tsx
{/* LOTTO Price (USD) with Helper */}
<div className="grid items-start sm:items-center gap-2 sm:grid-cols-[200px,1fr] lg:grid-cols-[260px,1fr]">
  <Label htmlFor="lottoUsdPrice" className="text-slate-300 text-xs md:text-sm">
    LOTTO Price (USD)
  </Label>
  <div className="flex gap-2">
    <Input
      id="lottoUsdPrice"
      type="number"
      step="0.00000001"
      {...form.register('lottoUsdPrice', { valueAsNumber: true })}
    />
    <Button
      type="button"
      onClick={async () => {
        // Call backend endpoint that fetches current price from Jupiter/Solscan
        const price = await fetchCurrentLottoPrice();
        form.setValue('lottoUsdPrice', price);
      }}
      className="whitespace-nowrap"
    >
      Fetch Price
    </Button>
  </div>
  <p className="text-slate-400 text-[10px]">
    Click "Fetch Price" to auto-fill from Jupiter, or enter manually from Solscan.
  </p>
</div>
```

**Backend helper endpoint:**

```typescript
// apps/backend/src/routes/price.ts
router.get('/current', requireJwt, async (req, res) => {
  try {
    // Option A: Use Jupiter price API
    const jupiterPrice = await getJupiterLottoPrice();

    // Option B: Parse Solscan HTML (if no API)
    // const solscanPrice = await scrapeSolscanPrice();

    return res.json({
      price: jupiterPrice,
      source: 'Jupiter',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch price' });
  }
});
```

### Benefits of This Hybrid Approach

✅ **Best of both worlds:**
- Operator can auto-fetch price (reduces effort)
- Operator can manually override if needed (maintains control)
- Operator sees and confirms the price (transparency)
- Price is stored in database (audit trail)
- No hardcoded values (flexibility)

---

## 🚀 Implementation Checklist (If Solscan Tests Fail)

### Phase 1: Decision
- [ ] Test Solscan API with provided API key
- [ ] If Solscan works: Implement Solscan integration (see [SOLSCAN_USD_VALUE_INTEGRATION.md](SOLSCAN_USD_VALUE_INTEGRATION.md))
- [ ] If Solscan fails: Choose fallback option (Manual Entry recommended)

### Phase 2: Implementation (Manual Price Entry)
- [ ] Update frontend schema (ConfigSchema) to include `lottoUsdPrice`
- [ ] Update backend schema (lotteryConfigSchema)
- [ ] Add database migration for `lottoUsdPrice` field
- [ ] Update ControlForm.tsx with new price input field
- [ ] Update control.ts to store `lottoUsdPrice`
- [ ] Update snapshot.service.ts to use stored price
- [ ] (Optional) Add "Fetch Price" helper button + endpoint
- [ ] Add validation (min/max price bounds)
- [ ] Add confirmation dialog showing entered price
- [ ] Test end-to-end with various price values

### Phase 3: Testing
- [ ] Test with realistic LOTTO price (~$0.00001)
- [ ] Test with zero price (should reject)
- [ ] Test with negative price (should reject)
- [ ] Test with extremely high price (should warn)
- [ ] Test USD calculation: 100,000 LOTTO × $0.00001 = $1 USD
- [ ] Test $50 USD minimum: Need 5,000,000 LOTTO at $0.00001
- [ ] Verify CSV export shows correct USD values

### Phase 4: Documentation
- [ ] Update operator documentation with price entry instructions
- [ ] Document where to find current LOTTO price (Solscan, Jupiter, etc.)
- [ ] Add example: "If LOTTO is $0.00001420 on Solscan, enter 0.00001420"
- [ ] Warn about timing: "Price may change between config and snapshot"
- [ ] Add FAQ: "What if I enter the wrong price?"

---

## 📝 Alternative: Hybrid Approach (Best of All Options)

**Use Solscan as PRIMARY, Manual Entry as FALLBACK:**

```typescript
async createSnapshot(roundId: string, mintAddress: string) {
  try {
    // PRIMARY: Try Solscan API (includes USD values)
    const solscanService = getSolscanService();
    const holders = await solscanService.getTokenHoldersWithUSD(mintAddress);
    console.log('✅ Using Solscan USD values');
    return this.processSnapshot(holders);
  } catch (solscanError) {
    console.warn('⚠️  Solscan failed, falling back to manual price...');

    // FALLBACK: Use Alchemy + manual price from config
    const holders = await this.getTokenHoldersViaAlchemy(mintAddress);
    const lottoUsdPrice = await this.getManualPriceFromConfig(roundId);

    if (!lottoUsdPrice) {
      throw new Error('Solscan unavailable and no manual price configured');
    }

    // Calculate USD values manually
    const holdersWithUSD = holders.map(h => ({
      ...h,
      usdValue: h.balanceUi * lottoUsdPrice
    }));

    console.log(`✅ Using manual price: $${lottoUsdPrice} USD`);
    return this.processSnapshot(holdersWithUSD);
  }
}
```

**This gives you:**
- ✅ Automatic USD values when Solscan works
- ✅ Manual fallback when Solscan is down
- ✅ Maximum reliability and flexibility

---

## 🎯 Final Recommendation Summary

**Ranked by preference:**

1. **BEST:** Solscan API (test first with API key)
2. **GOOD:** Solscan + Manual Entry fallback (hybrid)
3. **ACCEPTABLE:** Manual Price Entry only
4. **AVOID:** Hardcoded conversion rate

**Proceed with Solscan API testing, and implement Manual Price Entry as backup if tests fail.**

---

**Last Updated:** October 23, 2025
**Next Steps:**
1. Test Solscan API with provided API key
2. If successful: Implement Solscan integration
3. If unsuccessful: Implement Manual Price Entry fallback
