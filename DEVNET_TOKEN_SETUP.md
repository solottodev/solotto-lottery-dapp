# 🪙 Devnet Token Setup Guide

## Understanding Network Separation

**Important:** Solana mainnet and devnet are completely separate blockchains. You **cannot** use the same token mint address on both networks.

### Your Mainnet $LOTTO Token
```
Mint Address: HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump
Network: mainnet-beta
Status: Live on mainnet
```

### You Need a Devnet Test Token
```
Mint Address: (You will create this)
Network: devnet
Purpose: Testing the lottery system before mainnet deployment
```

---

## 🎯 Solution: Network-Specific Configuration

I've created a network configuration system that lets you easily switch between devnet (testing) and mainnet (production):

### File Structure
```
apps/backend/src/config/
└── networks.ts  ← Network configurations
```

### How It Works

The system automatically selects the correct configuration based on `SOLANA_NETWORK` environment variable:

```typescript
// Devnet configuration (for testing)
const DEVNET_CONFIG = {
  network: 'devnet',
  lottoMint: 'YOUR_DEVNET_TEST_TOKEN',  // Different address
  rpcUrl: 'https://solana-devnet.g.alchemy.com/v2/KEY',
};

// Mainnet configuration (for production)
const MAINNET_CONFIG = {
  network: 'mainnet-beta',
  lottoMint: 'HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump',  // Real $LOTTO
  rpcUrl: 'https://solana-mainnet.g.alchemy.com/v2/KEY',
};
```

---

## 📝 Step-by-Step: Create Your Devnet Test Token

### Step 1: Install Solana CLI

**Windows:**
```powershell
cmd /c "curl https://release.solana.com/stable/solana-install-init-x86_64-pc-windows-msvc.exe --output C:\solana-install-tmp\solana-install-init.exe --create-dirs"
C:\solana-install-tmp\solana-install-init.exe
```

**macOS/Linux:**
```bash
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"
```

**Verify Installation:**
```bash
solana --version
# Should show: solana-cli 1.18.x
```

---

### Step 2: Configure for Devnet

```bash
# Set CLI to devnet
solana config set --url devnet

# Verify
solana config get
# Should show: RPC URL: https://api.devnet.solana.com
```

---

### Step 3: Create Operator Wallet

```bash
# Generate new keypair
solana-keygen new --outfile ~/solotto-devnet-operator.json

# IMPORTANT: Save the seed phrase shown!
# Example output:
# pubkey: 7xKQp2Lm9Dv3Zr8Hs4Tj6Np1Qk5Fy8Wm3Vn2Rd4Cx1Ea

# Set as default keypair
solana config set --keypair ~/solotto-devnet-operator.json

# Check address
solana address
```

**Copy your wallet address** - you'll need it for `.env` configuration.

---

### Step 4: Airdrop Devnet SOL

```bash
# Request 2 SOL (for transaction fees)
solana airdrop 2

# Verify balance
solana balance
# Should show: 2 SOL
```

**Note:** If airdrop fails, try again or use the [Solana Faucet](https://faucet.solana.com/)

---

### Step 5: Create SPL Token

```bash
# Install SPL Token CLI (if not already installed)
cargo install spl-token-cli

# Create token with 6 decimals (matching mainnet $LOTTO)
spl-token create-token --decimals 6

# Example output:
# Creating token ABC123xyz456def789ghi012jkl345mno678pqr
#
# Address: ABC123xyz456def789ghi012jkl345mno678pqr
# Decimals: 6
```

**✅ COPY THIS ADDRESS!** This is your `LOTTO_MINT_ADDRESS` for devnet.

---

### Step 6: Create Token Account & Mint Supply

```bash
# Create token account for your operator wallet
spl-token create-account YOUR_TOKEN_ADDRESS

# Mint initial supply (1 million tokens for testing)
spl-token mint YOUR_TOKEN_ADDRESS 1000000

# Verify balance
spl-token balance YOUR_TOKEN_ADDRESS
# Should show: 1000000
```

---

### Step 7: Create Test Holder Wallets

Create 10-20 test wallets with varying token balances to simulate real holders:

**Save this script as `create-devnet-holders.sh`:**

```bash
#!/bin/bash

# Configuration
TOKEN_MINT="YOUR_TOKEN_ADDRESS_HERE"  # Replace with your token address
NUM_HOLDERS=10

echo "Creating $NUM_HOLDERS test holder wallets..."

for i in $(seq 1 $NUM_HOLDERS)
do
  echo ""
  echo "========================================="
  echo "Creating Holder #$i"
  echo "========================================="

  # Generate wallet
  solana-keygen new --outfile ~/devnet-holder-$i.json --no-bip39-passphrase

  # Get public key
  HOLDER_PUBKEY=$(solana-keygen pubkey ~/devnet-holder-$i.json)
  echo "Address: $HOLDER_PUBKEY"

  # Airdrop SOL for rent-exempt balance
  echo "Requesting devnet SOL..."
  solana airdrop 0.5 $HOLDER_PUBKEY
  sleep 2  # Rate limit

  # Create token account
  echo "Creating token account..."
  spl-token create-account $TOKEN_MINT --owner ~/devnet-holder-$i.json

  # Transfer random amount of tokens (simulating different tiers)
  if [ $i -le 2 ]; then
    # Tier 1: 100,000 - 200,000 tokens
    AMOUNT=$((100000 + RANDOM % 100000))
  elif [ $i -le 5 ]; then
    # Tier 2: 50,000 - 99,999 tokens
    AMOUNT=$((50000 + RANDOM % 50000))
  elif [ $i -le 8 ]; then
    # Tier 3: 10,000 - 49,999 tokens
    AMOUNT=$((10000 + RANDOM % 40000))
  else
    # Tier 4: 1,000 - 9,999 tokens
    AMOUNT=$((1000 + RANDOM % 9000))
  fi

  echo "Transferring $AMOUNT tokens..."
  spl-token transfer $TOKEN_MINT $AMOUNT $HOLDER_PUBKEY

  echo "✅ Holder #$i created with $AMOUNT tokens"
  sleep 1  # Rate limit
done

echo ""
echo "========================================="
echo "🎉 All holders created successfully!"
echo "========================================="
echo ""
echo "Summary:"
spl-token accounts $TOKEN_MINT
```

**Run the script:**
```bash
chmod +x create-devnet-holders.sh
./create-devnet-holders.sh
```

---

### Step 8: Update Environment Files

#### Backend `.env`

```bash
# Network Configuration
SOLANA_NETWORK=devnet  # ← For testing

# Alchemy (Devnet)
ALCHEMY_API_KEY=your_alchemy_api_key
ALCHEMY_RPC_URL=https://solana-devnet.g.alchemy.com/v2/YOUR_KEY

# Token Configuration (Devnet)
LOTTO_MINT_ADDRESS=ABC123xyz456def789ghi012jkl345mno678pqr  # ← Your devnet token
LOTTO_DECIMALS=6

# Operator Wallet
OPERATOR_WALLET_PRIVATE_KEY=base58_encoded_private_key
```

#### Frontend `.env.local`

```bash
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
NEXT_PUBLIC_RPC_URL=https://solana-devnet.g.alchemy.com/v2/YOUR_KEY
NEXT_PUBLIC_NETWORK=devnet  # ← For testing
NEXT_PUBLIC_LOTTO_MINT=ABC123xyz456def789ghi012jkl345mno678pqr  # ← Your devnet token
```

---

## 🚀 Verify Setup

### Test 1: Check Token Supply

```bash
spl-token supply YOUR_TOKEN_ADDRESS
# Should show: 1000000
```

### Test 2: List Token Holders

```bash
spl-token accounts YOUR_TOKEN_ADDRESS --owner $(solana address)
```

### Test 3: Run Alchemy Integration Test

```bash
cd apps/backend
npx ts-node scripts/test-alchemy.ts
```

Expected output:
```
🪙 Test 4: Get Token Holders
------------------------------------------------------------
🔍 Fetching token holders for mint: ABC123xyz...
✅ Found 11 token holders

Top holders:
  1. 7xKQp... (Operator)
     Balance: 890000.000000
  2. 9WzDX... (Holder 1)
     Balance: 145320.000000
  ...
```

---

## 🔄 Switching Between Networks

### For Devnet Testing

```bash
# Backend .env
SOLANA_NETWORK=devnet
LOTTO_MINT_ADDRESS=<your_devnet_token>
ALCHEMY_RPC_URL=https://solana-devnet.g.alchemy.com/v2/KEY
```

### For Mainnet Deployment

```bash
# Backend .env
SOLANA_NETWORK=mainnet-beta
LOTTO_MINT_ADDRESS=HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump
ALCHEMY_RPC_URL=https://solana-mainnet.g.alchemy.com/v2/KEY
```

The code automatically uses the correct configuration!

---

## 📊 Token Comparison

| Aspect | Mainnet $LOTTO | Devnet Test Token |
|--------|----------------|-------------------|
| **Mint Address** | `HJSnJaQv3u4ZyvPXiQPTyBsYJpggWsZvVH8yedjBpump` | `ABC123...` (your devnet address) |
| **Network** | mainnet-beta | devnet |
| **Decimals** | 6 | 6 (match mainnet) |
| **Purpose** | Real lottery draws | Testing & development |
| **Holders** | Real users | Test wallets you create |
| **Value** | Real | Test (no value) |
| **Control** | Limited (live token) | Full (you own mint authority) |

---

## 🔧 Troubleshooting

### "Error: Invalid mint address"

**Check:**
```bash
spl-token display YOUR_TOKEN_ADDRESS
```

If it says "Account not found", you're on the wrong network or wrong address.

### "Insufficient SOL for transaction"

**Solution:**
```bash
solana airdrop 2
```

### "Rate limit exceeded"

**Solution:** Wait 30 seconds and try again. Devnet faucets have rate limits.

### "Token account already exists"

**This is fine!** It means the account was already created.

---

## 💡 Pro Tips

1. **Save your keypair files securely** - you can't recover them without the seed phrase
2. **Label your wallets** - rename files to `operator.json`, `holder-1.json`, etc.
3. **Document addresses** - keep a spreadsheet of all test wallet addresses
4. **Automate testing** - use the holder creation script for quick resets
5. **Match mainnet** - use same decimals (6) and similar token distribution

---

## 🎯 Next Steps

Once you have:
- ✅ Devnet operator wallet created
- ✅ Devnet test token minted
- ✅ Test holder wallets with balances
- ✅ Environment files updated

You can proceed with:
1. **Testing snapshot generation** with real devnet holders
2. **Testing lottery drawings** with your test token
3. **Testing prize distribution** to test holders

---

## 🔗 Resources

- [Solana CLI Docs](https://docs.solana.com/cli)
- [SPL Token CLI](https://spl.solana.com/token)
- [Devnet Faucet](https://faucet.solana.com/)
- [Solscan Devnet Explorer](https://solscan.io/?cluster=devnet)

---

**Questions?** Check the troubleshooting section or create an issue!
