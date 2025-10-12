# Solotto Backend - Transparency Features

**Quick Links**:
- 🔍 **Transparency Dashboard**: `http://localhost:4000/api/v1/transparency`
- 📚 **API Docs**: `http://localhost:4000/api/v1/docs`
- 📖 **Full Documentation**: [TRANSPARENCY.md](TRANSPARENCY.md)
- 🐛 **Bug Fixes**: [BUGFIX_TRANSPARENCY_PERMISSIONS.md](BUGFIX_TRANSPARENCY_PERMISSIONS.md)
- ✅ **Production Checklist**: [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)

---

## What is This?

The Solotto backend includes comprehensive **transparency features** that allow anyone to verify the fairness and integrity of lottery operations. This includes:

✅ **Interactive API Documentation** - Browse and test all endpoints
✅ **Real-time Transparency Dashboard** - Live operational data
✅ **Complete Source Code Access** - Public GitHub repository
✅ **Audit Trail Exports** - CSV downloads of all lottery data
✅ **On-chain Verification** - Blockhash-based randomness you can verify

---

## Quick Start

### View API Documentation
```bash
# Start backend
cd apps/backend
npm run dev

# Open in browser
open http://localhost:4000/api/v1/docs
```

### Test Transparency Endpoint
```bash
# Get live operational data
curl http://localhost:4000/api/v1/transparency | jq

# Check system health
curl http://localhost:4000/api/v1/transparency | jq .systemStatus

# See last drawing
curl http://localhost:4000/api/v1/transparency | jq .lastDrawing
```

### Export Audit Data
```bash
# All rounds
curl http://localhost:4000/api/v1/history/export -o rounds.csv

# All participants
curl http://localhost:4000/api/v1/history/export/participants -o participants.csv

# Specific round (full audit)
curl http://localhost:4000/api/v1/history/export/round/{roundId}/full -o round.csv
```

---

## Documentation Files

| File | Description | Status |
|------|-------------|--------|
| [TRANSPARENCY.md](TRANSPARENCY.md) | **Main documentation** - Architecture, workflow, verification | ✅ Complete |
| [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) | Pre-mainnet tasks & IPFS implementation | ✅ Complete |
| [BUGFIX_TRANSPARENCY_PERMISSIONS.md](BUGFIX_TRANSPARENCY_PERMISSIONS.md) | Database permission handling fix | ✅ Complete |
| [README_DB.md](README_DB.md) | Database setup & configuration | ✅ Existing |

---

## Key Features

### 1. Swagger API Documentation
- **URL**: `/api/v1/docs`
- Interactive API explorer
- Complete request/response schemas
- Test endpoints directly in browser

### 2. Transparency Dashboard
- **URL**: `/api/v1/transparency`
- System health status
- Recent lottery operations
- On-chain transaction history
- Source code verification links

### 3. Public Source Code
- **GitHub**: [solottodev/solotto-lottery-dapp](https://github.com/solottodev/solotto-lottery-dapp)
- Backend code fully public
- Drawing algorithm transparent
- Community-reviewable

### 4. Audit Trail
- All operations logged in PostgreSQL
- CSV exports available
- On-chain verification data stored
- Complete participant records

### 5. Verifiable Randomness
- Uses Solana blockhash + timestamp
- Deterministic winner selection
- On-chain verification possible
- Algorithm documented in [TRANSPARENCY.md](TRANSPARENCY.md#3-drawing-stage)

---

## How Users Can Verify Fairness

### 1. View the Source Code
```bash
git clone https://github.com/solottodev/solotto-lottery-dapp.git
cd solotto-lottery-dapp/apps/backend
code src/services/drawing.service.ts  # See drawing algorithm
```

### 2. Verify Blockhash On-Chain
```bash
# Get drawing results
curl http://localhost:4000/api/v1/history/round/{roundId} | jq .audit

# Verify blockhash on Solana
solana block {slot} --url https://api.devnet.solana.com
```

### 3. Export and Analyze Data
```bash
# Download full round data
curl http://localhost:4000/api/v1/history/export/round/{roundId}/full -o audit.csv

# Open in spreadsheet
open audit.csv
```

### 4. Check Transaction on Solscan
```bash
# Get transaction signature
curl http://localhost:4000/api/v1/history/round/{roundId} | jq .distributionTxSignatures

# View on Solscan
open "https://solscan.io/tx/{signature}?cluster=devnet"
```

---

## Architecture Overview

```
┌──────────────────────────────────────────┐
│     Public Transparency Layer            │
│  • /api/v1/docs (Swagger UI)            │
│  • /api/v1/transparency (Dashboard)     │
│  • /api/v1/history/* (Audit Exports)    │
│  • GitHub (Source Code)                 │
└──────────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────┐
│     Core Lottery Operations              │
│  1. Control (Configuration)              │
│  2. Snapshot (Token Holders)             │
│  3. Drawing (Winner Selection)           │
│  4. Harvest (Prize Calculation)          │
│  5. Distribution (Prize Transfer)        │
└──────────────────────────────────────────┘
                 ↓
┌──────────────────────────────────────────┐
│     Verification Layer                   │
│  • PostgreSQL (Database Audit Trail)     │
│  • Solana RPC (On-chain Verification)    │
│  • Solscan (Transaction Browser)         │
└──────────────────────────────────────────┘
```

---

## Implementation Status

### ✅ Phase 1 Complete (Current)
- [x] Swagger/OpenAPI documentation
- [x] Transparency endpoint with live data
- [x] System health checks
- [x] Recent operations audit trail
- [x] On-chain transaction links
- [x] Frontend GitHub link integration
- [x] Database permission fallback handling
- [x] Comprehensive documentation

### 📋 Phase 2 Planned (Pre-Mainnet)
- [ ] IPFS code publishing (automatic on release)
- [ ] Git commit hash injection
- [ ] Production infrastructure
- [ ] Security audit
- [ ] Load testing

See [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md) for full details.

---

## Testing

### Health Checks
```bash
# Database
curl http://localhost:4000/api/v1/health

# RPC connections
curl http://localhost:4000/api/v1/health/rpc

# Alchemy API
curl http://localhost:4000/api/v1/health/alchemy
```

### Transparency Data
```bash
# Full dashboard
curl http://localhost:4000/api/v1/transparency | jq

# System status only
curl http://localhost:4000/api/v1/transparency | jq .systemStatus

# Source code info
curl http://localhost:4000/api/v1/transparency | jq .sourceCode

# Recent operations
curl http://localhost:4000/api/v1/transparency | jq .recentOperations
```

### API Documentation
```bash
# Access Swagger UI
open http://localhost:4000/api/v1/docs

# Get OpenAPI spec
curl http://localhost:4000/api/v1/docs/swagger.json
```

---

## Troubleshooting

### Permission Errors
If you see database permission errors, this is expected behavior. The transparency endpoint automatically falls back to the primary database connection. See [BUGFIX_TRANSPARENCY_PERMISSIONS.md](BUGFIX_TRANSPARENCY_PERMISSIONS.md).

### Missing Data
Some data sections may be empty if no lottery operations have been run yet. This is normal for a fresh installation.

### Health Check Failures
- **Database unhealthy**: Check PostgreSQL is running and `.env` is configured
- **RPC unhealthy**: Verify Solana RPC endpoints in `.env`
- **Alchemy unhealthy**: Optional - only needed for USD pricing

---

## Production Deployment

When deploying to mainnet:

1. **Update environment variables** (see [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md))
2. **Configure mainnet RPC endpoints**
3. **Set `GIT_COMMIT_HASH` and `BUILD_DATE`** in environment
4. **Implement IPFS publishing** (GitHub Actions workflow provided)
5. **Update Swagger server URLs** in `src/config/swagger.ts`

---

## Support

- **Documentation Questions**: See [TRANSPARENCY.md](TRANSPARENCY.md)
- **Bug Reports**: [GitHub Issues](https://github.com/solottodev/solotto-lottery-dapp/issues)
- **API Reference**: http://localhost:4000/api/v1/docs
- **Live Dashboard**: http://localhost:4000/api/v1/transparency

---

**Last Updated**: 2025-10-12
**Status**: ✅ Phase 1 Complete & Tested
**Next**: IPFS Publishing + Mainnet Deployment
