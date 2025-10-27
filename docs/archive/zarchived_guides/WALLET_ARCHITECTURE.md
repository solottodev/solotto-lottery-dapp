# Wallet Architecture - Phantom Integration

**Date:** October 20, 2025
**Status:** ✅ Confirmed - Using Phantom Wallet (Frontend Signing)

---

## Architecture Overview

The Solotto lottery system uses **frontend wallet signing** via Phantom, NOT backend private key storage. This provides superior security and user control.

### ✅ Current Implementation (Correct)

```
┌─────────────────┐
│  Operator UI    │
│  (Frontend)     │
└────────┬────────┘
         │
         │ 1. Login (Email + 2FA)
         ▼
┌─────────────────┐
│  Backend API    │
│  (Express)      │
└────────┬────────┘
         │
         │ 2. Prepare Transaction
         │    (unsigned, read-only RPC)
         ▼
┌─────────────────┐
│  Frontend       │
│  Receives TX    │
└────────┬────────┘
         │
         │ 3. Request Signature
         ▼
┌─────────────────┐
│ Phantom Wallet  │
│ (User's Browser)│
└────────┬────────┘
         │
         │ 4. User Approves & Signs
         ▼
┌─────────────────┐
│  Backend API    │
│  Broadcasts TX  │
└────────┬────────┘
         │
         │ 5. Send to Solana
         ▼
┌─────────────────┐
│ Solana Network  │
│   (Devnet/      │
│    Mainnet)     │
└─────────────────┘
```

---

## Security Benefits

### ✅ Advantages of Phantom Integration

1. **No Private Key on Server**
   - Private keys never leave user's wallet
   - Server breach cannot compromise funds
   - Operator maintains full custody

2. **User Control**
   - Operator must manually approve each transaction
   - Wallet shows transaction details before signing
   - Cannot be automated without user interaction

3. **Transparency**
   - Every transaction requires explicit approval
   - Audit trail of manual approvals
   - Aligns with transparency initiative

4. **No Single Point of Failure**
   - Even if backend is compromised, funds are safe
   - Operator can revoke access anytime
   - Hardware wallet support (Ledger via Phantom)

### ❌ Drawbacks of Backend Private Key (What We Avoided)

1. **High Security Risk**
   - Private key stored on server
   - Server breach = funds stolen
   - Requires extensive security measures

2. **No User Control**
   - Backend can sign transactions automatically
   - Operator loses custody of funds
   - Higher trust requirement

3. **Regulatory Concerns**
   - Custody of operator funds
   - Potential liability issues

---

## Authentication vs Transaction Signing

### Authentication (Email + 2FA)
**Purpose:** Access control for operator dashboard

**What it protects:**
- ✅ Creating lottery rounds
- ✅ Running snapshots
- ✅ Viewing data
- ✅ Preparing transactions

**What it DOESN'T do:**
- ❌ Sign transactions
- ❌ Move funds
- ❌ Access wallet

### Transaction Signing (Phantom Wallet)
**Purpose:** Authorize on-chain transactions

**What it does:**
- ✅ Signs prize distribution transactions
- ✅ Authorizes fund movements
- ✅ Provides cryptographic proof

**What it DOESN'T do:**
- ❌ Authenticate user identity
- ❌ Control dashboard access

---

## Code Flow

### Distribution Example

**Step 1: Backend Prepares Transaction**
```typescript
// apps/backend/src/routes/distribution.ts
router.post('/prepare', requireJwt, async (req, res) => {
  const { roundId, operatorWalletAddress } = req.body;

  // Read-only blockchain queries (no private key needed)
  const winners = await getWinners(roundId);
  const payouts = await getPayouts(roundId);

  // Build unsigned transaction
  const transaction = new Transaction();
  winners.forEach((winner, index) => {
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: new PublicKey(operatorWalletAddress), // From frontend
        toPubkey: new PublicKey(winner),
        lamports: payouts[index] * LAMPORTS_PER_SOL,
      })
    );
  });

  // Get recent blockhash (public operation)
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = new PublicKey(operatorWalletAddress);

  // Return unsigned transaction to frontend
  res.json({
    transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
    blockhash,
  });
});
```

**Step 2: Frontend Signs with Phantom**
```typescript
// apps/frontend/src/components/Distribution.tsx
const handleDistribute = async () => {
  // Get unsigned transaction from backend
  const response = await fetch('/api/v1/distribution/prepare', {
    method: 'POST',
    body: JSON.stringify({ roundId, operatorWalletAddress: wallet.publicKey }),
  });

  const { transaction: txBase64 } = await response.json();

  // Deserialize transaction
  const transaction = Transaction.from(Buffer.from(txBase64, 'base64'));

  // Request signature from Phantom
  const signedTx = await wallet.signTransaction(transaction);

  // Send signed transaction back to backend
  await fetch('/api/v1/distribution/broadcast', {
    method: 'POST',
    body: JSON.stringify({
      signedTransaction: signedTx.serialize().toString('base64'),
    }),
  });
};
```

**Step 3: Backend Broadcasts**
```typescript
// apps/backend/src/routes/distribution.ts
router.post('/broadcast', requireJwt, async (req, res) => {
  const { signedTransaction } = req.body;

  // Deserialize signed transaction
  const transaction = Transaction.from(Buffer.from(signedTransaction, 'base64'));

  // Broadcast to Solana (no private key needed)
  const signature = await connection.sendRawTransaction(transaction.serialize());

  res.json({ signature });
});
```

---

## Unused Code

### WalletService (NOT USED)

The file `apps/backend/src/services/wallet.service.ts` exists but is **NOT used** anywhere in the codebase.

**Options:**
1. **Delete it** - Cleanest approach, removes confusion
2. **Keep it** - For potential future automation features (batch processing, etc.)
3. **Document it** - Mark as unused, keep for reference

**Recommendation:** Keep but document as unused. May be useful for:
- Automated testing with test wallets
- Future batch processing features (if operator wants automation)
- Emergency recovery tools

---

## Environment Variables

### ✅ Required (Current Setup)

```env
# Authentication
JWT_SECRET=<strong-random-secret>

# Database (Read/Write)
DATABASE_URL=<supabase-connection-string>

# Solana RPC (Read-Only)
ALCHEMY_RPC_URL=<alchemy-api-url>
SOLANA_NETWORK=devnet

# Token Info (Read-Only)
LOTTO_MINT_ADDRESS=<token-mint-address>
LOTTO_DECIMALS=6
```

### ❌ NOT Required (Removed)

```env
# NOT NEEDED - Operator uses Phantom wallet
# OPERATOR_WALLET_PRIVATE_KEY=<do-not-use>
# OPERATOR_WALLET_JSON=<do-not-use>
```

---

## Testing Considerations

### E2E Tests

Tests **cannot** fully test transaction broadcasting because:
- No private key in backend environment
- Phantom wallet not available in test environment

**Solutions:**

1. **Mock Transaction Preparation**
   ```typescript
   // Test that transactions are built correctly
   it('should prepare valid transaction', async () => {
     const response = await request(app)
       .post('/api/v1/distribution/prepare')
       .send({ roundId, operatorWalletAddress: testWallet });

     expect(response.body.transaction).toBeTruthy();
     const tx = Transaction.from(Buffer.from(response.body.transaction, 'base64'));
     expect(tx.instructions.length).toBeGreaterThan(0);
   });
   ```

2. **Manual Testing on Devnet**
   - Use real Phantom wallet on staging
   - Test complete flow end-to-end
   - Verify transactions on Solscan

3. **Test Wallets for Automation (Optional)**
   - Create test-specific wallets with private keys
   - Use ONLY in test environment
   - Never use with real funds

---

## Migration Guide (If Needed)

If you ever need to add backend signing (NOT RECOMMENDED):

### When Backend Signing Makes Sense
- ✅ Automated batch processing
- ✅ Scheduled payouts
- ✅ High-frequency operations
- ✅ Emergency recovery tools

### Security Requirements
1. Use hardware wallet (Ledger/Trezor)
2. Store private key in secure vault (AWS KMS, HashiCorp Vault)
3. Implement transaction limits
4. Add multi-signature approval
5. Audit all transactions
6. Regular security audits

---

## Conclusion

**Current Architecture:** ✅ **Optimal for Transparency**

The Phantom wallet integration provides:
- Maximum security (no server-side private keys)
- Full operator control (manual approval required)
- Perfect alignment with transparency initiative
- Industry best practices

**No changes needed** - architecture is correct as-is.

---

**Document Version:** 1.0
**Last Updated:** October 20, 2025
**Status:** Production Ready ✅
