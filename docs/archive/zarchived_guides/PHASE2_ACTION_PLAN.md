# Phase 2: Testing & Validation - Action Plan

**Status:** 🟡 Ready to Execute
**Duration:** 5-7 days
**Current Progress:** Local testing complete (83% pass rate)

---

## Quick Summary

We've completed local E2E testing with **57 of 69 tests passing (83%)**. The next steps are to:
1. Fix minor test issues
2. Upgrade Alchemy RPC tier
3. Deploy to staging (Render + Vercel)
4. Run comprehensive devnet testing
5. Validate all features before mainnet

---

## Day-by-Day Action Plan

### **Day 1: Infrastructure Setup** (4-6 hours)

#### Morning (2-3 hours)
- [ ] **Fix Auth Test** (15 min)
  - File: `apps/backend/tests/e2e/1-auth.test.ts:204`
  - Change `.expect(401)` to `.expect(400)`
  - Re-run auth tests: `npm test -- 1-auth`

- [ ] **Upgrade Alchemy** (30 min)
  - Go to [Alchemy Dashboard](https://dashboard.alchemy.com/)
  - Upgrade to Pay-As-You-Go tier
  - Verify `getProgramAccounts` enabled
  - Test snapshot performance improvement

- [ ] **Generate Staging Secrets** (15 min)
  ```bash
  # JWT Secret
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

  # Create devnet wallet
  solana-keygen new --outfile devnet-operator.json
  solana-keygen pubkey devnet-operator.json
  ```

#### Afternoon (2-3 hours)
- [ ] **Set Up Render** (1 hour)
  - Create account at [render.com](https://render.com)
  - Connect GitHub repository
  - Create Web Service: `solotto-backend-staging`
  - Configure environment variables (see STAGING_DEPLOYMENT_GUIDE.md)
  - Deploy and verify health endpoint

- [ ] **Set Up Vercel** (1 hour)
  - Create account at [vercel.com](https://vercel.com)
  - Import GitHub repository
  - Configure environment variables
  - Deploy and verify frontend loads

- [ ] **Verify Deployments** (30 min)
  ```bash
  # Test backend
  curl https://solotto-backend-staging.onrender.com/api/v1/health

  # Test frontend (visit in browser)
  https://solotto-frontend-staging.vercel.app
  ```

**Day 1 Deliverable:** ✅ Staging environment live and accessible

---

### **Day 2: Wallet Setup & Initial Testing** (3-4 hours)

#### Morning (1-2 hours)
- [ ] **Fund Devnet Wallets** (1 hour)
  ```bash
  # Get operator wallet
  solana-keygen pubkey devnet-operator.json

  # Fund with devnet SOL
  solana airdrop 10 <OPERATOR_WALLET> --url devnet

  # Verify balance
  solana balance <OPERATOR_WALLET> --url devnet
  ```

- [ ] **Create Test Participant Wallets** (30 min)
  - Use script: `apps/backend/scripts/create-test-wallets.sh`
  - Create 10 wallets with varying LOTTO amounts
  - Document wallet addresses

#### Afternoon (2 hours)
- [ ] **Test Operator Login** (30 min)
  - Navigate to staging `/operator`
  - Register operator account
  - Set up 2FA
  - Verify login with TOTP

- [ ] **Test Control Module** (1 hour)
  - Create round configuration
  - Use funded devnet wallet
  - Verify wallet balance validation
  - Check blacklist merging
  - Confirm round creation

**Day 2 Deliverable:** ✅ Funded wallets and operator access working

---

### **Day 3: Full Lifecycle Testing** (4-6 hours)

#### Morning (2-3 hours)
- [ ] **Run Complete Lottery Round** (2 hours)

  **Step 1: Control**
  - Create round with real parameters
  - Prize pool: 5 SOL (50% distribution = 2.5 SOL prizes)
  - Minimum LOTTO: 10,000
  - Document round ID

  **Step 2: Snapshot**
  - Click "Run Snapshot"
  - Monitor logs (should use upgraded Alchemy)
  - Verify participants fetched
  - Check performance improvement

  **Step 3: Confirm Snapshot**
  - Review participant list
  - Verify tiers assigned correctly
  - Confirm snapshot

  **Step 4: Drawing**
  - Run drawing
  - Verify audit trail complete
  - Check winners selected
  - Confirm drawing

#### Afternoon (2-3 hours)
  **Step 5: Harvest**
  - Connect funded wallet
  - Prepare harvest
  - Verify prize pool: 2.5 SOL
  - Verify tier allocations: 40/30/20/10

  **Step 6: Distribution**
  - Option A: SOL distribution (easier)
    - Prepare transaction
    - Sign with wallet
    - Broadcast to devnet
    - Verify winners receive SOL

  - Option B: Jupiter swap (if configured)
    - Prepare swap transactions
    - Verify quote reasonable
    - Execute swaps
    - Verify winners receive LOTTO

- [ ] **Verify on Solscan** (30 min)
  - Check transactions on [Solscan Devnet](https://solscan.io/?cluster=devnet)
  - Verify prize transfers
  - Document transaction signatures

**Day 3 Deliverable:** ✅ Complete lifecycle working on devnet

---

### **Day 4: Jupiter Integration** (4-6 hours)

#### Morning (2-3 hours)
- [ ] **Install Jupiter SDK** (30 min)
  ```bash
  cd apps/backend
  npm install @jup-ag/api
  ```

- [ ] **Configure Jupiter Service** (1 hour)
  - Verify `apps/backend/src/services/jupiter.service.ts` exists
  - Test connection: `npm test -- jupiter`
  - Configure routes for devnet

- [ ] **Test Swap Quote** (1 hour)
  ```bash
  # Use test script
  cd apps/backend
  npx ts-node scripts/test-jupiter-quote.ts

  # Should return:
  # Input: 0.1 SOL
  # Output: ~X LOTTO (depends on pool)
  # Route: SOL → LOTTO via [pool]
  ```

#### Afternoon (2-3 hours)
- [ ] **Test Swap Execution** (2 hours)
  - Create small test round (0.5 SOL pool)
  - Run through lifecycle
  - Choose "Swap to LOTTO" option
  - Execute swap distribution
  - Verify LOTTO received

- [ ] **Test Fallback Scenario** (1 hour)
  - Simulate swap failure (high slippage)
  - Verify fallback to SOL works
  - Document fallback behavior

**Day 4 Deliverable:** ✅ Jupiter swaps working or fallback validated

---

### **Day 5: Load Testing & Bug Fixes** (4-6 hours)

#### Morning (2-3 hours)
- [ ] **Create 100+ Test Participants** (1 hour)
  - Use bulk wallet creation script
  - Distribute LOTTO to wallets
  - Vary amounts across tiers

- [ ] **Run Load Test Round** (1-2 hours)
  - Create round with 100+ participants
  - Run snapshot (monitor performance)
  - Run drawing
  - Time each step
  - Document performance metrics

#### Afternoon (2-3 hours)
- [ ] **Fix Discovered Issues** (2-3 hours)
  - Review error logs
  - Fix critical bugs
  - Re-test affected modules
  - Update tests if needed

- [ ] **Run E2E Tests Against Staging** (1 hour)
  ```bash
  # Point tests to staging
  export BACKEND_URL=https://solotto-backend-staging.onrender.com
  npm run test:e2e
  ```

**Day 5 Deliverable:** ✅ Load testing complete, bugs fixed

---

### **Day 6: Transparency Portal & Final Validation** (4-6 hours)

#### Morning (2-3 hours)
- [ ] **Test Transparency Portal** (1 hour)
  - Navigate to `/transparency`
  - Verify devnet rounds displayed
  - Check winner addresses shown
  - Verify audit trails visible
  - Test CSV export

- [ ] **Test History Endpoints** (1 hour)
  ```bash
  # Get all rounds
  curl https://solotto-backend-staging.onrender.com/api/v1/history/rounds

  # Get specific round
  curl https://solotto-backend-staging.onrender.com/api/v1/history/rounds/{roundId}

  # Get stats
  curl https://solotto-backend-staging.onrender.com/api/v1/history/stats
  ```

- [ ] **Security Testing** (1 hour)
  - Test rate limiting
  - Try unauthorized access
  - Test invalid inputs
  - Verify CORS working

#### Afternoon (2-3 hours)
- [ ] **Final Validation Checklist**
  - [ ] All E2E tests passing (>95%)
  - [ ] Complete lifecycle working
  - [ ] 2FA login functional
  - [ ] Jupiter swaps or fallback working
  - [ ] Transparency portal accurate
  - [ ] No critical bugs
  - [ ] Performance acceptable (<2s per module)

- [ ] **Documentation** (1 hour)
  - Update PHASE2_TESTING_REPORT.md with final results
  - Document all bugs found and fixed
  - Create known issues list
  - Update MAINNET_DEPLOYMENT_PLAN.md

**Day 6 Deliverable:** ✅ Phase 2 complete and documented

---

### **Day 7: Buffer Day** (2-4 hours if needed)

- [ ] Address any remaining issues
- [ ] Re-test critical paths
- [ ] Prepare Phase 3 checklist
- [ ] Team review and signoff

---

## Success Criteria

Before declaring Phase 2 complete:

- ✅ **95%+ test pass rate** (currently 83%)
- ✅ **Staging deployed** (Render + Vercel)
- ✅ **Alchemy upgraded** (getProgramAccounts working)
- ✅ **Complete lifecycle** tested on devnet with real transactions
- ✅ **2FA login** working
- ✅ **Jupiter swaps** working OR fallback validated
- ✅ **Load test** with 100+ participants successful
- ✅ **Transparency portal** displaying correct data
- ✅ **All critical bugs** documented and fixed
- ✅ **Performance** acceptable (<2s per step)
- ✅ **Security** tested (rate limiting, auth, CORS)

---

## Quick Command Reference

### Testing
```bash
# Run all tests
npm test

# Run specific test
npm test -- 1-auth

# Run with coverage
npm run test:coverage

# Run against staging
export BACKEND_URL=https://solotto-backend-staging.onrender.com
npm test
```

### Deployment
```bash
# Check Render deployment
curl https://solotto-backend-staging.onrender.com/api/v1/health

# View Render logs
# Visit: https://dashboard.render.com

# View Vercel logs
# Visit: https://vercel.com/dashboard
```

### Devnet Commands
```bash
# Get devnet SOL
solana airdrop 10 <WALLET> --url devnet

# Check balance
solana balance <WALLET> --url devnet

# View transaction
solana confirm <SIGNATURE> --url devnet
```

---

## Resources

### Documentation
- [PHASE2_TESTING_REPORT.md](./PHASE2_TESTING_REPORT.md) - Test results and findings
- [STAGING_DEPLOYMENT_GUIDE.md](./STAGING_DEPLOYMENT_GUIDE.md) - Render/Vercel setup
- [MAINNET_DEPLOYMENT_PLAN.md](./MAINNET_DEPLOYMENT_PLAN.md) - Overall deployment strategy
- [tests/README.md](./apps/backend/tests/README.md) - Test suite guide

### External Resources
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Jupiter API Docs](https://station.jup.ag/docs/apis/swap-api)
- [Solana Devnet Faucet](https://faucet.solana.com/)

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Alchemy quota exceeded | Low | High | Upgrade to Pay-As-You-Go, implement caching |
| Jupiter swaps fail | Medium | Medium | Implement SOL fallback (already done) |
| Test wallets run out of SOL | Medium | Low | Use devnet faucet, create refill script |
| Performance issues | Low | Medium | Load test early, optimize hot paths |
| Undiscovered bugs | Medium | High | Comprehensive testing, staged rollout |

---

## Team Coordination

### Daily Standup Questions
1. What did I complete yesterday?
2. What am I working on today?
3. Any blockers or issues?

### Communication Channels
- **Slack/Discord:** Quick questions and updates
- **GitHub Issues:** Bug tracking
- **Docs:** Share findings in PHASE2_TESTING_REPORT.md

---

## Next Phase Preview

**Phase 3: Deployment Preparation** (2-3 days)

Will include:
- Production environment setup
- Final security hardening
- Backup verification
- Monitoring setup (Sentry, UptimeRobot)
- Launch day preparation

---

**Plan Version:** 1.0
**Status:** 🟢 Ready to Execute
**Last Updated:** October 20, 2025
**Owner:** Solotto Development Team
