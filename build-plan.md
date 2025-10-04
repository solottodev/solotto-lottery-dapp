# Solotto Lottery dApp – Full Build Plan

## Overview

This document outlines the technical roadmap for building the Solotto Lottery dApp from devnet to mainnet launch.

## Project Phases

### Phase 0: Project Setup
- Initialize monorepo structure
- Setup GitHub repo, GitHub Actions, environments
- Install dependencies and configure Prettier, ESLint, Husky
- Estimated Time: 2 days

### Phase 1: Auth + DB Schema
- Implement wallet-based auth with JWT (Phantom)
- Setup Prisma schema for operators, rounds, snapshots, drawings
- Estimated Time: 3-4 days

### Phase 2: Control Module
- UI for inputting round config
- Backend validation, persistence
- Blacklist logic
- Estimated Time: 4 days

### Phase 3: Snapshot Module
- UI feedback for snapshot progress
- Wallet eligibility engine (devnet mock)
- Tier calculation
- Estimated Time: 5 days

### Phase 4: Drawing Module
- VRF with Switchboard
- Result persistence and audit logs
- Estimated Time: 3 days

### Phase 5: Harvest Module
- Pull balance from devnet infra wallet
- Calculate pool split, optional Jupiter quote for swap
- Estimated Time: 3 days

### Phase 6: Distribution Module
- Transfer SOL or devnet token to winners
- Web3 tx confirmation
- Retry logic
- Estimated Time: 4 days

### Phase 7: History Module
- UI and API for lottery results
- Public explorer with CSV export
- Estimated Time: 3 days

### Phase 8: QA & UAT
- Playwright flows + E2E testing
- UAT checklists and devnet simulation
- Estimated Time: 7 days

### Phase 9: Staging + Monitoring
- Deploy staging version to Vercel + Railway
- Integrate Sentry, Grafana dashboards
- Estimated Time: 3 days

### Phase 10: Mainnet Launch
- Use real SPL token
- Harden config, enable alerts, tag v1.0
- Estimated Time: 1 day

## Total Duration: ~5.5–6 Weeks