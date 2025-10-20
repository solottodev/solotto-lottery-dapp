# Quick Start - Jupiter Swap Testing

## 5-Minute Setup

### 1. Configure Environment (Windows)

```bash
cd apps/backend/scripts
setup-devnet-swap-testing.bat
```

Or manually edit `apps/backend/.env`:
```bash
LOTTO_MINT_ADDRESS="4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
LOTTO_DECIMALS=6
SOLANA_NETWORK="devnet"
```

### 2. Restart Backend

```bash
cd apps/backend
npm run dev
```

Look for: `Jupiter Service initialized`

### 3. Run Basic Tests

#### Test A: SOL Distribution (Baseline)
1. Complete lottery round
2. **UNCHECK** "Swap SOL to LOTTO"
3. Release funds → Sign 1 transaction
4. ✅ Winners get SOL

#### Test B: Jupiter Swap
1. Complete lottery round (use 0.01 SOL amounts)
2. **CHECK** "Swap SOL to LOTTO"
3. Release funds → Sign 4 transactions (one per winner)
4. ✅ Winners get USDC-Dev (stand-in for LOTTO)

## Expected Console Output

**SOL Mode:**
```
💰 Building SOL transfer transaction...
✅ SOL transaction prepared with 4 transfers
```

**Swap Mode:**
```
🔄 Building Jupiter Swap transactions...
📊 Getting Jupiter quote for X lamports SOL → LOTTO
   ✅ Quote received: X.XX LOTTO
✅ Jupiter swap transactions prepared
   Transactions: 4
```

## What You're Testing

- ✅ Jupiter API integration works
- ✅ Multiple swap transactions sign correctly
- ✅ Fallback to SOL when swap fails
- ✅ Error handling is user-friendly
- ✅ Transaction confirmation works

## Remember

- **USDC-Dev ≠ LOTTO** (just testing mechanics)
- **Small amounts** on devnet (liquidity limited)
- **SOL fallback** is expected behavior
- **Mainnet** will use actual LOTTO token

## For Full Details

- Complete guide: [DEVNET_TESTING_GUIDE.md](DEVNET_TESTING_GUIDE.md)
- Implementation: [JUPITER_SWAP_IMPLEMENTATION.md](JUPITER_SWAP_IMPLEMENTATION.md)

## Mainnet Switch

When ready for production:

```bash
# In apps/backend/.env
LOTTO_MINT_ADDRESS="HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump"
SOLANA_NETWORK="mainnet-beta"
```

Test with 0.001 SOL first! 🚀
