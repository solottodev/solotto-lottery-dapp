# Solotto Backend - Production/Mainnet Implementation Checklist

This document tracks additional implementation tasks required before mainnet deployment.

## Completed (Phase 1 - Transparency)

- [x] Swagger/OpenAPI documentation at `/api/v1/docs`
- [x] Transparency endpoint at `/api/v1/transparency`
- [x] TRANSPARENCY.md documentation
- [x] Frontend updated to link to GitHub backend source
- [x] Health check endpoints (database, RPC, Alchemy)
- [x] CSV export endpoints for audit trails

## Phase 2 - Production Deployment

### Infrastructure

- [ ] Set up production PostgreSQL instance (managed service recommended)
- [ ] Configure database backups (automated daily)
- [ ] Set up Redis for rate limiting
- [ ] Configure CDN for static assets
- [ ] Set up monitoring (DataDog, New Relic, or similar)
- [ ] Configure log aggregation (LogDNA, Papertrail)
- [ ] Set up alerting (PagerDuty, Opsgenie)

### Security

- [ ] Implement rate limiting on all public endpoints
- [ ] Add DDoS protection (Cloudflare)
- [ ] Audit operator private key storage (consider HSM or KMS)
- [ ] Enable HTTPS/TLS certificates
- [ ] Add CORS whitelist for production domains
- [ ] Security audit of smart contracts (if applicable)
- [ ] Penetration testing
- [ ] Implement request signing for operator endpoints

### Mainnet Configuration

- [ ] Update RPC endpoints to mainnet-beta
  - Primary: Helius, Triton, or QuickNode
  - Fallback: Public mainnet RPC
- [ ] Update `SOLANA_NETWORK=mainnet-beta` in environment
- [ ] Configure production token mint address (`LOTTO_MINT_ADDRESS`)
- [ ] Set up mainnet operator wallet with multi-sig (recommended)
- [ ] Update frontend to point to mainnet Solscan URLs

### Code Verification & Publishing

- [ ] **IPFS Code Publishing** (High Priority)
  - Set up GitHub Actions workflow to publish source code to IPFS on release
  - Store IPFS hash in smart contract or display in UI
  - Update transparency endpoint to include IPFS hash
  - Add verification instructions to TRANSPARENCY.md

- [ ] **Arweave Permanent Storage** (Optional)
  - Publish backend source to Arweave for permanent archival
  - Store Arweave transaction ID in transparency endpoint

- [ ] **Git Commit Hash Automation**
  - Update build process to inject `GIT_COMMIT_HASH` at build time
  - Include commit hash in `/api/v1/transparency` response
  - Display in frontend UI

- [ ] **Reproducible Builds**
  - Dockerize backend with deterministic build
  - Publish Docker image hash
  - Document build reproduction steps

### Testing

- [ ] Load testing (simulate 1000+ concurrent users)
- [ ] Chaos engineering (test failover scenarios)
- [ ] End-to-end integration tests on devnet
- [ ] Mainnet dry run with small prize pool
- [ ] Verify all transaction signatures on Solscan

### Documentation

- [ ] Update TRANSPARENCY.md with mainnet endpoints
- [ ] Create runbook for operator procedures
- [ ] Document disaster recovery procedures
- [ ] Create FAQ for users
- [ ] Add troubleshooting guide
- [ ] Document API versioning strategy

### Compliance

- [ ] Review gambling regulations in target jurisdictions
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Age verification (if required)
- [ ] KYC/AML considerations (if required)

### Monitoring & Observability

- [ ] Set up application performance monitoring (APM)
- [ ] Create dashboard for key metrics:
  - API response times
  - RPC success rate
  - Drawing execution time
  - Prize distribution success rate
  - Database connection pool usage
- [ ] Alert on critical errors:
  - RPC connection failures
  - Database connection failures
  - Failed prize distributions
  - Abnormal gas fees

---

## IPFS Code Publishing Implementation Plan

### Goal
Automatically publish backend source code to IPFS on each release, allowing users to verify the deployed backend matches the published code.

### GitHub Actions Workflow

Create `.github/workflows/publish-to-ipfs.yml`:

```yaml
name: Publish Backend to IPFS

on:
  release:
    types: [published]
  push:
    tags:
      - 'v*'

jobs:
  publish-to-ipfs:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Install IPFS
        run: |
          wget https://dist.ipfs.tech/kubo/v0.22.0/kubo_v0.22.0_linux-amd64.tar.gz
          tar -xvzf kubo_v0.22.0_linux-amd64.tar.gz
          cd kubo
          sudo bash install.sh
          ipfs init

      - name: Start IPFS daemon
        run: |
          ipfs daemon &
          sleep 5

      - name: Publish backend to IPFS
        run: |
          cd apps/backend
          IPFS_HASH=$(ipfs add -r src | tail -n1 | awk '{print $2}')
          echo "IPFS_HASH=$IPFS_HASH" >> $GITHUB_ENV
          echo "Backend published to IPFS: $IPFS_HASH"
          echo "Gateway URL: https://ipfs.io/ipfs/$IPFS_HASH"

      - name: Pin to Pinata (optional)
        env:
          PINATA_API_KEY: ${{ secrets.PINATA_API_KEY }}
          PINATA_SECRET_KEY: ${{ secrets.PINATA_SECRET_KEY }}
        run: |
          curl -X POST "https://api.pinata.cloud/pinning/pinByHash" \
            -H "Content-Type: application/json" \
            -H "pinata_api_key: $PINATA_API_KEY" \
            -H "pinata_secret_api_key: $PINATA_SECRET_KEY" \
            -d "{\"hashToPin\":\"$IPFS_HASH\"}"

      - name: Create release comment
        uses: actions/github-script@v6
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: `📦 Backend source code published to IPFS\n\nIPFS Hash: \`${process.env.IPFS_HASH}\`\n\nGateway URLs:\n- https://ipfs.io/ipfs/${process.env.IPFS_HASH}\n- https://cloudflare-ipfs.com/ipfs/${process.env.IPFS_HASH}`
            })
```

### Environment Variables to Add

In production `.env`:
```bash
# Code verification
IPFS_HASH="QmXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxX"
GIT_COMMIT_HASH="a828d70"
BUILD_DATE="2025-10-12T08:00:00.000Z"
```

### Update Transparency Endpoint

Modify `apps/backend/src/routes/transparency.ts`:

```typescript
sourceCode: {
  repository: 'https://github.com/solottodev/solotto-lottery-dapp',
  backend: 'https://github.com/solottodev/solotto-lottery-dapp/tree/main/apps/backend',
  commitHash: process.env.GIT_COMMIT_HASH || 'unknown',
  buildDate: process.env.BUILD_DATE || null,
  ipfsHash: process.env.IPFS_HASH || null,
  ipfsGateway: process.env.IPFS_HASH ? `https://ipfs.io/ipfs/${process.env.IPFS_HASH}` : null
}
```

### User Verification Instructions

Add to TRANSPARENCY.md:

```markdown
## Verify Backend Source Code

1. Get the IPFS hash from the transparency endpoint:
   \`\`\`bash
   curl https://api.solotto.io/api/v1/transparency | jq .sourceCode.ipfsHash
   \`\`\`

2. Browse the code on IPFS:
   - https://ipfs.io/ipfs/{ipfsHash}
   - https://cloudflare-ipfs.com/ipfs/{ipfsHash}

3. Compare with deployed backend:
   - Deployed endpoint: https://api.solotto.io
   - Git commit: {commitHash}
   - Build date: {buildDate}
```

---

## Estimated Timeline

- **Phase 2 (Infrastructure & Security)**: 2-3 weeks
- **IPFS Publishing Implementation**: 3-5 days
- **Testing & Auditing**: 2-4 weeks
- **Total to Mainnet**: 6-8 weeks

---

## Mainnet Launch Checklist

On launch day:

- [ ] Verify all environment variables are set correctly
- [ ] Test all endpoints on mainnet
- [ ] Execute test transaction with small amount
- [ ] Monitor logs for errors
- [ ] Announce launch to community
- [ ] Publish transparency dashboard URL
- [ ] Share IPFS hash for code verification

---

**Last Updated**: 2025-10-12
**Status**: Phase 1 Complete (Transparency)
**Next Phase**: IPFS Code Publishing + Production Infrastructure
