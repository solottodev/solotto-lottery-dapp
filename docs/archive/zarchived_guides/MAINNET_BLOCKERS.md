# 🚨 MAINNET GO-LIVE BLOCKERS

**Critical items that MUST be implemented before launching on mainnet.**

---

## ❌ BLOCKER 1: Trading Activity Calculation

**Status:** NOT IMPLEMENTED (using devnet stub)
**Priority:** CRITICAL - BLOCKS MAINNET LAUNCH
**Current State:** All token holders assumed to have 100% trade activity
**Location:** `apps/backend/src/routes/snapshot.ts:125-140`
**Implementation Plan:** See `TRADING_ACTIVITY_IMPLEMENTATION.md` for full specification

### Problem

Currently, the snapshot confirmation assumes **all token holders have 100% trade activity** for devnet testing purposes. This is incorrect for production and will allow ineligible participants to enter the lottery.

### Mainnet Eligibility Requirements (FINAL SPEC)

For a wallet to be eligible for lottery drawing, it must meet **ALL** criteria:

#### 1. Minimum Token Holdings
- Wallet must hold **≥ $50 USD worth** of token at snapshot confirmation time

#### 2. Trading Activity (ONE of the following qualifies)

**Option A: Selling Activity**
- Wallet **sold (reduced holdings) by ≥ 50%** during snapshot period
- Calculation: `sellPercent = ((startBalance - endBalance) / startBalance) × 100`
- Example: 1000 → 400 tokens = 60% sold ✅ ELIGIBLE

**Option B: Buying Activity**
- Wallet **bought (increased holdings) by ≥ 50%** during snapshot period
- Calculation: `buyPercent = ((endBalance - startBalance) / startBalance) × 100`
- Example: 1000 → 1600 tokens = 60% bought ✅ ELIGIBLE

**Key Rules:**
- Wallets can qualify through **EITHER** buying **OR** selling (not both required)
- Wallets that **HOLD** (no change) are **INELIGIBLE** (0% activity)
- Swaps that change balance count as buying/selling activity
- Threshold is configurable per round (default: 50%)

### Implementation Approach: Historical Balance Comparison

Query token balances at two points in time:

1. **Snapshot START:** Capture all token holder balances at round creation
2. **Snapshot END:** Capture all token holder balances at snapshot confirmation
3. **Calculate activity:** Return the **HIGHER** of buy% or sell% for each wallet
4. **Apply rules:** Check both balance ($50+) AND activity (50%+)

### Implementation Strategy

**Phase 1: Historical Balance Tracking**

Create a new service: `apps/backend/src/services/trading-activity.service.ts`

```typescript
export class TradingActivityService {
  // Store balance snapshot at START of round
  async captureStartBalances(roundId: string, mintAddress: string): Promise<void>

  // Compare balances at END of round
  async calculateTradeActivity(roundId: string, mintAddress: string): Promise<Map<string, number>>

  // Update participant eligibilityScore
  async updateParticipantEligibility(roundId: string): Promise<void>
}
```

**Phase 2: Integration**

1. **Control Module:** Capture start balances when round is created
2. **Snapshot Module:** Calculate trade % during snapshot/confirm
3. **Database:** Store historical balances in new table `BalanceSnapshot`

### Database Schema Addition

```prisma
model BalanceSnapshot {
  id              String   @id @default(uuid())
  roundId         String
  wallet          String
  tokenBalance    Float
  snapshotType    String   // "START" or "END"
  capturedAt      DateTime @default(now())
  round           Round    @relation(fields: [roundId], references: [id], onDelete: Cascade)

  @@index([roundId, wallet])
  @@index([capturedAt])
}
```

### Testing Requirements

Before mainnet launch:

- [ ] Test with wallets that bought ≥50% during period (should be eligible)
- [ ] Test with wallets that sold ≥50% during period (should be eligible)
- [ ] Test with wallets that only held (should be ineligible)
- [ ] Test with wallets with <50% activity (should be ineligible)
- [ ] Test with new wallets (0 → X tokens = 100% eligible)
- [ ] Test with wallets below $50 USD (should be ineligible regardless of activity)
- [ ] Test with wallets that closed (100% sold = eligible)
- [ ] Verify historical balance queries are accurate
- [ ] Handle edge cases (transfers, staking, etc.)
- [ ] Load test with 1000+ participants

### Estimated Time

- **Database Schema:** 0.5 hours
- **Trading Activity Service:** 3-4 hours
- **Integration (Control + Snapshot):** 2-3 hours
- **Testing & Validation:** 2-3 hours
- **Total:** 8-10 hours

### Documentation Reference

**See full implementation plan:** `TRADING_ACTIVITY_IMPLEMENTATION.md`
- Complete service code with all methods
- Database migration scripts
- Integration examples
- Test scenarios and scripts
- Deployment checklist

---

## ❌ BLOCKER 2: Token Mint Configuration

**Status:** HARDCODED
**Priority:** CRITICAL
**Current State:** Frontend uses environment variable, but needs validation
**Location:** `apps/frontend/lib/api.ts:22`

### Problem

Token mint address is read from environment variable but:
1. No validation that it matches the expected mainnet token
2. No fail-safe if environment variable is missing
3. Decimals are hardcoded to 6 (should query from chain)

### Solution

1. Add environment variable validation on backend startup
2. Query token decimals from blockchain instead of hardcoding
3. Add health check endpoint that verifies correct token is configured

---

## ❌ BLOCKER 3: Operator Wallet Security

**Status:** NEEDS REVIEW
**Priority:** HIGH
**Current State:** Private key in `.env` file
**Location:** `apps/backend/.env`

### Problem

Operator wallet private key is stored in plain text `.env` file.

### Solution Options

1. **Hardware Wallet Integration** (Ledger/Trezor)
2. **AWS Secrets Manager / Google Cloud KMS**
3. **Multi-sig Wallet** (Squads Protocol on Solana)
4. **Minimum:** Encrypt private key at rest

---

## ✅ COMPLETED ITEMS

*None yet - add items here as blockers are resolved*

---

## 📋 Mainnet Launch Checklist

Before launching on mainnet, ensure:

- [ ] Trading activity calculation implemented and tested
- [ ] Token mint validation added
- [ ] Operator wallet secured properly
- [ ] All devnet stubs removed (search codebase for "DEVNET ONLY")
- [ ] Environment variables validated on startup
- [ ] Database backups configured
- [ ] Error monitoring setup (Sentry, etc.)
- [ ] Rate limiting implemented on public endpoints
- [ ] Security audit completed
- [ ] Load testing performed
- [ ] Disaster recovery plan documented

---

**Last Updated:** October 11, 2025
**Next Review:** Before Phase 2 completion

---

## 📚 Related Documentation

- **`TRADING_ACTIVITY_IMPLEMENTATION.md`** - Complete implementation guide with code, tests, and deployment checklist
- **`PHASE_1_PROGRESS.md`** - Current development progress
- **`SESSION_SUMMARY.md`** - Session notes and decisions
