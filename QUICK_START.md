# 🚀 Quick Start Guide - Solotto Lottery DApp

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Alchemy account ([sign up here](https://www.alchemy.com/))
- Solana CLI ([install guide](https://docs.solana.com/cli/install-solana-cli-tools))

---

## 1️⃣ Initial Setup (5 minutes)

```bash
# Clone and install dependencies
cd solotto-lottery-dapp
npm install

# Set up backend environment
cd apps/backend
cp .env.example .env
# Edit .env with your database credentials

# Run database migrations
npx prisma migrate dev

# Install backend dependencies
npm install
```

---

## 2️⃣ Alchemy Configuration (3 minutes)

1. Go to [Alchemy Dashboard](https://dashboard.alchemy.com/)
2. Create new Solana app (Devnet)
3. Copy API key and RPC URL
4. Update `apps/backend/.env`:

```bash
ALCHEMY_API_KEY=your_api_key_here
ALCHEMY_RPC_URL=https://solana-devnet.g.alchemy.com/v2/YOUR_API_KEY
```

---

## 3️⃣ Create Devnet Token (10 minutes)

```bash
# Configure Solana CLI for devnet
solana config set --url devnet

# Create operator wallet
solana-keygen new --outfile ~/solotto-operator.json

# Airdrop SOL
solana airdrop 2

# Create SPL token
spl-token create-token --decimals 6

# Save the token address to .env as LOTTO_MINT_ADDRESS
```

---

## 4️⃣ Test Integration (2 minutes)

```bash
cd apps/backend

# Run Alchemy test script
npx ts-node scripts/test-alchemy.ts

# Should see: ✅ All tests passing
```

---

## 5️⃣ Start Development Servers

```bash
# Terminal 1: Backend
cd apps/backend
npm run dev
# Runs on http://localhost:4000

# Terminal 2: Frontend
cd apps/frontend
npm run dev
# Runs on http://localhost:3000
```

---

## 6️⃣ Test Health Endpoints

```bash
# Database health
curl http://localhost:4000/api/v1/health

# RPC health
curl http://localhost:4000/api/v1/health/rpc

# Alchemy health
curl http://localhost:4000/api/v1/health/alchemy
```

---

## 🎯 What's Working Now

✅ **Alchemy RPC Integration**
- Primary/fallback connection
- Automatic failover
- Connection health monitoring

✅ **Wallet Balance Validation**
- On-chain balance queries
- Real-time validation in Control module

✅ **Token Holder Queries**
- Fetch all holders for a mint
- Batch balance queries
- Rate-limited for production safety

---

## 📚 Full Documentation

- **[Alchemy Setup Guide](./ALCHEMY_SETUP_GUIDE.md)** - Complete setup with screenshots
- **[Phase 1 Progress](./PHASE_1_PROGRESS.md)** - Implementation status
- **[Deployment Actions](./deployment_actions.md)** - Production deployment checklist

---

## 🆘 Common Issues

### "Alchemy API key not configured"
**Fix:** Check `.env` file has valid `ALCHEMY_API_KEY` and `ALCHEMY_RPC_URL`

### "Database connection failed"
**Fix:** Ensure PostgreSQL is running and `DATABASE_URL` is correct

### "Token not found"
**Fix:** Create devnet token using SPL Token CLI (see step 3)

---

## 🔗 Useful Commands

```bash
# Reset database
npx prisma migrate reset

# Generate Prisma client
npx prisma generate

# Check Solana config
solana config get

# Check wallet balance
solana balance

# View token accounts
spl-token accounts
```

---

## 📞 Support

- GitHub Issues: https://github.com/your-repo/issues
- Documentation: See `docs/` folder

---

**Ready to code? Head to [PHASE_1_PROGRESS.md](./PHASE_1_PROGRESS.md) to see what's next!**
