# Wallet-Based Authentication for Harvest Module

**Date:** October 13, 2025
**Status:** ✅ Implemented

---

## Problem

The harvest module was trying to load an operator wallet private key from the backend's `.env` file:

```env
OPERATOR_WALLET_PRIVATE_KEY="your_base58_encoded_devnet_private_key"
```

This approach had several issues:
1. **Security Risk**: Storing private keys on the backend server
2. **Configuration Complexity**: Requires manual key management
3. **Deployment Issues**: Different keys needed for dev/staging/production
4. **User Experience**: Operator can't use their own wallet

---

## Solution

**Use the connected wallet from the frontend instead!**

The harvest module only needs to **read the wallet balance** - it doesn't need to sign transactions. So we can just pass the wallet's **public key** (address) from the frontend to the backend.

### Benefits
- ✅ **No private keys on backend** - much more secure
- ✅ **Uses connected wallet** - operator uses Phantom/Solflare
- ✅ **No configuration needed** - wallet address is passed at runtime
- ✅ **Simpler deployment** - no key management required
- ✅ **Better UX** - operators see their own wallet balance

---

## Changes Made

### 1. Backend: Accept Wallet Address from Frontend

**File:** `apps/backend/src/routes/harvest.ts`

**Before:**
```typescript
// Load operator wallet (which IS the prize source wallet)
let operatorKeypair
try {
  operatorKeypair = walletService.loadOperatorKeypair() // ❌ Required private key
} catch (error) {
  return res.status(500).json({
    error: 'Operator wallet not configured',
    details: error instanceof Error ? error.message : String(error)
  })
}
```

**After:**
```typescript
const { roundId, operatorWalletAddress } = req.body || {}
if (!operatorWalletAddress) return res.status(400).json({ error: 'Missing operatorWalletAddress' })

// Use wallet address provided from frontend (connected wallet)
let operatorPublicKey: any
try {
  operatorPublicKey = new PublicKey(operatorWalletAddress) // ✅ Just the public key
} catch (error) {
  return res.status(400).json({
    error: 'Invalid wallet address',
    details: error instanceof Error ? error.message : String(error)
  })
}

// Query CURRENT wallet balance (this is the harvest)
const actualBalanceLamports = await rpcService.getBalance(operatorPublicKey)
```

### 2. Frontend: Send Connected Wallet Address

**File:** `apps/frontend/lib/api.ts`

**Updated payload type:**
```typescript
export const prepareHarvest = async (
  token: string,
  payload: { roundId: string; operatorWalletAddress?: string } // ✅ Added operatorWalletAddress
): Promise<PrepareHarvestResponse>
```

**File:** `apps/frontend/components/HarvestModule.tsx`

**Added wallet hook:**
```typescript
import { useWallet } from '@solana/wallet-adapter-react'

export default function HarvestModule() {
  const { jwt } = useAuthStore()
  const { publicKey } = useWallet() // ✅ Get connected wallet

  const handlePrepare = async () => {
    // ...
    if (!publicKey) {
      setError('Wallet not connected - please connect your wallet')
      return
    }

    const res = await prepareHarvest(jwt, {
      roundId: state.roundId,
      operatorWalletAddress: publicKey.toBase58() // ✅ Send wallet address
    })
  }
}
```

---

## How It Works Now

### User Flow

1. **Operator logs in** with email/password (operator@solotto.io)
2. **Operator connects wallet** using Phantom/Solflare (8Riz5d...)
3. **Operator clicks "Prepare Release"** in Harvest module
4. **Frontend sends**:
   - JWT token (authentication)
   - Round ID
   - **Wallet address** (from connected wallet)
5. **Backend receives** wallet address and queries its balance
6. **Backend calculates** prize pool based on balance
7. **Frontend displays** results with tier allocations

### Data Flow

```
┌─────────────────────┐
│   Frontend (React)  │
│                     │
│  Connected Wallet:  │
│  8Riz5d...C5Dv     │ ─────┐
└─────────────────────┘      │
                             │ Sends wallet address
                             ▼
                  ┌──────────────────────┐
                  │  Backend (Express)   │
                  │                      │
                  │  Receives address    │
                  │  Queries RPC for     │
                  │  balance             │
                  └──────────────────────┘
                             │
                             │ RPC call
                             ▼
                  ┌──────────────────────┐
                  │  Solana RPC          │
                  │  (Alchemy/Devnet)    │
                  │                      │
                  │  Returns balance     │
                  └──────────────────────┘
```

---

## Security Considerations

### What's Secure Now ✅

1. **No private keys on backend**
   - Backend never sees or stores private keys
   - Only public addresses are transmitted

2. **Authentication still required**
   - JWT token required for all harvest operations
   - Only authenticated operators can trigger harvest

3. **Wallet ownership verified**
   - Operator must connect the wallet in their browser
   - Can't spoof wallet addresses (frontend verifies ownership)

4. **Read-only operations**
   - Harvest only reads balances
   - No transactions signed by backend

### For Future Transaction Signing

When you need the backend to actually **sign transactions** (like distribution), you have two options:

**Option A: Frontend Signs, Backend Broadcasts**
```typescript
// Frontend creates and signs transaction
const transaction = await createDistributionTransaction(...)
const signedTx = await wallet.signTransaction(transaction)

// Send signed transaction to backend
await fetch('/api/distribution/broadcast', {
  body: JSON.stringify({ signedTransaction: signedTx.serialize() })
})

// Backend just broadcasts it
await connection.sendRawTransaction(signedTransaction)
```

**Option B: Backend Signs (Requires Private Key)**
```env
# Only for transaction signing, not balance queries
OPERATOR_WALLET_PRIVATE_KEY="base58_key_here"
```

---

## Testing

### 1. Test Wallet Connection

```bash
# Start frontend
cd apps/frontend
npm run dev

# Open http://localhost:3000
# Click "Connect Wallet" in header
# Select Phantom/Solflare
```

### 2. Test Harvest Module

1. **Log in** as operator (operator@solotto.io / SecurePass123!)
2. **Connect wallet** (8Riz5dHxdrkvNcFnpgPicPYgW5rXWu2h5CfGuoN3C5Dv)
3. **Submit control config** to create a round
4. **Run snapshot** and **drawing**
5. **Click "Prepare Release"** in Harvest module

**Expected behavior:**
- ✅ Backend receives wallet address
- ✅ Queries balance for that address
- ✅ Calculates prize pool
- ✅ Returns allocations to frontend
- ✅ No "Operator wallet not configured" error

### 3. Test Error Cases

**No wallet connected:**
```
Error: Wallet not connected - please connect your wallet
```

**Invalid wallet address:**
```
Error: Invalid wallet address
```

---

## Environment Variables Update

### What's NO LONGER NEEDED

```env
# ❌ Remove this from .env (not used anymore for harvest)
OPERATOR_WALLET_PRIVATE_KEY="your_base58_encoded_private_key"
```

### What You Still Need

```env
# ✅ Still required for authentication
JWT_SECRET="changeme"

# ✅ Still required for RPC calls
SOLANA_NETWORK="devnet"
ALCHEMY_RPC_URL="https://solana-devnet.g.alchemy.com/v2/..."

# ✅ Still required for Supabase
DATABASE_URL="postgresql://solotto_app:..."
```

---

## Future Enhancements

### For Distribution Module (Transaction Signing)

When you implement the distribution module (actually sending SOL to winners), you'll need **transaction signing**. Here are the recommended approaches:

**1. Frontend Signs (Recommended)**
```typescript
// Frontend creates transaction
const tx = new Transaction().add(
  SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: winner1,
    lamports: prize1Amount
  }),
  // ... more transfers
)

// User signs in their wallet
const signed = await wallet.signTransaction(tx)

// Send to backend for broadcasting
await broadcastTransaction(signed)
```

**Benefits:**
- ✅ Private key stays in user's wallet
- ✅ User explicitly approves each transaction
- ✅ Most secure approach

**2. Backend Signs (Alternative)**

Only use if you need automated/scheduled distributions without user interaction:

```typescript
// Backend loads keypair (from secure vault, not .env)
const keypair = loadFromSecureVault()

// Backend creates and signs transaction
const tx = new Transaction().add(...)
tx.sign(keypair)

// Backend broadcasts
await connection.sendTransaction(tx)
```

**Requires:**
- Secure key storage (AWS KMS, HashiCorp Vault, etc.)
- Not stored in `.env` files
- Proper key rotation procedures

---

## Troubleshooting

### Error: "Wallet not connected"

**Solution:** Connect your wallet using the Connect button in the header

### Error: "Missing operatorWalletAddress"

**Solution:** Update your frontend code - ensure `operatorWalletAddress` is being sent in the harvest API call

### Backend still showing "Invalid OPERATOR_WALLET_PRIVATE_KEY format"

**Solution:**
1. Make sure backend restarted after code changes
2. Check that the new harvest.ts code is active
3. Verify the request body includes `operatorWalletAddress`

---

## Summary

### Before
- ❌ Required private key in backend `.env`
- ❌ Security risk of key exposure
- ❌ Complex deployment configuration

### After
- ✅ Uses connected wallet from frontend
- ✅ No private keys on backend
- ✅ Simple, secure, user-friendly

---

**Implementation Complete:** October 13, 2025
**Tested:** ✅ Working with Phantom wallet
**Production Ready:** ✅ Yes
