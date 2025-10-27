# Solscan USD Value Integration - Feasibility Analysis & Implementation Brainstorming

**Date:** October 23, 2025
**Status:** BRAINSTORMING - NOT YET IMPLEMENTED
**Priority:** CRITICAL - Required for $50 USD minimum balance eligibility

---

## 🎯 Problem Statement

Currently, the `tokenUsdBalance` field in the snapshot system is a **placeholder** that simply stores the token balance amount instead of the actual USD value. This breaks the $50 USD minimum balance eligibility requirement for lottery participation.

**Current Issue Location:** `apps/backend/src/services/snapshot.service.ts:184`
```typescript
const tokenUsdBalance = holder.balanceUi; // ❌ WRONG - Just uses token balance as placeholder
```

**Eligibility Requirement:** Wallets must hold ≥ $50 USD worth of $LOTTO tokens at snapshot time (per [MAINNET_BLOCKERS.md](MAINNET_BLOCKERS.md:24))

---

## 💡 Proposed Solution: Pull USD Values Directly from Solscan

Instead of manually converting LOTTO → USD using price oracles, **pull the pre-calculated USD values directly from Solscan** (as shown in the screenshot at https://solscan.io/token/HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump#holders).

### Why This Approach?

1. **Solscan already calculates USD values** - The "Value" column shows dollar amounts for each holder
2. **No need for separate price oracle** - Saves complexity and potential price discrepancies
3. **Same data source as UI** - What users see on Solscan matches what we use for eligibility
4. **Reduced API dependencies** - One service instead of token holders + price feed

---

## 🔍 Research Findings

### ✅ Solscan Pro API - Token Holders Endpoint (v2.0)

**Endpoint:** `GET https://pro-api.solscan.io/v2.0/token/holders`

**Documentation:** https://pro-api.solscan.io/pro-api-docs/v2.0/reference/v2-token-holders

**FREE TIER LIMITS:**
- **10,000,000 API calls/month** (far more than you'll ever need!)
- **1,000 requests per 60 seconds**
- **Requires attribution** (link to Solscan in your app)
- **No credit card required** for free tier

#### Request Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `address` | string | ✅ Yes | Token mint address (e.g., `HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump`) |
| `page` | number | No | Pagination page number (default: 1) |
| `page_size` | number | No | Items per page (10, 20, 30, or 40) |
| `from_amount` | string | No | Minimum holding amount filter |
| `to_amount` | string | No | Maximum holding amount filter |

#### Response Structure
```json
{
  "success": true,
  "data": {
    "total": 216,
    "items": [
      {
        "address": "...",          // Token account address
        "owner": "...",            // Owner wallet address
        "amount": "154723624.413927", // Token quantity
        "decimals": 6,             // Token decimals
        "rank": 1,                 // Holder ranking (1 = largest)
        "value": 22156.3,          // 🎯 USD VALUE (pre-calculated!)
        "percentage": 15.87        // % of total supply
      },
      // ... more holders
    ]
  }
}
```

#### ✅ KEY FINDING: The `value` field contains the USD value!

This is exactly what we need - Solscan calculates and returns the USD value for each holder's token balance.

**This REPLACES your current Alchemy integration** for the snapshot use case, giving you:
- ✅ Owner wallet address (same as Alchemy)
- ✅ Token LOTTO balance (same as Alchemy)
- ✅ USD value (NEW - not available from Alchemy!)

All in **one API call per page** (13 total calls for your 511 holders).

---

## 📊 Implementation Approaches

### **Option A: Use Solscan Pro API** (RECOMMENDED)

#### Pros ✅
- **Direct USD values** - No conversion math needed
- **Official API** - Stable, documented, supported
- **Structured data** - Clean JSON response
- **Pagination support** - Can handle tokens with many holders
- **Filtering options** - Can filter by amount thresholds
- **Rate limits** - Predictable and manageable
- **Same source as UI** - Consistent with what users see on Solscan

#### Cons ❌
- **API Key Required** - Need to sign up for Solscan Pro API (https://solscan.io/apis)
- **Paid Service** - May require paid plan depending on usage limits
- **External Dependency** - Relies on Solscan service availability
- **Rate Limits** - Need to manage rate limiting (429 errors)
- **Cost** - Pricing unknown without checking their plans

#### Implementation Strategy
1. Sign up for Solscan Pro API
2. Create new service: `apps/backend/src/services/solscan.service.ts`
3. Implement token holders fetching with USD values
4. Replace current Alchemy/RPC fallback in `snapshot.service.ts`
5. Store API key in `.env`

#### Example Implementation
```typescript
// apps/backend/src/services/solscan.service.ts
import axios from 'axios';

interface SolscanHolder {
  address: string;    // Token account
  owner: string;      // Wallet address
  amount: string;     // Token amount
  decimals: number;
  rank: number;
  value: number;      // 🎯 USD VALUE!
  percentage: number;
}

interface SolscanHoldersResponse {
  success: boolean;
  data: {
    total: number;
    items: SolscanHolder[];
  };
}

export class SolscanService {
  private apiKey: string;
  private baseUrl = 'https://pro-api.solscan.io/v2.0';

  constructor() {
    this.apiKey = process.env.SOLSCAN_API_KEY || '';
    if (!this.apiKey) {
      throw new Error('SOLSCAN_API_KEY not configured');
    }
  }

  /**
   * Get token holders with USD values from Solscan
   */
  async getTokenHoldersWithUSD(
    mintAddress: string,
    pageSize: number = 40
  ): Promise<TokenHolder[]> {
    const holders: TokenHolder[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const response = await axios.get<SolscanHoldersResponse>(
        `${this.baseUrl}/token/holders`,
        {
          params: {
            address: mintAddress,
            page,
            page_size: pageSize,
          },
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
          },
        }
      );

      if (!response.data.success) {
        throw new Error('Solscan API request failed');
      }

      const items = response.data.data.items;

      // Convert to internal TokenHolder format
      holders.push(...items.map(item => ({
        owner: item.owner,
        balance: BigInt(parseFloat(item.amount) * Math.pow(10, item.decimals)),
        balanceUi: parseFloat(item.amount),
        tokenAccount: item.address,
        usdValue: item.value, // 🎯 THE KEY FIELD!
      })));

      // Check if there are more pages
      hasMore = items.length === pageSize;
      page++;

      // Rate limiting: wait between requests
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
      }
    }

    console.log(`✅ Retrieved ${holders.length} holders with USD values from Solscan`);
    return holders;
  }

  /**
   * Filter holders by minimum USD value
   */
  filterByMinUSD(holders: TokenHolder[], minUSD: number): TokenHolder[] {
    return holders.filter(h => (h.usdValue ?? 0) >= minUSD);
  }
}
```

#### Integration with Snapshot Service
```typescript
// Update apps/backend/src/services/snapshot.service.ts
async getTokenHolders(mintAddress: string): Promise<TokenHolder[]> {
  console.log(`📸 Fetching token holders for mint: ${mintAddress}`);

  try {
    // Try Solscan first (includes USD values!)
    const solscanService = getSolscanService();
    const holders = await solscanService.getTokenHoldersWithUSD(mintAddress);
    console.log(`✅ Retrieved ${holders.length} holders with USD values via Solscan`);
    return holders;
  } catch (solscanError) {
    console.warn('⚠️  Solscan failed, falling back to Alchemy...');

    // Fallback to existing Alchemy/RPC approach
    // BUT: Will need separate price lookup for USD values
    return await this.getTokenHoldersViaAlchemy(mintAddress);
  }
}
```

#### Environment Configuration
```bash
# .env
SOLSCAN_API_KEY="your_solscan_pro_api_key_here"
```

---

### **Option B: Web Scraping Solscan Website**

#### Pros ✅
- **No API key required** - Free to use
- **No rate limits** (initially) - Can scrape as needed
- **Same data as API** - Gets the exact UI data

#### Cons ❌
- **Fragile** - Breaks if Solscan changes HTML/CSS
- **Rate limiting risk** - May get IP banned
- **Slower** - Browser automation is resource-intensive
- **Unethical/违反 TOS** - May violate Solscan's terms of service
- **Complex** - Requires Puppeteer/Playwright setup
- **Not production-ready** - Unreliable for mainnet

#### Verdict: ❌ NOT RECOMMENDED for production

Web scraping should only be considered for:
- Proof of concept / testing
- One-time data exports
- Development environments

**Do NOT use for mainnet production system.**

---

### **Option C: Hybrid Approach (Solscan API + Price Oracle Fallback)**

#### Strategy
1. **Primary:** Use Solscan Pro API for holders + USD values
2. **Fallback:** If Solscan fails, use Alchemy + Jupiter price oracle

#### Pros ✅
- **Best of both worlds** - Reliable with fallback
- **Redundancy** - Service continues if Solscan is down
- **Flexibility** - Can switch between data sources

#### Cons ❌
- **Most complex** - Need to maintain two approaches
- **Higher cost** - May pay for multiple APIs
- **Potential discrepancies** - Different sources may have different prices

#### Implementation Sketch
```typescript
async getTokenHoldersWithUSD(mintAddress: string): Promise<TokenHolder[]> {
  try {
    // Try Solscan first
    return await solscanService.getTokenHoldersWithUSD(mintAddress);
  } catch (error) {
    console.warn('Solscan failed, using Alchemy + Jupiter fallback...');

    // Fallback: Get holders from Alchemy
    const holders = await alchemyClient.getTokenHolders(mintAddress);

    // Get current LOTTO price from Jupiter
    const priceService = getPriceService();
    const lottoPrice = await priceService.getLottoUsdPrice();

    // Calculate USD values manually
    return holders.map(h => ({
      ...h,
      usdValue: h.balanceUi * lottoPrice,
    }));
  }
}
```

---

### **Option D: Official CSV Export from Solscan**

#### Method
1. Navigate to https://solscan.io/token/[MINT_ADDRESS]#holders
2. Click "Export CSV" button in the Holders tab
3. Parse CSV file to extract wallet addresses and USD values

#### Pros ✅
- **Free** - No API key required
- **Official feature** - Supported by Solscan
- **Includes USD values** - Has the "Value" column

#### Cons ❌
- **Manual process** - Requires human intervention
- **Not automated** - Can't be integrated into snapshot workflow
- **Not scalable** - Doesn't work for automated lottery system
- **Rate limits** - May be limited to prevent abuse

#### Verdict: ❌ NOT VIABLE for automated system

Only useful for:
- Manual audits
- One-time analysis
- Development/testing

---

## 🎯 Recommended Approach: Option A (Solscan Pro API)

### Why?

1. **Solves the core problem** - Provides USD values directly
2. **Production-ready** - Official API with support
3. **Simplest integration** - Replace one API call with another
4. **Most reliable** - No price conversion logic to debug
5. **User-friendly** - Values match what users see on Solscan

### Next Steps

1. ✅ **Research Solscan API pricing** - Check if free tier is sufficient
2. ✅ **Sign up for API key** - Register at https://solscan.io/apis
3. ✅ **Test API integration** - Verify USD values are accurate
4. ✅ **Implement SolscanService** - Create new service file
5. ✅ **Update SnapshotService** - Replace Alchemy with Solscan
6. ✅ **Add to .env** - Configure API key
7. ✅ **Test end-to-end** - Verify $50 USD eligibility works
8. ✅ **Update documentation** - Add Solscan to integration docs

---

## ⚠️ Potential Issues & Mitigations

### Issue 1: Solscan API Rate Limits

**Risk:** API may rate limit during snapshot of tokens with many holders (e.g., 1000+ holders = 25+ API calls at 40/page)

**Mitigation:**
- Add rate limiting delays between pagination requests
- Cache snapshot data (don't re-fetch within same round)
- Monitor rate limit headers and implement exponential backoff
- Consider paid tier if free tier is insufficient

### Issue 2: Solscan API Pricing

**Risk:** May be too expensive for project budget

**Mitigation:**
- Check free tier limits first
- Calculate expected API usage (snapshots per day × holders per snapshot)
- Compare cost vs. building custom price oracle
- Consider hybrid approach with fallback to price oracle

### Issue 3: USD Value Accuracy

**Risk:** Solscan's USD calculation may differ from other sources

**Mitigation:**
- Validate Solscan prices against Jupiter/CoinGecko
- Document which price source is used for eligibility
- Add price at snapshot time to database for audit trail
- Allow manual price override in extreme cases

### Issue 4: Service Availability

**Risk:** Solscan API may have downtime during critical snapshot

**Mitigation:**
- Implement retry logic with exponential backoff
- Add fallback to Alchemy + price oracle (Option C)
- Monitor Solscan API health before snapshot
- Alert operator if API is unavailable

### Issue 5: Token Not Listed on Solscan

**Risk:** New tokens may not have price data on Solscan

**Mitigation:**
- Check if token has price data before snapshot
- Fallback to Jupiter price API if Solscan has no price
- Document minimum requirements (token must be tradeable)

---

## 📝 Implementation Checklist

### Phase 1: Research & Planning
- [ ] Check Solscan API pricing tiers
- [ ] Sign up for Solscan Pro API account
- [ ] Test API with LOTTO token mint address
- [ ] Verify USD values match website
- [ ] Document rate limits and pricing

### Phase 2: Development
- [ ] Create `apps/backend/src/services/solscan.service.ts`
- [ ] Implement `getTokenHoldersWithUSD()` method
- [ ] Add pagination support
- [ ] Add rate limiting delays
- [ ] Add error handling and retries
- [ ] Update `apps/backend/src/services/snapshot.service.ts` to use Solscan
- [ ] Update `TokenHolder` interface to include `usdValue` field
- [ ] Add `SOLSCAN_API_KEY` to `.env.example`

### Phase 3: Testing
- [ ] Test with LOTTO token on mainnet
- [ ] Test with tokens that have 100+ holders
- [ ] Test pagination (verify all holders fetched)
- [ ] Test rate limiting behavior
- [ ] Test $50 USD eligibility filter
- [ ] Compare USD values with Solscan website
- [ ] Test API error scenarios (invalid key, rate limit, etc.)

### Phase 4: Integration
- [ ] Update snapshot confirmation to use real USD values
- [ ] Test end-to-end snapshot workflow
- [ ] Verify CSV export includes correct USD values
- [ ] Update documentation
- [ ] Add monitoring/alerts for API failures

### Phase 5: Deployment
- [ ] Add Solscan API key to production `.env`
- [ ] Deploy to staging environment
- [ ] Run test snapshot on staging
- [ ] Verify eligibility calculations
- [ ] Deploy to production
- [ ] Monitor first production snapshot

---

## 🔗 Related Documentation

- **Mainnet Blockers:** [MAINNET_BLOCKERS.md](MAINNET_BLOCKERS.md) - Lists USD balance as critical requirement
- **Trading Activity:** [TRADING_ACTIVITY_IMPLEMENTATION.md](TRADING_ACTIVITY_IMPLEMENTATION.md) - Eligibility calculation logic
- **Schema Alignment:** [SCHEMA_AND_CSV_ALIGNMENT.md](SCHEMA_AND_CSV_ALIGNMENT.md) - Documents tokenUsdBalance field
- **Snapshot Service:** [apps/backend/src/services/snapshot.service.ts](apps/backend/src/services/snapshot.service.ts:184) - Current placeholder implementation

---

## 📊 Alternative: Keep Current Approach (Not Recommended)

If Solscan integration is not feasible, we would need to:

1. Implement a **price oracle service** (Jupiter, CoinGecko, or Raydium)
2. Fetch current LOTTO/USD price at snapshot time
3. Calculate `tokenUsdBalance = tokenLottoBalanceEnd × priceUsd`
4. Cache price at snapshot for audit trail

**Why this is worse:**
- More complexity (two APIs instead of one)
- Potential price discrepancies between sources
- Need to choose which price source is "official"
- More points of failure
- Doesn't match what users see on Solscan

---

## 💰 Cost Estimation

### Actual Current Usage (Updated)
- 4 lottery rounds per month
- **511 token holders** (current LOTTO holders - UPDATED FROM 216)
- 40 holders per page = **13 API calls per snapshot**
- 13 calls × 4 rounds = **52 API calls/month**

### Solscan Free Tier Limits
- **✅ FREE TIER IS SUFFICIENT!**
- **10,000,000 calls/month** limit
- **1,000 requests per 60 seconds** rate limit
- **Your usage: 52 calls/month = 0.00052% of monthly limit**

### Scalability Headroom
- **At 10,000 holders:** 250 calls/snapshot × 4 = 1,000/month (0.01% of limit) ✅ Still FREE
- **At 100,000 holders:** 2,500 calls/snapshot × 4 = 10,000/month (0.1% of limit) ✅ Still FREE
- **Conclusion:** Free tier will support your growth for the foreseeable future

### Comparison: Solscan vs Current Alchemy Approach

| Aspect | Current (Alchemy + Price Oracle) | Proposed (Solscan Free) |
|--------|----------------------------------|-------------------------|
| **API calls/snapshot** | 2 (to 2 services) | 13 (to 1 service) |
| **Monthly calls** | 8 total | 52 total |
| **Monthly cost** | $0 (both free) | $0 (free tier) |
| **Services to maintain** | 2 (Alchemy + Jupiter/CoinGecko) | 1 (Solscan) |
| **Development time** | 8-10 hours (price oracle logic) | 4-6 hours (simpler integration) |
| **Data accuracy** | May differ from Solscan UI | Matches Solscan UI exactly |
| **USD values** | Need to calculate | Pre-calculated ✅ |

**Conclusion:** Solscan API is better in every way - simpler, cheaper (same $0), and more accurate.

---

## 🎯 Final Recommendation

**Use Solscan Pro API (Option A)** as the primary solution for getting USD values.

### Action Items (Priority Order)

1. **IMMEDIATE:** Research Solscan API pricing and sign up for API key
2. **HIGH:** Test Solscan API with LOTTO token to verify USD values
3. **HIGH:** Implement `SolscanService` with pagination and error handling
4. **MEDIUM:** Integrate into `SnapshotService` and test end-to-end
5. **MEDIUM:** Implement fallback to price oracle (Option C) for redundancy
6. **LOW:** Add monitoring and alerts for API health

### Success Criteria

✅ Snapshot captures accurate USD values for all token holders
✅ $50 USD minimum balance eligibility works correctly
✅ USD values match what users see on Solscan website
✅ System handles rate limits gracefully
✅ Fallback works if Solscan API is unavailable

---

**Last Updated:** October 23, 2025
**Next Review:** After Solscan API testing
**Owner:** Development Team
