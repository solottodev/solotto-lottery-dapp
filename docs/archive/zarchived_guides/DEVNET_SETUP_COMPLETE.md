# 🎉 Devnet Test Environment - Setup Complete!

## ✅ Your Devnet Configuration

### Token Information
```
Token Name: $LOTTO (Test)
Mint Address: 3peF9pJGVuUfVQQc2Gh7UXyz8Z3HM3oQAHJht3SrfDhf
Decimals: 6
Network: devnet
Total Supply: 1,000,000 tokens
```

**View on Solscan:**
https://solscan.io/token/3peF9pJGVuUfVQQc2Gh7UXyz8Z3HM3oQAHJht3SrfDhf?cluster=devnet

---

### Operator Wallet
```
Address: 8Riz5dHxdrkvNcFnpgPicPYgW5rXWu2h5CfGuoN3C5Dv
Balance: ~12 SOL (devnet)
Token Balance: 928,212 $LOTTO
Keypair Location: apps/backend/dev-wallet.json
```

**View on Solscan:**
https://solscan.io/account/8Riz5dHxdrkvNcFnpgPicPYgW5rXWu2h5CfGuoN3C5Dv?cluster=devnet

---

### Test Holder Wallets (10 Total)

| # | Address | Token Balance | Tier |
|---|---------|---------------|------|
| 1 | `6uSkeEWd5nB2h2jhEdggK5kdFZcBxpWsFgKC8K5fPSoi` | 165,255 | Tier 1 |
| 2 | `2rps3FFmSjUh8riNYhSdBXY12VSwweNJhcKPyJVUp6xY` | 71,788 | Tier 2 |
| 3 | `DK6EjhEStsBg6yZtQBbwg7JtVpWQa7VydUu27GWZoN3M` | 70,462 | Tier 2 |
| 4 | `HjCqZCrHhJwYrNSxzDz9J2nX18u2v5a7nWS2eGMsKvJ` | 31,025 | Tier 3 |
| 5 | `5JPCPgXpBiNw2C5w5upyvboDqGFkc1WF72838cvyL6np` | 47,336 | Tier 3 |
| 6 | `72kXCQGket6ChcKfAt4kvM9whFdPgTEF5q5cT8dm21FL` | 31,355 | Tier 3 |
| 7 | `CoNcjQLdXxokNWP5hH9phPjxb1n5jPyPZ5cZ4FtMeZ7E` | 9,243 | Tier 4 |
| 8 | `ExtZuQCFvsSM3NUBRJD4NURxgbgq8AxssM7ay71Hur78` | 5,902 | Tier 4 |
| 9 | `H4Exwn3LniCuhCnJvdETq6jkHcpioYnoQZokbaCpJjdu` | 3,409 | Tier 4 |
| 10 | `DMSuWmnwWDLufkZiTA1SrtQz9gNZyiMrPAHpGsHyPidz` | 4,568 | Tier 4 |

**Keypair Files:** `~/holder-1.json` through `~/holder-10.json` (on WSL)

---

## 📋 Environment Configuration

### Backend (.env)
```bash
✅ SOLANA_NETWORK="devnet"
✅ LOTTO_MINT_ADDRESS="3peF9pJGVuUfVQQc2Gh7UXyz8Z3HM3oQAHJht3SrfDhf"
✅ OPERATOR_WALLET_ADDRESS="8Riz5dHxdrkvNcFnpgPicPYgW5rXWu2h5CfGuoN3C5Dv"
✅ OPERATOR_WALLET_KEYPAIR_PATH="./dev-wallet.json"

⚠️  ALCHEMY_API_KEY="your_alchemy_api_key_here"  ← NEED TO UPDATE
⚠️  ALCHEMY_RPC_URL="https://solana-devnet.g.alchemy.com/v2/YOUR_API_KEY"  ← NEED TO UPDATE
```

### Frontend (.env)
```bash
✅ NEXT_PUBLIC_NETWORK="devnet"
✅ NEXT_PUBLIC_LOTTO_MINT="3peF9pJGVuUfVQQc2Gh7UXyz8Z3HM3oQAHJht3SrfDhf"

⚠️  NEXT_PUBLIC_RPC_URL="https://solana-devnet.g.alchemy.com/v2/YOUR_API_KEY"  ← NEED TO UPDATE
```

---

## 🔑 Next Step: Get Your Alchemy API Key

You still need to set up Alchemy to complete the configuration:

### 1. Sign up for Alchemy
Go to: https://www.alchemy.com/

### 2. Create a Solana Devnet App
- Click "Create App"
- Chain: **Solana**
- Network: **Solana Devnet**
- Name: "Solotto Lottery Devnet"

### 3. Get Your API Key
- Click on your app
- Copy the API Key
- Copy the HTTPS URL

### 4. Update Your .env Files

**Backend:** `apps/backend/.env`
```bash
ALCHEMY_API_KEY="abc123xyz456..."
ALCHEMY_RPC_URL="https://solana-devnet.g.alchemy.com/v2/abc123xyz456..."
```

**Frontend:** `apps/frontend/.env`
```bash
NEXT_PUBLIC_RPC_URL="https://solana-devnet.g.alchemy.com/v2/abc123xyz456..."
```

---

## 🧪 Test Your Setup

Once you have Alchemy configured, test everything:

```bash
# 1. Test Alchemy integration
cd apps/backend
npx ts-node scripts/test-alchemy.ts

# Expected output:
# ✅ Found 11 token holders (operator + 10 test wallets)

# 2. Start backend server
npm run dev

# 3. Test health endpoints
curl http://localhost:4000/api/v1/health/rpc
curl http://localhost:4000/api/v1/health/alchemy
```

---

## 📊 What You Can Test Now

With this devnet setup, you can test:

✅ **Snapshot Module**
- Query real token holders (your 10 test wallets)
- Calculate tier distribution
- Test eligibility filtering

✅ **Drawing Module**
- Select winners from real participants
- Verify randomness
- Test duplicate prevention

✅ **Distribution Module**
- Send test tokens to winners
- Test ATA creation
- Verify on-chain transactions

✅ **Control Module**
- Validate wallet balances on-chain
- Test configuration creation
- Verify blacklist handling

---

## 🔄 Mainnet vs Devnet Comparison

| Aspect | Devnet (Testing) | Mainnet (Production) |
|--------|------------------|----------------------|
| **Token Mint** | `3peF9pJG...` | `HJSnJaQv...` |
| **Network** | devnet | mainnet-beta |
| **Holders** | 10 test wallets | Real $LOTTO holders |
| **SOL** | Free (airdrop) | Real SOL |
| **Tokens** | Test (no value) | Real $LOTTO |
| **Switching** | `SOLANA_NETWORK=devnet` | `SOLANA_NETWORK=mainnet-beta` |

---

## 🛠️ Useful Commands

### Check Token Info
```bash
spl-token display 3peF9pJGVuUfVQQc2Gh7UXyz8Z3HM3oQAHJht3SrfDhf
```

### List All Holders
```bash
spl-token accounts 3peF9pJGVuUfVQQc2Gh7UXyz8Z3HM3oQAHJht3SrfDhf
```

### Check Operator Balance
```bash
solana balance 8Riz5dHxdrkvNcFnpgPicPYgW5rXWu2h5CfGuoN3C5Dv
spl-token balance 3peF9pJGVuUfVQQc2Gh7UXyz8Z3HM3oQAHJht3SrfDhf
```

### Airdrop More SOL
```bash
solana airdrop 2
```

---

## 📁 File Locations

**On Windows:**
```
C:\Users\topaz\Documents\solotto-lottery-dapp\
  ├── apps/backend/.env                 ← Updated with devnet config
  ├── apps/backend/dev-wallet.json      ← Operator keypair
  └── apps/frontend/.env                ← Updated with devnet config
```

**On WSL:**
```
/home/peppamache/
  ├── holder-1.json through holder-10.json   ← Test wallet keypairs
  ├── create-test-holders.sh                 ← Script to recreate holders
  └── .config/solana/dev-wallet.json        ← Operator keypair (original)
```

---

## 🚀 You're Ready to Build!

You now have:
- ✅ Devnet test token created
- ✅ 10 realistic test holder wallets
- ✅ Operator wallet with tokens and SOL
- ✅ Environment files configured
- ✅ Network switching system in place

**Next Steps:**
1. Get Alchemy API key (5 minutes)
2. Update `.env` files with Alchemy credentials
3. Test Alchemy integration
4. Continue with Phase 1.2 (Snapshot Module implementation)

---

**Questions or issues?** Check the troubleshooting section in `ALCHEMY_SETUP_GUIDE.md`

**Created:** $(date)
**Network:** Solana Devnet
**Status:** ✅ Ready for Testing
