# 🚀 Alchemy Integration Setup Guide

This guide covers setting up Alchemy RPC for the Solotto Lottery DApp on Solana devnet.

---

## 📋 Prerequisites

- Node.js 20+ installed
- PostgreSQL database running
- Alchemy account (free tier works for devnet)

---

## Step 1: Create Alchemy Account & Get API Key

### 1.1 Sign Up for Alchemy

1. Go to [https://www.alchemy.com/](https://www.alchemy.com/)
2. Click "Sign Up" and create a free account
3. Verify your email address

### 1.2 Create a Solana App

1. Log into your Alchemy dashboard
2. Click "Create App" or "Create New App"
3. Fill in the details:
   - **Chain**: Solana
   - **Network**: Solana Devnet
   - **Name**: Solotto Lottery Devnet
   - **Description**: Lottery drawing machine for devnet testing

4. Click "Create App"

### 1.3 Get Your API Key

1. Click on your newly created app
2. Click "API Key" or "View Key"
3. Copy your API key (looks like: `abc123xyz456...`)
4. Copy your HTTPS RPC URL (looks like: `https://solana-devnet.g.alchemy.com/v2/YOUR_API_KEY`)

---

## Step 2: Configure Environment Variables

### 2.1 Update Backend .env

Create or update `apps/backend/.env`:

```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/solotto?schema=public"
DATABASE_URL_RO="postgresql://user:password@localhost:5432/solotto?schema=public"

JWT_SECRET="your-secret-key-here"
PORT=4000

# Solana & Alchemy Configuration
SOLANA_NETWORK="devnet"
ALCHEMY_API_KEY="your_alchemy_api_key_here"
ALCHEMY_RPC_URL="https://solana-devnet.g.alchemy.com/v2/YOUR_API_KEY"
SOLANA_RPC_FALLBACK="https://api.devnet.solana.com"

# Token Configuration (will be set after creating test token)
LOTTO_MINT_ADDRESS="your_devnet_token_mint_address"
LOTTO_DECIMALS=6

# Operator Wallet (will be set after generating wallet)
OPERATOR_WALLET_PRIVATE_KEY="your_base58_encoded_private_key"

# Security
HARD_BLACKLIST='["11111111111111111111111111111111"]'
```

### 2.2 Update Frontend .env

Create or update `apps/frontend/.env.local`:

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_RPC_URL=https://solana-devnet.g.alchemy.com/v2/YOUR_API_KEY
NEXT_PUBLIC_NETWORK=devnet
NEXT_PUBLIC_LOTTO_MINT=your_devnet_token_mint_address
```

---

## Step 3: Install Solana CLI (for token creation)

### 3.1 Install Solana CLI

**Windows (PowerShell):**
```powershell
cmd /c "curl https://release.solana.com/stable/solana-install-init-x86_64-pc-windows-msvc.exe --output C:\solana-install-tmp\solana-install-init.exe --create-dirs"
C:\solana-install-tmp\solana-install-init.exe
```

**macOS/Linux:**
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

### 3.2 Configure for Devnet

```bash
solana config set --url devnet
solana config get
```

You should see:
```
RPC URL: https://api.devnet.solana.com
```

---

## Step 4: Create Test SPL Token

### 4.1 Generate Operator Wallet

```bash
# Create a new wallet for the operator
solana-keygen new --outfile ~/solotto-operator-devnet.json

# Display the public key
solana-keygen pubkey ~/solotto-operator-devnet.json

# Set as default keypair
solana config set --keypair ~/solotto-operator-devnet.json
```

**Important:** Save the seed phrase in a secure location!

### 4.2 Airdrop Devnet SOL

```bash
# Airdrop 2 SOL for fees
solana airdrop 2

# Check balance
solana balance
```

You should see: `2 SOL`

### 4.3 Create SPL Token

```bash
# Install SPL Token CLI
cargo install spl-token-cli

# Create the token
spl-token create-token --decimals 6

# Copy the token address (this is your LOTTO_MINT_ADDRESS)
# Example output: Creating token ABC123xyz456...
```

**Copy the token address** and update your `.env` files:
- Set `LOTTO_MINT_ADDRESS` in `apps/backend/.env`
- Set `NEXT_PUBLIC_LOTTO_MINT` in `apps/frontend/.env.local`

### 4.4 Create Token Account & Mint Tokens

```bash
# Create token account for operator
spl-token create-account YOUR_TOKEN_ADDRESS

# Mint 1,000,000 tokens
spl-token mint YOUR_TOKEN_ADDRESS 1000000

# Check balance
spl-token balance YOUR_TOKEN_ADDRESS
```

You should see: `1000000`

### 4.5 Get Operator Private Key

```bash
# Display base58 private key (for OPERATOR_WALLET_PRIVATE_KEY)
# On Linux/macOS:
base58 ~/solotto-operator-devnet.json

# On Windows, you can use an online tool or Node.js:
# node -e "console.log(require('bs58').encode(require('fs').readFileSync('path/to/solotto-operator-devnet.json')))"
```

**Copy the base58 encoded private key** and set `OPERATOR_WALLET_PRIVATE_KEY` in `apps/backend/.env`

⚠️ **SECURITY WARNING**: Never commit this private key to git or share it publicly!

---

## Step 5: Create Test Token Holders

Create multiple test wallets with token balances:

```bash
#!/bin/bash
# Create 10 test holder wallets

TOKEN_MINT="YOUR_TOKEN_ADDRESS_HERE"

for i in {1..10}
do
  echo "Creating holder wallet $i..."

  # Generate wallet
  solana-keygen new --outfile ~/holder-$i.json --no-bip39-passphrase

  # Airdrop SOL for rent
  HOLDER_PUBKEY=$(solana-keygen pubkey ~/holder-$i.json)
  solana airdrop 1 $HOLDER_PUBKEY

  # Create token account
  spl-token create-account $TOKEN_MINT --owner ~/holder-$i.json

  # Transfer random amount of tokens (1000-10000)
  AMOUNT=$((RANDOM % 9000 + 1000))
  HOLDER_TOKEN_ACCOUNT=$(spl-token accounts $TOKEN_MINT --owner ~/holder-$i.json | grep $TOKEN_MINT | awk '{print $1}')
  spl-token transfer $TOKEN_MINT $AMOUNT $HOLDER_TOKEN_ACCOUNT

  echo "✅ Holder $i created with $AMOUNT tokens"
done

echo "🎉 All test holders created!"
```

**Save this as `create-test-holders.sh` and run:**
```bash
chmod +x create-test-holders.sh
./create-test-holders.sh
```

---

## Step 6: Test Alchemy Integration

### 6.1 Run Test Script

```bash
cd apps/backend
npx ts-node scripts/test-alchemy.ts
```

### 6.2 Expected Output

```
🧪 Testing Alchemy Integration

============================================================

📡 Test 1: RPC Connection Health
------------------------------------------------------------
✅ RPC Service initialized
   Primary: Alchemy
   Fallback: https://api.devnet.solana.com
Primary RPC (Alchemy):
  Status: ✅ Healthy
  Current Slot: 123456789

Fallback RPC:
  Status: ✅ Healthy
  Current Slot: 123456789

📡 Test 2: Alchemy API Health
------------------------------------------------------------
✅ Alchemy client initialized
Alchemy API: ✅ Healthy

💰 Test 3: Get Wallet Balance
------------------------------------------------------------
Wallet: 11111111111111111111111111111111
Balance: 1.0 SOL (1000000000 lamports)
✅ Balance query successful

🪙 Test 4: Get Token Holders
------------------------------------------------------------
🔍 Fetching token holders for mint: YOUR_TOKEN_MINT
✅ Found 11 token holders

Top holders:
  1. YOUR_OPERATOR_PUBKEY
     Balance: 990000.000000
     Token Account: ABC123...
  2. HOLDER_1_PUBKEY
     Balance: 5432.000000
     Token Account: DEF456...

🔄 Test 5: Automatic Fallback
------------------------------------------------------------
Testing fallback with multiple operations...
✅ Slot query succeeded: 123456789
✅ Fallback mechanism working

============================================================
🎉 Alchemy Integration Tests Complete
```

### 6.3 Test Health Endpoints

Start your backend server:

```bash
cd apps/backend
npm run dev
```

Test the health endpoints:

```bash
# Database health
curl http://localhost:4000/api/v1/health

# RPC health
curl http://localhost:4000/api/v1/health/rpc

# Alchemy health
curl http://localhost:4000/api/v1/health/alchemy
```

---

## Step 7: Verify Control Module Integration

### 7.1 Start Backend

```bash
cd apps/backend
npm run dev
```

### 7.2 Test Wallet Balance Validation

Create a test lottery config with the Control module. The system will now:

1. ✅ Query the actual wallet balance using Alchemy RPC
2. ✅ Compare it to your provided balance
3. ✅ Reject if mismatch (tolerance: 0.01 SOL)

**Example Request:**

```bash
curl -X POST http://localhost:4000/api/v1/control \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "tokenMint": "YOUR_LOTTO_MINT",
    "tokenDecimals": 6,
    "snapshotStart": "2025-01-01T00:00:00Z",
    "snapshotEnd": "2025-01-07T00:00:00Z",
    "tradePercentage": 50,
    "minUsdLottoRequired": 50,
    "prizeDistributionPercent": 70,
    "slippageTolerancePercent": 0.5,
    "blacklist": [],
    "prizeSourceWallet": "YOUR_WALLET_PUBKEY",
    "prizeSourceBalanceSol": 2.0
  }'
```

---

## 🎉 Success Criteria

You've successfully set up Alchemy integration when:

- ✅ `test-alchemy.ts` runs without errors
- ✅ All 5 tests pass
- ✅ Health endpoints return `ok: true`
- ✅ Control module validates wallet balances on-chain
- ✅ Token holders can be queried via Alchemy API

---

## 🔧 Troubleshooting

### Issue: "Alchemy API key not configured"

**Solution:** Double-check your `.env` file:
```bash
ALCHEMY_API_KEY=your_actual_api_key_here
ALCHEMY_RPC_URL=https://solana-devnet.g.alchemy.com/v2/your_actual_api_key_here
```

### Issue: "Failed to fetch token holders"

**Solution:** Ensure your token mint address is correct:
```bash
spl-token display YOUR_TOKEN_MINT
```

### Issue: "Wallet balance mismatch"

**Solution:** Query actual balance:
```bash
solana balance YOUR_WALLET_PUBKEY
```

Update your request with the actual balance.

### Issue: "Connection timeout"

**Solution:** Check your network connection and try the fallback:
```bash
SOLANA_RPC_FALLBACK=https://api.devnet.solana.com
```

---

## 📚 Next Steps

Now that Alchemy is integrated, you can proceed with:

1. **Phase 1.2**: Snapshot module with real blockchain querying
2. **Phase 1.4**: Cryptographically secure randomness for drawing
3. **Phase 1.5**: SPL token transfers for prize distribution

---

## 🔗 Useful Resources

- [Alchemy Docs - Solana](https://docs.alchemy.com/reference/solana-api-quickstart)
- [Solana Web3.js Docs](https://solana-labs.github.io/solana-web3.js/)
- [SPL Token CLI Guide](https://spl.solana.com/token)
- [Solana Devnet Faucet](https://faucet.solana.com/)

---

**Created**: Phase 1.1 - Alchemy RPC Integration
**Status**: ✅ Complete
