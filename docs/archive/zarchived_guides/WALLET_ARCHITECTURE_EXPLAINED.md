# Wallet Architecture - How Signing Works

**Quick Answer:** You're right! You **don't need** to add an operator wallet private key to the backend. Your architecture uses **frontend signing** via Phantom.

---

## 🏗️ Your Current Architecture (Frontend Signing)

### How It Actually Works

```
┌─────────────────────────────────────────────────────────┐
│                    Operator Dashboard                    │
│                                                          │
│  1. Operator connects Phantom wallet                    │
│  2. Dashboard calls: POST /distribution/prepare          │
│  3. Backend returns UNSIGNED transactions                │
│  4. Frontend prompts Phantom to SIGN transactions        │
│  5. Frontend broadcasts signed transactions              │
└─────────────────────────────────────────────────────────┘
```

### Code Flow

**Backend** ([apps/backend/src/routes/distribution.ts](apps/backend/src/routes/distribution.ts)):
```typescript
// Backend receives operator wallet address from frontend
router.post('/prepare', requireJwt, async (req, res) => {
  const { operatorWalletAddress } = req.body; // From Phantom!

  // Backend creates UNSIGNED transaction
  const fromPubkey = new PublicKey(operatorWalletAddress);

  // Returns unsigned transaction for frontend to sign
  return res.json({
    swapTransactions: [...], // Unsigned!
    message: 'Please sign these transactions'
  });
});
```

**Frontend** (your operator dashboard):
```typescript
// 1. Get operator wallet from Phantom
const { publicKey } = useWallet();

// 2. Request unsigned transaction from backend
const response = await fetch('/distribution/prepare', {
  body: JSON.stringify({
    operatorWalletAddress: publicKey.toBase58() // Send wallet address
  })
});

// 3. Sign transaction with Phantom
const signed = await signTransaction(response.swapTransactions[0]);

// 4. Broadcast
await connection.sendRawTransaction(signed.serialize());
```

---

## ✅ Why This Architecture is Better

### Security Benefits
1. **No Private Keys on Server** - Backend never has access to private keys
2. **Explicit Approval** - Operator must manually approve each distribution
3. **Hardware Wallet Support** - Can use Ledger/Trezor via Phantom
4. **Audit Trail** - Each distribution requires explicit operator action

### Operational Benefits
1. **Transparency** - Clear operator action for each distribution
2. **Accountability** - Operator must be present to distribute prizes
3. **Flexibility** - Can use any wallet, change wallets anytime
4. **No Key Rotation** - Don't need to rotate backend keys

---

## 🔑 Two Wallets Explained

### 1. Operator Wallet (Phantom Connected - Frontend)
- **Connects:** Via Phantom in operator dashboard
- **Purpose:** Signs prize distribution transactions
- **Private Key:** Stays in Phantom, never exposed
- **Used For:**
  - Signing distribution transactions
  - Paying transaction fees
  - Actually sending prizes to winners

### 2. Infrastructure Wallet (Prize Pool Source)
- **Connects:** Also via Phantom, but just for reading balance
- **Purpose:** Holds the SOL that will become prizes
- **Private Key:** Not needed by backend (just reads balance)
- **Used For:**
  - Checking available balance for prize pool
  - Source address that holds funds
  - Display in UI

**Note:** These can be the **same wallet**! The operator can use one wallet for both:
- Reading balance (infrastructure)
- Signing transactions (operator)

---

## 📝 Updated Deployment Instructions

### What You DON'T Need:
- ❌ Backend operator wallet private key
- ❌ Generate keypair with solana-keygen
- ❌ Store private key in environment variables
- ❌ Worry about key rotation

### What You DO Need:
- ✅ Operator has a mainnet wallet (Phantom, Ledger, etc.)
- ✅ Operator wallet funded with SOL for transaction fees (~0.1 SOL)
- ✅ Infrastructure wallet funded with prize pool SOL
- ✅ Operator manually signs distributions via Phantom

### Environment Variable Update

In your `apps/backend/.env.production`:
```env
# This line can be REMOVED or set to a dummy value
OPERATOR_WALLET_PRIVATE_KEY="NOT_USED_FRONTEND_SIGNING"
```

---

## 🔄 Distribution Workflow

### Step-by-Step Process

**1. Create Round**
- Operator logs into dashboard (email + 2FA)
- Creates new lottery round configuration
- Sets infrastructure wallet address (where prize pool SOL is)

**2. Snapshot & Drawing**
- Backend fetches LOTTO holders (automated)
- Backend selects winners (automated)
- Backend calculates prizes (automated)

**3. Distribution** (Requires Operator Action)
```typescript
// Frontend flow:
1. Operator clicks "Distribute Prizes" in dashboard
2. Operator wallet connects via Phantom
3. Backend prepares unsigned transactions (Jupiter swaps or SOL transfers)
4. Frontend displays transaction preview
5. Operator clicks "Sign and Send"
6. Phantom prompts: "Sign transaction?"
7. Operator approves in Phantom
8. Frontend broadcasts signed transaction
9. Prizes sent to winners!
```

**4. Verification**
- Frontend confirms transaction success
- Backend records distribution in database
- Transparency portal shows distributed prizes

---

## 🆚 Comparison: Frontend vs Backend Signing

| Aspect | Frontend Signing (Your Implementation) | Backend Signing (Alternative) |
|--------|---------------------------------------|-------------------------------|
| **Security** | ✅ Private key never on server | ⚠️ Private key on server |
| **Automation** | ❌ Requires operator presence | ✅ Fully automated |
| **Approval** | ✅ Explicit per distribution | ❌ Automatic |
| **Hardware Wallet** | ✅ Can use Ledger/Trezor | ❌ Can't use hardware wallet |
| **Key Rotation** | ✅ Change wallet anytime | ⚠️ Must update env vars |
| **Audit** | ✅ Clear operator action | ⚠️ Backend signs automatically |
| **Scheduled Draws** | ❌ Operator must be present | ✅ Can schedule |

### Which is Better?

**Your current approach (frontend signing) is better for:**
- Security-first applications ✅
- Regulatory compliance (explicit approval)
- Smaller operations where operator presence is acceptable
- When transparency of operator actions is important

**Backend signing would be better for:**
- Fully automated, scheduled distributions
- High-frequency draws (daily/hourly)
- When operator can't be available 24/7
- Larger scale operations

**For Solotto:** Frontend signing is the right choice! ✅

---

## 🔒 Security Considerations

### Current Setup (Secure)
```
✅ Private key: In operator's Phantom wallet (never exposed)
✅ Backend: Only stores public keys
✅ Transactions: Signed in browser, not on server
✅ Verification: Operator reviews each transaction before signing
```

### What to Protect
1. **Operator Dashboard Access**
   - Email + password + 2FA
   - Only authorized operators can login
   - JWT tokens expire after 1 hour

2. **Operator Wallet**
   - Secure Phantom wallet password
   - Consider hardware wallet (Ledger) for extra security
   - Keep seed phrase offline and secure

3. **Infrastructure Wallet**
   - Holds prize pool funds
   - Monitor balance regularly
   - Set up alerts for unexpected changes

---

## 📋 Deployment Checklist Update

### Before Deployment
- ✅ Operator has mainnet Phantom wallet
- ✅ Operator wallet funded with ~0.1-1 SOL (for tx fees)
- ✅ Infrastructure wallet funded with prize pool
- ✅ Test signing flow on devnet
- ❌ ~~Generate backend operator keypair~~ (NOT NEEDED)
- ❌ ~~Store private key in env vars~~ (NOT NEEDED)

### After Deployment
- ✅ Operator can login to dashboard
- ✅ Operator can connect Phantom wallet
- ✅ Test distribution flow on small amount
- ✅ Verify Phantom signing works
- ✅ Confirm prizes arrive at winner addresses

---

## 🎯 Summary

**Your question was 100% correct!**

You **don't need** to configure an operator wallet private key in the backend because:

1. Your architecture uses **frontend signing** via Phantom
2. Backend only **prepares** unsigned transactions
3. Frontend (operator dashboard) **signs** with Phantom
4. This is **more secure** than storing private keys on the server

**Action Items:**
- ✅ Keep `OPERATOR_WALLET_PRIVATE_KEY="NOT_USED_FRONTEND_SIGNING"` in .env
- ✅ Operator uses their Phantom wallet to sign distributions
- ✅ No need to generate or store private keys on backend
- ✅ This is the correct and secure approach!

---

**Your implementation is solid!** The frontend signing architecture is actually the best practice for your use case. 🎉
