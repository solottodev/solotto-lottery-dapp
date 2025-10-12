# 🌐 Network Configuration Summary

## The Problem

You asked: *"Can we use the same mint address `HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump` on devnet?"*

**Answer:** ❌ **No** - Mainnet and devnet are completely separate blockchains with separate state.

---

## The Solution

✅ **Network-Specific Configuration System**

I've created an intelligent configuration system that automatically switches between devnet (testing) and mainnet (production) based on environment variables.

---

## How It Works

### 1. Network Configuration File

**Location:** `apps/backend/src/config/networks.ts`

```typescript
// Automatically selects based on SOLANA_NETWORK env var

// For Testing (Devnet)
const DEVNET_CONFIG = {
  network: 'devnet',
  lottoMint: 'YOUR_DEVNET_TEST_TOKEN',  // Different address
  rpcUrl: 'https://solana-devnet.g.alchemy.com/v2/KEY',
};

// For Production (Mainnet)
const MAINNET_CONFIG = {
  network: 'mainnet-beta',
  lottoMint: 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump',  // Real $LOTTO
  rpcUrl: 'https://solana-mainnet.g.alchemy.com/v2/KEY',
};
```

### 2. Automatic Network Detection

The RPC service now automatically uses the correct configuration:

```typescript
import { getNetworkConfig } from '../config/networks';

const networkConfig = getNetworkConfig();
// Returns DEVNET_CONFIG or MAINNET_CONFIG based on env
```

### 3. Easy Switching

Just change one environment variable:

```bash
# For Devnet Testing
SOLANA_NETWORK=devnet

# For Mainnet Deployment
SOLANA_NETWORK=mainnet-beta
```

---

## What You Need to Do

### Step 1: Create Devnet Test Token

Follow the guide: [DEVNET_TOKEN_SETUP.md](./DEVNET_TOKEN_SETUP.md)

Quick version:
```bash
# 1. Set to devnet
solana config set --url devnet

# 2. Create wallet & airdrop SOL
solana-keygen new --outfile ~/solotto-operator-devnet.json
solana airdrop 2

# 3. Create token (matching mainnet: 6 decimals)
spl-token create-token --decimals 6
# Copy the token address: ABC123xyz...

# 4. Mint tokens
spl-token create-account ABC123xyz...
spl-token mint ABC123xyz... 1000000
```

### Step 2: Update Environment Files

#### `apps/backend/.env` (for devnet testing)

```bash
SOLANA_NETWORK=devnet

ALCHEMY_API_KEY=your_key
ALCHEMY_RPC_URL=https://solana-devnet.g.alchemy.com/v2/your_key

LOTTO_MINT_ADDRESS=ABC123xyz...  # ← Your devnet test token
LOTTO_DECIMALS=6

OPERATOR_WALLET_PRIVATE_KEY=your_base58_key
```

#### `apps/frontend/.env.local` (for devnet testing)

```bash
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_LOTTO_MINT=ABC123xyz...  # ← Your devnet test token
NEXT_PUBLIC_RPC_URL=https://solana-devnet.g.alchemy.com/v2/your_key
```

---

## Testing vs Production

| Environment | Network | Token Mint | Purpose |
|------------|---------|-----------|---------|
| **Development** | devnet | `ABC123xyz...` (your test token) | Testing features |
| **Staging** | devnet | `ABC123xyz...` (your test token) | Pre-launch testing |
| **Production** | mainnet-beta | `HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump` | Live lottery |

---

## Benefits of This Approach

✅ **Same Codebase** - No code changes needed to switch networks
✅ **Type Safety** - TypeScript ensures correct configuration
✅ **Explorer Links** - Automatically generates correct Solscan URLs
✅ **Error Prevention** - Can't accidentally use mainnet config on devnet
✅ **Easy Testing** - Create unlimited test tokens and holders
✅ **Full Control** - You own the devnet token mint authority

---

## Example: Testing Workflow

```bash
# 1. Start with devnet for development
SOLANA_NETWORK=devnet npm run dev

# 2. Test all features with test token
# - Create lottery config
# - Generate snapshot (queries your test holders)
# - Execute drawing (selects from test participants)
# - Distribute prizes (sends to test wallets)

# 3. Deploy to mainnet when ready
SOLANA_NETWORK=mainnet-beta npm start
# Now uses real $LOTTO token: HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump
```

---

## Files Created

```
apps/backend/src/config/
  └── networks.ts  ✅ NEW - Network configuration

Documentation/
  ├── DEVNET_TOKEN_SETUP.md  ✅ NEW - Token creation guide
  └── NETWORK_CONFIGURATION_SUMMARY.md  ✅ NEW - This file
```

---

## Next Steps

1. **Create your devnet test token** (15 minutes)
   - Follow [DEVNET_TOKEN_SETUP.md](./DEVNET_TOKEN_SETUP.md)

2. **Create test holder wallets** (10 minutes)
   - Use the provided script in the setup guide

3. **Test the integration** (5 minutes)
   ```bash
   npx ts-node scripts/test-alchemy.ts
   ```

4. **Start building Phase 1.2** (Snapshot module)
   - Now you have real test holders to query!

---

## Quick Reference

### Mainnet $LOTTO Info
```
Token: LOTTO
Symbol: LOTTO
Mint: HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump
Decimals: 6
Network: mainnet-beta
```

### Your Devnet Test Token (to be created)
```
Token: LOTTO (Test)
Symbol: LOTTO
Mint: <you will create this>
Decimals: 6
Network: devnet
```

---

## Questions?

- ✅ **Can I use the same code for both networks?** Yes! Just change `SOLANA_NETWORK`
- ✅ **Do I need different Alchemy apps?** Yes, one for devnet, one for mainnet
- ✅ **Can I test mainnet features on devnet?** Yes, all features work identically
- ✅ **What about pricing data?** Devnet tokens have no value, use mock prices for testing

---

**Ready to create your devnet token?** → [DEVNET_TOKEN_SETUP.md](./DEVNET_TOKEN_SETUP.md)
