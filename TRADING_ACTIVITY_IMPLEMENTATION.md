# Trading Activity Implementation - Mainnet Eligibility Rules

**Status:** NOT IMPLEMENTED - MAINNET BLOCKER
**Priority:** CRITICAL
**Target:** Phase 2 - Pre-Mainnet Launch
**Estimated Effort:** 8-10 hours (implementation + testing)

---

## Eligibility Requirements (Final Specification)

For a wallet to be eligible for the lottery drawing, it must meet **ALL** of the following criteria:

### 1. **Minimum Token Holdings**
- Wallet must hold **at least $50 USD worth** of the token during snapshot confirmation
- USD value calculated based on current token price at snapshot time

### 2. **Trading Activity Requirement** (ONE of the following)

Wallets must demonstrate active trading during the snapshot period (between `startDate` and `endDate`):

**Option A: Selling Activity**
- Wallet must have **sold (reduced holdings) by at least 50%** during the snapshot period
- Calculation: `sellPercent = ((startBalance - endBalance) / startBalance) * 100`
- Example: Start with 1000 tokens, end with 400 tokens = 60% reduction ✅ ELIGIBLE

**Option B: Buying Activity**
- Wallet must have **bought (increased holdings) by at least 50%** during the snapshot period
- Calculation: `buyPercent = ((endBalance - startBalance) / startBalance) * 100`
- Example: Start with 1000 tokens, end with 1600 tokens = 60% increase ✅ ELIGIBLE

**Important Notes:**
- Wallets that **HOLD** (no change in balance) are **INELIGIBLE** (0% activity)
- Wallets can qualify through EITHER buying OR selling activity (not both required)
- Swaps that result in balance changes count toward buying/selling activity
- Transfers, staking, and other non-trade activities do NOT count

### 3. **Configuration Parameter**
- The trade threshold percentage (default: 50%) is configurable in the Control module
- Stored as `tradeThresholdPercent` in the lottery config
- Operators can adjust this per round (e.g., 25%, 50%, 75%, etc.)

---

## Implementation Strategy: Option A (Balance Comparison)

### Phase 1: Database Schema

**New Table: `BalanceSnapshot`**

```prisma
model BalanceSnapshot {
  id              String   @id @default(uuid())
  roundId         String
  wallet          String
  tokenBalance    Float    // Raw token amount (not USD)
  snapshotType    String   // "START" or "END"
  capturedAt      DateTime @default(now())
  round           Round    @relation(fields: [roundId], references: [id], onDelete: Cascade)

  @@index([roundId, wallet, snapshotType])
  @@index([capturedAt])
  @@unique([roundId, wallet, snapshotType]) // One START and one END per wallet per round
}
```

**Migration Command:**
```bash
cd apps/backend
npx prisma migrate dev --name add_balance_snapshot
```

### Phase 2: Trading Activity Service

**New Service: `apps/backend/src/services/trading-activity.service.ts`**

```typescript
import { getSnapshotService } from './snapshot.service';
import prisma from '../prisma';

export class TradingActivityService {
  /**
   * Capture START balances for all token holders at round creation
   */
  async captureStartBalances(
    roundId: string,
    mintAddress: string
  ): Promise<void> {
    console.log(`📸 Capturing START balances for round ${roundId}...`);

    const snapshotService = getSnapshotService();
    const holders = await snapshotService.getTokenHolders(mintAddress);

    const batchSize = 100;
    for (let i = 0; i < holders.length; i += batchSize) {
      const batch = holders.slice(i, i + batchSize);

      await prisma.balanceSnapshot.createMany({
        data: batch.map(holder => ({
          roundId,
          wallet: holder.owner,
          tokenBalance: holder.balanceUi,
          snapshotType: 'START',
        })),
        skipDuplicates: true,
      });
    }

    console.log(`✅ Captured ${holders.length} START balances`);
  }

  /**
   * Capture END balances and calculate trading activity
   */
  async captureEndBalances(
    roundId: string,
    mintAddress: string
  ): Promise<void> {
    console.log(`📸 Capturing END balances for round ${roundId}...`);

    const snapshotService = getSnapshotService();
    const holders = await snapshotService.getTokenHolders(mintAddress);

    const batchSize = 100;
    for (let i = 0; i < holders.length; i += batchSize) {
      const batch = holders.slice(i, i + batchSize);

      await prisma.balanceSnapshot.createMany({
        data: batch.map(holder => ({
          roundId,
          wallet: holder.owner,
          tokenBalance: holder.balanceUi,
          snapshotType: 'END',
        })),
        skipDuplicates: true,
      });
    }

    console.log(`✅ Captured ${holders.length} END balances`);
  }

  /**
   * Calculate trade activity percentage for a wallet
   * Returns the HIGHER of buy% or sell% (whichever is greater)
   */
  async calculateTradeActivity(
    roundId: string,
    wallet: string
  ): Promise<number> {
    const startSnapshot = await prisma.balanceSnapshot.findUnique({
      where: {
        roundId_wallet_snapshotType: {
          roundId,
          wallet,
          snapshotType: 'START'
        }
      }
    });

    const endSnapshot = await prisma.balanceSnapshot.findUnique({
      where: {
        roundId_wallet_snapshotType: {
          roundId,
          wallet,
          snapshotType: 'END'
        }
      }
    });

    // New wallet (no START balance) - calculate buy activity from 0
    if (!startSnapshot && endSnapshot) {
      // Going from 0 to any positive amount = 100% buy activity
      return endSnapshot.tokenBalance > 0 ? 100 : 0;
    }

    // Wallet no longer exists (no END balance) - 100% sell activity
    if (startSnapshot && !endSnapshot) {
      return 100; // Sold everything
    }

    // Wallet existed at both START and END
    if (startSnapshot && endSnapshot) {
      const startBal = startSnapshot.tokenBalance;
      const endBal = endSnapshot.tokenBalance;

      if (startBal === 0) {
        // Edge case: started with 0
        return endBal > 0 ? 100 : 0;
      }

      // Calculate buy % and sell %
      const buyPercent = ((endBal - startBal) / startBal) * 100;
      const sellPercent = ((startBal - endBal) / startBal) * 100;

      // Return the HIGHER of the two (allows qualification via either buying OR selling)
      return Math.max(0, buyPercent, sellPercent);
    }

    // No data available
    return 0;
  }

  /**
   * Update eligibility scores for all participants in a round
   */
  async updateParticipantEligibility(
    roundId: string,
    minTradePercent: number
  ): Promise<void> {
    console.log(`📊 Calculating trade activity for round ${roundId}...`);
    console.log(`   Minimum required: ${minTradePercent}%`);

    const participants = await prisma.participant.findMany({
      where: { roundId }
    });

    let eligibleCount = 0;

    for (const participant of participants) {
      const tradePercent = await this.calculateTradeActivity(
        roundId,
        participant.wallet
      );

      const isEligible = tradePercent >= minTradePercent;

      if (isEligible) eligibleCount++;

      await prisma.participant.update({
        where: { id: participant.id },
        data: {
          eligibilityScore: tradePercent,
          // Note: isEligible will be set in snapshot/confirm
          // after checking BOTH trade% AND token balance
        }
      });

      const status = isEligible ? '✅' : '❌';
      console.log(
        `   ${status} ${participant.wallet.slice(0, 8)}... - ` +
        `Trade Activity: ${tradePercent.toFixed(2)}%`
      );
    }

    console.log(`\n✅ Processed ${participants.length} participants`);
    console.log(`   Eligible (by trade %): ${eligibleCount}`);
  }
}

// Singleton instance
let tradingActivityServiceInstance: TradingActivityService | null = null;

export function getTradingActivityService(): TradingActivityService {
  if (!tradingActivityServiceInstance) {
    tradingActivityServiceInstance = new TradingActivityService();
  }
  return tradingActivityServiceInstance;
}
```

### Phase 3: Integration Points

#### 3.1 Control Module - Capture START Balances

**File:** `apps/backend/src/routes/control.ts`

```typescript
// After round creation, capture START balances
import { getTradingActivityService } from '../services/trading-activity.service';

router.post('/config', requireJwt, async (req, res) => {
  // ... existing round creation code ...

  // NEW: Capture START balances
  try {
    const tradingService = getTradingActivityService();
    await tradingService.captureStartBalances(round.id, config.tokenMint);
    console.log(`✅ START balances captured for round ${round.id}`);
  } catch (error) {
    console.warn('⚠️ Failed to capture START balances:', error);
    // Non-critical error - continue with round creation
  }

  // ... rest of the response ...
});
```

#### 3.2 Snapshot Module - Capture END Balances & Calculate Activity

**File:** `apps/backend/src/routes/snapshot.ts`

```typescript
import { getTradingActivityService } from '../services/trading-activity.service';

router.post('/confirm', requireJwt, async (req, res) => {
  // ... existing snapshot validation code ...

  // Get config
  const config = await prisma.lotteryConfig.findFirst({
    where: {
      snapshotStart: round.startDate,
      snapshotEnd: round.endDate,
    },
    orderBy: { createdAt: 'desc' },
  });

  const minUsdLotto = config?.minUsdLottoRequired ?? 50.0;
  const minTradePercent = config?.tradePercentage ?? 50;

  // NEW: Capture END balances and calculate trading activity
  const tradingService = getTradingActivityService();

  try {
    console.log('📸 Capturing END balances...');
    await tradingService.captureEndBalances(snap.roundId, config.tokenMint);

    console.log('📊 Calculating trading activity...');
    await tradingService.updateParticipantEligibility(
      snap.roundId,
      minTradePercent
    );
  } catch (error) {
    console.error('❌ Failed to calculate trading activity:', error);
    return res.status(500).json({
      error: 'Failed to calculate trading activity',
      details: error instanceof Error ? error.message : String(error)
    });
  }

  // Get all participants with updated eligibility scores
  const allParticipants = await prisma.participant.findMany({
    where: { roundId: snap.roundId }
  });

  // Apply eligibility rules: BOTH token balance AND trade activity
  for (const p of allParticipants) {
    const lottoValue = p.tokenBalance ?? 0;
    const tradePercent = p.eligibilityScore ?? 0;

    // ✅ BOTH conditions must be met
    const isEligible = lottoValue >= minUsdLotto && tradePercent >= minTradePercent;

    console.log(
      `  ${isEligible ? '✅' : '❌'} ${p.wallet.slice(0, 8)}... - ` +
      `Balance: $${lottoValue.toFixed(2)}, Trade%: ${tradePercent.toFixed(2)}%, ` +
      `Eligible: ${isEligible}`
    );

    await prisma.participant.update({
      where: { id: p.id },
      data: { isEligible }
    });
  }

  // ... rest of the confirmation logic ...
});
```

---

## Testing Plan

### Test Scenarios

#### Scenario 1: New Wallet (100% Buy Activity)
```
START: 0 tokens
END: 1000 tokens
Expected: 100% trade activity ✅ ELIGIBLE (if $50+ USD)
```

#### Scenario 2: Sold 60% (Qualifies)
```
START: 1000 tokens
END: 400 tokens
Expected: 60% trade activity ✅ ELIGIBLE (if $50+ USD)
```

#### Scenario 3: Bought 60% (Qualifies)
```
START: 1000 tokens
END: 1600 tokens
Expected: 60% trade activity ✅ ELIGIBLE (if $50+ USD)
```

#### Scenario 4: Holder (No Activity)
```
START: 1000 tokens
END: 1000 tokens
Expected: 0% trade activity ❌ INELIGIBLE
```

#### Scenario 5: Small Change (Below Threshold)
```
START: 1000 tokens
END: 1300 tokens
Threshold: 50%
Expected: 30% trade activity ❌ INELIGIBLE
```

#### Scenario 6: Wallet Closed (100% Sell)
```
START: 1000 tokens
END: 0 tokens (or wallet deleted)
Expected: 100% trade activity ✅ ELIGIBLE
```

### Test Script

Create `apps/backend/scripts/test-trading-activity.ts`:

```typescript
import { getTradingActivityService } from '../src/services/trading-activity.service';
import prisma from '../src/prisma';

async function testTradingActivity() {
  const roundId = 'test-round-123';
  const testWallets = [
    { wallet: 'NewWallet...', start: 0, end: 1000, expected: 100 },
    { wallet: 'Seller...', start: 1000, end: 400, expected: 60 },
    { wallet: 'Buyer...', start: 1000, end: 1600, expected: 60 },
    { wallet: 'Holder...', start: 1000, end: 1000, expected: 0 },
    { wallet: 'SmallChange...', start: 1000, end: 1300, expected: 30 },
  ];

  const service = getTradingActivityService();

  // Create test snapshots
  for (const test of testWallets) {
    if (test.start > 0) {
      await prisma.balanceSnapshot.create({
        data: {
          roundId,
          wallet: test.wallet,
          tokenBalance: test.start,
          snapshotType: 'START',
        }
      });
    }

    if (test.end > 0) {
      await prisma.balanceSnapshot.create({
        data: {
          roundId,
          wallet: test.wallet,
          tokenBalance: test.end,
          snapshotType: 'END',
        }
      });
    }
  }

  // Test calculations
  console.log('\n🧪 Testing Trading Activity Calculations\n');

  for (const test of testWallets) {
    const result = await service.calculateTradeActivity(roundId, test.wallet);
    const pass = Math.abs(result - test.expected) < 0.01;

    console.log(
      `${pass ? '✅' : '❌'} ${test.wallet} - ` +
      `Expected: ${test.expected}%, Got: ${result.toFixed(2)}%`
    );
  }

  // Cleanup
  await prisma.balanceSnapshot.deleteMany({ where: { roundId } });
}

testTradingActivity().catch(console.error).finally(() => process.exit());
```

---

## Deployment Checklist

Before mainnet launch:

- [ ] Database migration applied (`BalanceSnapshot` table created)
- [ ] Trading activity service implemented and tested
- [ ] Control module integration complete (START balance capture)
- [ ] Snapshot module integration complete (END balance capture + calculation)
- [ ] All test scenarios passing
- [ ] DEVNET stub code removed from `snapshot.ts:125-140`
- [ ] Token price oracle integrated (for USD value calculation)
- [ ] Documentation updated (API docs, operator guide)
- [ ] Load testing completed (1000+ participants)
- [ ] Edge case handling verified (deleted wallets, zero balances, etc.)

---

## Notes & Considerations

### Token Price Calculation

For the "$50 USD" requirement, you'll need to:
1. Query current token price from an oracle (Jupiter Price API, CoinGecko, etc.)
2. Calculate: `usdValue = tokenBalance * tokenPrice`
3. Store the price used for each round for audit purposes

**Recommended:** Add `tokenPriceUsd` field to `LotteryConfig` table

### Swap Activity Handling

Swaps are automatically included in this implementation:
- If a swap **increases** token balance → counts as buying activity
- If a swap **decreases** token balance → counts as selling activity
- This is correct because swaps that change balance ARE trading activity

### Performance Optimization

For large token holder counts (10k+):
- Consider batch processing balance snapshots
- Add indexes on `BalanceSnapshot` table (already included in schema)
- Cache token holder lists during snapshot period
- Use database transactions for atomic updates

---

**Last Updated:** October 11, 2025
**Next Action:** Begin Phase 1 implementation after user approval
