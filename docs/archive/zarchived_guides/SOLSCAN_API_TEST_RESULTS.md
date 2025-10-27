# Solscan API Test Results

**Date:** October 23, 2025
**Status:** ❌ FAILED - Free tier does not support required endpoint
**Decision:** Proceed with Manual Price Entry fallback

---

## Test Summary

✅ **Passed:** 1/7 tests
❌ **Failed:** 6/7 tests

---

## Test Results

### ✅ Test 1: API Key Configuration - PASS
- API key found in environment
- Key length: 233 characters
- Format: Valid JWT token

### ❌ Test 2-7: All API Calls - FAIL
- Error: **"Unauthorized: Please upgrade your api key level."**
- HTTP Status: 401 Unauthorized

---

## Root Cause Analysis

### The Problem

The Solscan free tier API key does **NOT** have access to the Pro API v2.0 `/token/holders` endpoint.

**Evidence:**

1. **Free tier screenshot shows:**
   - "SOLSCAN FREE API"
   - "C.U/Month: 10,000,000"
   - "Requests/60 seconds: 1,000"
   - "Access to API Public endpoints"

2. **Documentation states:**
   - Token holders endpoint is in **Solscan Pro API V2.0** (100 CU cost)
   - Only **paid tiers** are documented (Level 2: $199/mo, Level 3: $399/mo, Enterprise: custom)
   - Free tier only has "API Public endpoints" (NOT Pro endpoints)

3. **API Response:**
   ```json
   {"error_message":"Unauthorized: Please upgrade your api key level."}
   ```

### What Free Tier Provides

The free tier appears to only support:
- Public blockchain data endpoints (transactions, blocks, etc.)
- **NOT** enhanced endpoints like token holders with USD values

---

## Implications

### ❌ Solscan Integration is NOT Viable Without Paid Subscription

**To use Solscan's token holders endpoint with USD values, you would need:**
- **Level 2:** $199/month (150M CU, 1,000 req/60s)
- **Level 3:** $399/month (500M CU, 2,000 req/60s)
- **Enterprise:** Custom pricing

**For your use case (511 holders, 4 snapshots/month):**
- 13 API calls/snapshot × 4 = 52 calls/month
- 52 calls × 100 CU = 5,200 CU/month
- You would only need **0.0035%** of Level 2's 150M CU limit
- **Cost:** $199/month for features you barely use ❌

---

## Decision: Use Fallback Option

### ✅ Recommended: Manual Price Entry in Control Form

Since Solscan requires $199/month for a feature you'll use 52 times/month, the **Manual Price Entry** approach is far more cost-effective.

**Comparison:**

| Approach | Cost/Month | Implementation Time | Accuracy | Flexibility |
|----------|------------|---------------------|----------|-------------|
| **Solscan Pro** | **$199** ❌ | 4-6 hours | High | High |
| **Manual Entry** | **$0** ✅ | 4-6 hours | High | High |

**Manual Entry provides the same benefits at 0% of the cost.**

---

## Alternative: Free Price Oracles

Instead of Solscan, consider these **FREE** alternatives for price data:

### Option 1: Jupiter Price API (FREE)
- Endpoint: `https://price.jup.ag/v4/price?ids=TOKEN_MINT`
- Returns: Current token price in USD
- Cost: $0 (public API)
- Rate limit: Generous for your usage

### Option 2: CoinGecko API (FREE)
- Endpoint: `https://api.coingecko.com/api/v3/simple/token_price/solana`
- Returns: Token prices in multiple currencies
- Cost: $0 (free tier: 30 calls/min)
- More comprehensive than needed

### Option 3: Raydium/Orca DEX (FREE)
- Query on-chain pool prices directly
- Cost: $0 (just RPC calls)
- Most accurate (direct from DEX)

---

## Recommended Path Forward

### Implement Manual Price Entry with "Fetch Price" Helper

**Best of both worlds:**

1. **Add price input field** to Control Form
2. **Add "Fetch Price" button** that calls Jupiter Price API
3. **Operator confirms** the auto-filled price or edits manually
4. **Price stored in database** for audit trail

**Benefits:**
- ✅ $0/month cost (vs $199 for Solscan)
- ✅ Operator has full control
- ✅ Can verify price from multiple sources
- ✅ Transparent and auditable
- ✅ One-click auto-fill reduces effort
- ✅ Fallback to manual if API fails

**Implementation:**
1. Frontend: Add price field + fetch button (2 hours)
2. Backend: Add Jupiter price endpoint (1 hour)
3. Database: Add `lottoUsdPrice` field (0.5 hours)
4. Testing: Verify calculations (1 hour)
5. **Total: ~4-5 hours**

---

## Implementation Plan

See [FALLBACK_PRICE_CONVERSION_ANALYSIS.md](FALLBACK_PRICE_CONVERSION_ANALYSIS.md) for:
- Detailed comparison of Manual Entry vs Hardcoded
- Complete implementation code examples
- Database migration scripts
- Testing checklist
- Best practices and safeguards

---

## Conclusion

❌ **Solscan Pro API:** Not cost-effective ($199/month for 52 API calls)
✅ **Manual Price Entry:** Same functionality, $0 cost, 4-5 hours implementation

**Next step:** Implement Manual Price Entry with Jupiter Price API helper button.

---

**Test Date:** October 23, 2025
**Tested By:** Development Team
**API Key Tier:** Free (Public endpoints only)
**Required Tier:** Level 2 ($199/month) or higher
