# Jupiter Swap Integration - Implementation Summary

## Overview

This document describes the Jupiter Swap integration for the Solotto lottery DApp, which enables automated SOL to LOTTO token conversion during prize distribution with automatic fallback to SOL distribution on failure.

## Implementation Date
October 14, 2025

## Key Features

1. **Optional Jupiter Swap**: Operator can choose to swap SOL prizes to LOTTO tokens via Jupiter aggregator
2. **Automatic Fallback**: If Jupiter swap fails or is unavailable, automatically falls back to SOL distribution
3. **Frontend Wallet Signing**: All transactions (both swap and SOL) are signed by the operator's Phantom wallet on the frontend
4. **Multi-Transaction Support**: Each winner gets their own swap transaction for better reliability
5. **Comprehensive Error Handling**: Detailed error messages with actionable fallback suggestions

## Architecture

### Flow Diagram

```
User enables "Swap SOL to LOTTO" checkbox
    ↓
Frontend: Click "Release Funds"
    ↓
Backend: /distribution/prepare
    ├─→ Jupiter Available + Swap Enabled?
    │   ├─→ YES: Build Jupiter swap transactions for each winner
    │   │   └─→ Return: { swapMode: true, swapTransactions: [...] }
    │   └─→ NO: Build SOL transfer transaction
    │       └─→ Return: { swapMode: false, transaction: "..." }
    ↓
Frontend: Sign transaction(s) with Phantom wallet
    ├─→ Swap Mode: Sign multiple versioned transactions (one per winner)
    └─→ SOL Mode: Sign single legacy transaction
    ↓
Backend: /distribution/broadcast
    ├─→ Swap Mode: Broadcast and confirm each swap transaction
    │   ├─→ SUCCESS: Record swapToLotto = true
    │   └─→ FAILURE: Return error with FALLBACK_TO_SOL action
    └─→ SOL Mode: Broadcast and confirm SOL transfer
        └─→ SUCCESS: Record swapToLotto = false
    ↓
Frontend: Display results
    ├─→ Success: Show transaction signatures on Solscan
    └─→ Failure: Show error with fallback instructions
```

## Files Modified/Created

### Backend

1. **`apps/backend/src/services/jupiter.service.ts`** (NEW)
   - Jupiter Swap API integration
   - Quote fetching with slippage tolerance
   - Versioned transaction building
   - Multi-transaction support for multiple winners
   - Comprehensive error handling

2. **`apps/backend/src/routes/distribution.ts`** (MODIFIED)
   - `/distribution/prepare` endpoint:
     - Added `swapToLotto` and `slippagePercent` parameters
     - Jupiter swap transaction building when enabled
     - Automatic fallback to SOL when swap unavailable
   - `/distribution/broadcast` endpoint:
     - Support for both `signedSwapTransactions` and `signedTransaction`
     - Separate handling for swap mode vs SOL mode
     - Enhanced error handling with fallback suggestions

### Frontend

3. **`apps/frontend/lib/api.ts`** (MODIFIED)
   - Updated `PrepareDistributionResponse` type to support both swap and SOL modes
   - Added `SwapTransaction` type definition
   - Updated `BroadcastDistributionResponse` to include `swapped` status
   - Enhanced error handling for swap failures with fallback detection

4. **`apps/frontend/components/DistributionModule.tsx`** (MODIFIED)
   - Updated `onRelease` function to handle both swap and SOL flows
   - Versioned transaction deserialization for Jupiter swaps
   - Multiple transaction signing for swap mode
   - User-friendly error messages with fallback instructions
   - Display logic for pending swap vs released funds

## Environment Configuration

Required environment variables in `apps/backend/.env`:

```bash
# Token Configuration
LOTTO_MINT_ADDRESS="your_lotto_token_mint_address"
LOTTO_DECIMALS=6
```

## Jupiter API Details

### Endpoints Used

1. **Quote API**: `https://quote-api.jup.ag/v6/quote`
   - Fetches swap quotes with price impact and route information
   - Parameters: inputMint, outputMint, amount, slippageBps

2. **Swap API**: `https://quote-api.jup.ag/v6/swap`
   - Builds unsigned versioned transactions for swaps
   - Parameters: quoteResponse, userPublicKey, wrapAndUnwrapSol, dynamicComputeUnitLimit

### Transaction Type

- **Versioned Transactions**: Jupiter returns v0 transactions with address lookup tables
- **Priority Fees**: Configured with "high" priority (max 0.001 SOL) for faster confirmation
- **Compute Units**: Dynamically calculated by Jupiter API

## Error Handling & Fallback Logic

### Automatic Fallback Scenarios

The system automatically falls back to SOL distribution when:

1. **LOTTO_MINT_ADDRESS not configured** in environment
2. **Jupiter API unavailable** (timeout, network errors, 5xx errors)
3. **No route found** for the swap (insufficient liquidity)
4. **Quote/Swap API errors** (4xx/5xx responses)

### User-Initiated Fallback

When a swap transaction fails during broadcasting:

1. Frontend catches the error with `shouldFallback` flag
2. Displays error message: *"Jupiter swap failed: [details]. Please uncheck 'Swap SOL to LOTTO' and retry with SOL distribution."*
3. User unchecks the swap option and retries with SOL mode

### Blockhash Expiration Handling

Both swap and SOL modes handle blockhash expiration:

- Backend returns `BLOCKHASH_EXPIRED` error with `RETRY_PREPARE_AND_RESIGN` action
- Frontend should implement retry logic (currently shows error to user)

## Transaction Confirmation

### Confirmation Strategy

1. **Initial Attempt**: Use `confirmTransaction` with blockhash and lastValidBlockHeight
2. **Fallback Polling**: If confirmTransaction fails, poll `getSignatureStatuses` for up to 60 seconds
3. **Pending Response**: If still unconfirmed after 60s, return 202 status (SOL mode only)

### Swap Mode Confirmation

Each swap transaction is confirmed individually:
- Sequential processing (one at a time)
- Stops on first failure
- All successful signatures are returned even on partial failure

## Testing Checklist

### Devnet Testing

- [ ] Configure LOTTO_MINT_ADDRESS with devnet token
- [ ] Test SOL distribution (baseline - should work as before)
- [ ] Test Jupiter swap with valid token mint
- [ ] Test swap with insufficient liquidity (should fallback)
- [ ] Test swap with Jupiter API down (should fallback)
- [ ] Test swap with unconfigured LOTTO_MINT (should fallback)
- [ ] Test multiple winners (4 tiers) with swap enabled
- [ ] Test blockhash expiration recovery
- [ ] Verify Solscan links for swap transactions
- [ ] Verify prize amounts are correct in LOTTO

### Mainnet Deployment Preparation

Before deploying to mainnet:

1. **Set LOTTO_MINT_ADDRESS** to mainnet token address
2. **Verify Jupiter liquidity** for SOL/LOTTO pair on mainnet
3. **Test with small amounts** first (0.001 SOL per winner)
4. **Monitor Jupiter API reliability** during test period
5. **Have SOL fallback plan** ready for production rounds

## Security Considerations

### Transaction Signing

✅ **SECURE**: All transactions are signed by operator's Phantom wallet on frontend
- Backend never has access to private keys
- Each transaction requires explicit wallet approval
- User sees transaction details before signing

### Slippage Protection

✅ **PROTECTED**: Slippage tolerance is configurable
- Default: 0.5% (50 bps)
- User can adjust in control configuration
- Jupiter enforces `otherAmountThreshold` based on slippage

### Error Information Disclosure

✅ **SAFE**: Error messages are informative but not overly detailed
- Generic messages for security errors
- Detailed messages for operational errors (swap failures)
- No sensitive data in logs sent to frontend

## Monitoring & Logging

### Backend Logs

The backend provides comprehensive logging:

```
🎁 Preparing distribution transaction for round [roundId]
   Swap to LOTTO: Yes
   Prize Source (Operator): [address]...

🔄 Building Jupiter Swap transactions...
📊 Getting Jupiter quote for [lamports] lamports SOL → LOTTO
   Slippage: 0.5% (50 bps)
   ✅ Quote received:
      Input: [lamports] lamports SOL
      Output: [amount] LOTTO
      Price Impact: [pct]%
      Route: [n] step(s)
   ✅ Built swap for T1: [address]...
   ✅ Built swap for T2: [address]...

✅ Jupiter swap transactions prepared
   Total Input: [amount] SOL
   Expected Output: [amount] LOTTO
   Transactions: [n]
```

### Frontend Console Logs

```
🔍 Distribution Debug: { roundId, jwt, swapToLotto }
📡 Preparing distribution transaction with: { ... }
✅ Transaction prepared: { swapMode, swapTransactions, ... }
🔄 Swap mode enabled - signing [n] Jupiter swap transactions...
   Signing T1 swap for [address]...
   ✅ T1 signed
📡 Broadcasting signed swap transactions...
✅ Swap distribution broadcast response: { swapped: true, ... }
```

## API Reference

### Backend Endpoints

#### POST `/api/distribution/prepare`

**Request Body:**
```typescript
{
  roundId: string
  operatorWalletAddress: string
  swapToLotto?: boolean          // Default: false
  slippagePercent?: number       // Default: 0.5
}
```

**Response (Swap Mode):**
```typescript
{
  swapMode: true,
  swapTransactions: [
    {
      transaction: string,        // Base64 versioned transaction
      tier: string,               // "t1", "t2", "t3", "t4"
      winnerAddress: string,
      expectedLottoAmount: number,
      priceImpact: string
    }
  ],
  blockhash: string,
  lastValidBlockHeight: number,
  winners: [...],
  totalAmountSOL: number,
  totalExpectedLotto: number,
  message: string
}
```

**Response (SOL Mode):**
```typescript
{
  swapMode: false,
  transaction: string,            // Base64 legacy transaction
  blockhash: string,
  lastValidBlockHeight: number,
  winners: [...],
  totalAmount: number,
  message: string
}
```

#### POST `/api/distribution/broadcast`

**Request Body (Swap Mode):**
```typescript
{
  roundId: string,
  signedSwapTransactions: [
    {
      transaction: string,        // Base64 signed versioned transaction
      tier: string,
      winnerAddress: string
    }
  ],
  swapMode: true,
  swapToLotto: true,
  blockhash: string,
  lastValidBlockHeight: number
}
```

**Request Body (SOL Mode):**
```typescript
{
  roundId: string,
  signedTransaction: string,      // Base64 signed legacy transaction
  swapMode: false,
  swapToLotto: false,
  blockhash: string,
  lastValidBlockHeight: number
}
```

**Response:**
```typescript
{
  success: true,
  swapped: boolean,               // Whether Jupiter swap was used
  signature: string,              // First transaction signature
  txSignatures: string[],         // All transaction signatures
  releasedAt: string,             // ISO timestamp
  audit: {
    blockhash: string,
    slot: number
  }
}
```

**Error Response (Swap Failure):**
```typescript
{
  error: "SWAP_FAILED",
  details: string,
  action: "FALLBACK_TO_SOL",
  message: "Jupiter swap failed. Please retry with SOL distribution instead.",
  partialSignatures?: string[]    // If some swaps succeeded before failure
}
```

## Known Limitations

1. **Sequential Swap Execution**: Swap transactions are broadcast sequentially, not in parallel
   - **Reason**: Easier error handling and confirmation
   - **Impact**: Slightly slower for multiple winners (adds ~2-3s per transaction)

2. **No Automatic Retry**: Failed swaps require manual retry by operator
   - **Reason**: Avoid accidental duplicate distributions
   - **Mitigation**: Clear error messages guide operator to fallback

3. **Fixed Priority Fee**: Uses Jupiter's recommended "high" priority level
   - **Reason**: Ensures fast confirmation during network congestion
   - **Impact**: Slightly higher fees (~0.001 SOL per transaction)

4. **No Price Impact Warning**: Large swaps may have significant price impact
   - **Reason**: Not implemented in this version
   - **Mitigation**: Price impact is logged and returned in API response
   - **Future**: Could add frontend warning if price impact > threshold

## Future Enhancements

1. **Price Impact Warning**: Display warning if price impact exceeds configurable threshold (e.g., 2%)
2. **Parallel Transaction Broadcasting**: Broadcast multiple swap transactions in parallel for faster execution
3. **Automatic Retry Logic**: Implement exponential backoff retry for transient failures
4. **Transaction Batching**: Combine multiple swaps into a single transaction using Solana transaction v0 features
5. **Liquidity Check**: Pre-flight check for sufficient LOTTO liquidity before preparing swaps
6. **Alternative DEX Support**: Add support for other Solana DEXs as fallback (Orca, Raydium)
7. **Swap History Tracking**: Store detailed swap execution data (quotes, price impact, route) in database

## Support & Troubleshooting

### Common Issues

**Issue**: "LOTTO_MINT_ADDRESS not configured"
- **Cause**: Environment variable not set
- **Fix**: Add `LOTTO_MINT_ADDRESS="your_token_address"` to `apps/backend/.env`

**Issue**: "Failed to get Jupiter quote: No route found"
- **Cause**: Insufficient liquidity for SOL/LOTTO pair
- **Fix**: Disable swap and use SOL distribution, or add liquidity to DEX

**Issue**: "Swap transaction not confirmed within timeout"
- **Cause**: Network congestion or insufficient priority fee
- **Fix**: Retry with higher priority level (requires code change)

**Issue**: Swap succeeds but UI shows wrong amount
- **Cause**: Mismatch between expected and actual LOTTO amount
- **Fix**: Verify `LOTTO_DECIMALS` is correct in environment (default: 6)

### Debug Mode

To enable verbose logging:

1. Check browser console for frontend logs (automatic)
2. Check backend terminal for API logs (automatic)
3. Inspect Solscan transaction details for on-chain verification

### Contact

For issues or questions:
- Review this document and check environment configuration
- Check backend logs for detailed error messages
- Verify LOTTO token has sufficient DEX liquidity
- Test on devnet before using on mainnet

---

**Document Version**: 1.0
**Last Updated**: October 14, 2025
**Status**: Implementation Complete, Ready for Testing
