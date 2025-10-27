# Devnet Testing Guide - Jupiter Swap Integration

## Overview

This guide walks you through testing the Jupiter Swap integration on Solana devnet using USDC-Dev as a stand-in for the LOTTO token.

## Why USDC-Dev?

- ✅ **Has Jupiter liquidity** on devnet (can actually swap SOL ↔ USDC-Dev)
- ✅ **Same decimals as LOTTO** (6 decimals)
- ✅ **Tests complete flow** without needing to deploy LOTTO on devnet
- ✅ **Validates all swap mechanics** that will work on mainnet with LOTTO

## Setup Instructions

### 1. Update Environment Configuration

Edit `apps/backend/.env` (or create from `.env.supabase.example`):

```bash
# Token Configuration (Devnet Testing)
LOTTO_MINT_ADDRESS="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"  # USDC-Dev
LOTTO_DECIMALS=6

# Ensure you're on devnet
SOLANA_NETWORK="devnet"
ALCHEMY_RPC_URL="https://solana-devnet.g.alchemy.com/v2/YOUR_API_KEY"
SOLANA_RPC_FALLBACK="https://api.devnet.solana.com"
```

### 2. Restart Backend

```bash
cd apps/backend
npm run dev
```

The backend should log:
```
Jupiter Service initialized with LOTTO_MINT: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU
```

### 3. Get Devnet SOL

Ensure your operator wallet has devnet SOL:

```bash
solana airdrop 2 YOUR_WALLET_ADDRESS --url devnet
```

Or use: https://faucet.solana.com/

## Test Scenarios

### Test 1: SOL Distribution (Baseline)

**Purpose**: Verify existing functionality still works

1. Complete a lottery round (Control → Snapshot → Drawing → Harvest)
2. In Distribution module, **leave "Swap SOL to LOTTO" UNCHECKED**
3. Click "Release Funds"
4. Sign the transaction in Phantom
5. ✅ **Expected**: Transaction succeeds, winners receive SOL

**Console logs to verify:**
```
💰 Building SOL transfer transaction...
✅ SOL transaction prepared with X transfers
```

---

### Test 2: Jupiter Swap (Happy Path)

**Purpose**: Test successful SOL → USDC-Dev swap

1. Complete a lottery round with **small amounts** (e.g., 0.01 SOL per winner)
2. In Distribution module, **CHECK "Swap SOL to LOTTO"**
3. Note: The UI will say "LOTTO" but you'll actually get USDC-Dev (this is expected)
4. Click "Release Funds"
5. **Sign MULTIPLE transactions** in Phantom (one per winner - T1, T2, T3, T4)
6. Wait for all swaps to confirm

**Console logs to verify:**
```
🔄 Building Jupiter Swap transactions...
📊 Getting Jupiter quote for X lamports SOL → LOTTO
   ✅ Quote received:
      Output: X.XXXXXX LOTTO (actually USDC-Dev)
      Price Impact: 0.XX%
✅ Jupiter swap transactions prepared
   Transactions: 4

🔄 Swap mode enabled - signing 4 Jupiter swap transactions...
   Signing t1 swap for [address]...
   ✅ t1 signed
   ...
📡 Broadcasting signed swap transactions...
✅ Swap distribution broadcast response: { swapped: true }
```

**Verification:**
- Check Solscan for each transaction signature
- Verify winners received USDC-Dev tokens (not SOL)
- Confirm amounts are correct (accounting for price impact)

---

### Test 3: Swap Fallback (Backend Configuration Missing)

**Purpose**: Test automatic fallback when LOTTO_MINT not configured

1. **Stop backend**
2. **Remove or comment out** `LOTTO_MINT_ADDRESS` in `.env`
3. **Restart backend**
4. Complete a round, **CHECK "Swap SOL to LOTTO"**
5. Click "Release Funds"

**Expected behavior:**
```
⚠️  Swap requested but Jupiter not configured - falling back to SOL
💰 Building SOL transfer transaction...
```

- ✅ Should fall back to SOL automatically
- ✅ Should only sign ONE transaction (SOL transfer)
- ✅ Winners receive SOL (not USDC-Dev)

---

### Test 4: Swap with Large Amount (Price Impact Warning)

**Purpose**: Test swap with significant price impact

1. Set up a round with **larger amounts** (e.g., 0.5 SOL per winner)
2. **CHECK "Swap SOL to LOTTO"**
3. Click "Release Funds"

**Expected behavior:**
- Jupiter quote will show higher price impact (e.g., 5-15%)
- Console logs show: `Price Impact: X.XX%`
- Swap may succeed but with less favorable exchange rate
- Consider adding UI warning in future for high price impact

---

### Test 5: Swap Error Handling (Network Issues)

**Purpose**: Test error handling and user-facing messages

**Simulate error** by temporarily blocking Jupiter API:
1. In `jupiter.service.ts`, temporarily add a timeout of 100ms to force failure
2. Or disconnect from internet briefly
3. Complete round, **CHECK "Swap SOL to LOTTO"**
4. Click "Release Funds"

**Expected behavior:**
- Error caught during prepare or broadcast
- User sees error message with fallback instructions
- User unchecks swap checkbox
- User retries successfully with SOL

---

### Test 6: Multiple Winners with Different Amounts

**Purpose**: Test multi-transaction swap flow

1. Complete a round with **all 4 tiers having winners**
2. Ensure different payout amounts per tier
3. **CHECK "Swap SOL to LOTTO"**
4. Click "Release Funds"
5. **Sign 4 separate transactions** in Phantom (one per tier)

**Console logs to verify:**
```
🔄 Building Jupiter Swap transactions...
   ✅ Built swap for t1: [address]...
   ✅ Built swap for t2: [address]...
   ✅ Built swap for t3: [address]...
   ✅ Built swap for t4: [address]...

Swap mode enabled - signing 4 Jupiter swap transactions...
   Signing t1 swap for [address]...
   ✅ t1 signed
   Signing t2 swap for [address]...
   ✅ t2 signed
   ...
```

**Verification:**
- All 4 winners receive USDC-Dev
- Amounts are proportional to their SOL allocations
- All 4 transaction signatures appear on Solscan

---

### Test 7: Slippage Tolerance

**Purpose**: Test configurable slippage works correctly

1. In Control module, set **Slippage Tolerance** to different values (0.5%, 1%, 2%)
2. Complete rounds with **CHECK "Swap SOL to LOTTO"**
3. Compare slippage used in console logs

**Expected behavior:**
```
📊 Getting Jupiter quote for X lamports SOL → LOTTO
   Slippage: 0.5% (50 bps)    // Should match your setting
```

---

## Verification Checklist

After running tests, verify:

- [ ] SOL distribution works (Test 1)
- [ ] Jupiter swap works with multiple winners (Test 2, 6)
- [ ] Automatic fallback to SOL when swap unavailable (Test 3)
- [ ] Price impact is logged correctly (Test 4)
- [ ] Error messages are user-friendly (Test 5)
- [ ] Slippage tolerance is respected (Test 7)
- [ ] All transactions appear on Solscan with correct amounts
- [ ] Database records `swapToLotto = true` for successful swaps
- [ ] Database records `swapToLotto = false` for SOL distributions

## Common Issues & Solutions

### Issue: "Failed to get Jupiter quote: No route found"

**Cause**: Insufficient liquidity for the swap amount on devnet
**Solution**:
- Try smaller amounts (e.g., 0.001-0.01 SOL per winner)
- Devnet liquidity is limited; this is expected
- On mainnet with LOTTO, liquidity should be much better

### Issue: Multiple signature requests overwhelming

**Cause**: Each winner requires separate swap transaction
**Solution**:
- This is expected behavior (safer than batch)
- Sign each transaction as Phantom prompts
- Alternative: Use SOL mode if too many signatures needed

### Issue: "Transaction failed" during swap broadcast

**Cause**: Network congestion, blockhash expiration, or liquidity change
**Solution**:
- Check error message for specific cause
- Uncheck swap checkbox and retry with SOL
- On mainnet, higher priority fees help avoid this

### Issue: Wrong amounts received

**Cause**: Price impact between quote and execution
**Solution**:
- Check console logs for price impact percentage
- Increase slippage tolerance if needed
- For large amounts, consider splitting into multiple rounds

## Transition to Mainnet

When ready to use with real LOTTO on mainnet:

1. **Update backend `.env`:**
   ```bash
   LOTTO_MINT_ADDRESS="HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump"
   SOLANA_NETWORK="mainnet-beta"
   ALCHEMY_RPC_URL="https://solana-mainnet.g.alchemy.com/v2/YOUR_API_KEY"
   ```

2. **Test with small amounts first:**
   - Run one round with 0.001 SOL per winner
   - Verify swap works correctly with actual LOTTO
   - Check Solscan for transaction confirmation

3. **Monitor for issues:**
   - Watch price impact (should be lower on mainnet)
   - Verify LOTTO liquidity is sufficient
   - Keep SOL fallback as backup option

## Key Differences: Devnet vs Mainnet

| Aspect | Devnet (USDC-Dev) | Mainnet (LOTTO) |
|--------|-------------------|-----------------|
| Token Address | 4zMMC9...ncDU | HJSnJ...pump |
| Liquidity | Limited | Should be higher |
| Price Impact | Higher (low liquidity) | Lower (better liquidity) |
| Transaction Speed | Slower (congestion) | Faster (prioritization) |
| Swap Success Rate | May fail more often | Should be more reliable |
| Fallback to SOL | Expected & tested | Rare occurrence |

## Support

If you encounter issues during testing:

1. **Check backend logs** for detailed error messages
2. **Check browser console** for frontend errors
3. **Verify environment variables** are set correctly
4. **Test SOL mode first** to ensure base functionality works
5. **Review** [JUPITER_SWAP_IMPLEMENTATION.md](JUPITER_SWAP_IMPLEMENTATION.md) for architecture details

---

**Happy Testing!** 🚀

Remember: The goal of devnet testing is to validate the **swap mechanics and error handling**, not to achieve perfect execution rates. The implementation is designed to gracefully fall back to SOL when swaps fail, which is the desired behavior for production.
