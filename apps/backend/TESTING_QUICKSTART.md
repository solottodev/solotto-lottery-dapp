# Testing Quick Start Guide

Quick reference for running the Solotto E2E test suite.

## Prerequisites

Ensure you have:
- Node.js 20+ installed
- PostgreSQL database running (Supabase)
- `.env` file configured in `apps/backend/`

## Installation

```bash
cd apps/backend
npm install
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run E2E Tests Only

```bash
npm run test:e2e
```

### Run with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npm test -- 1-auth.test.ts
npm test -- 2-control.test.ts
npm test -- 3-snapshot.test.ts
npm test -- 4-drawing.test.ts
npm test -- 5-harvest.test.ts
npm test -- 6-distribution.test.ts
npm test -- 7-full-lifecycle.test.ts
```

### Run Tests Matching a Pattern

```bash
npm test -- --testNamePattern="Authentication"
npm test -- --testNamePattern="2FA"
npm test -- --testNamePattern="should reject"
```

### Run in Watch Mode (Development)

```bash
npm run test:watch
```

## Test Results

Expected output:
```
Test Suites: 7 total
Tests:       59 total
Time:        ~30-60 seconds
```

## Coverage Report

After running `npm run test:coverage`, view the report:

```
coverage/
├── lcov.info          # Coverage data (for CI/CD)
├── coverage-summary.json
└── lcov-report/
    └── index.html     # Open in browser
```

## Environment Variables

Copy `.env.test` to `.env` or ensure these are set:

```env
DATABASE_URL="your-supabase-connection-string"
JWT_SECRET="test-secret-key"
SOLANA_NETWORK="devnet"
ALCHEMY_RPC_URL="your-rpc-url"
LOTTO_MINT_ADDRESS="your-token-mint"
```

## Test Structure

```
tests/
├── setup.ts          # Global setup
├── teardown.ts       # Global cleanup
├── helpers/          # Test utilities
└── e2e/              # E2E test files
    ├── 1-auth.test.ts           # 18 tests
    ├── 2-control.test.ts        # 8 tests
    ├── 3-snapshot.test.ts       # 7 tests
    ├── 4-drawing.test.ts        # 6 tests
    ├── 5-harvest.test.ts        # 7 tests
    ├── 6-distribution.test.ts   # 5 tests
    └── 7-full-lifecycle.test.ts # 8 tests
```

## Troubleshooting

### Database Errors
```bash
# Ensure migrations are up to date
npx prisma migrate deploy
```

### RPC Timeouts
Tests automatically skip blockchain operations if RPC is unavailable.

### Port in Use
Tests use supertest (in-memory), no ports are bound.

### Prisma Client Errors
```bash
# Regenerate Prisma client
npx prisma generate
```

## CI/CD Integration

Example GitHub Actions workflow:

```yaml
- name: Run tests
  run: cd apps/backend && npm test

- name: Upload coverage
  uses: codecov/codecov-action@v3
  with:
    files: ./apps/backend/coverage/lcov.info
```

## Additional Resources

- [Full Test Documentation](./tests/README.md)
- [Deployment Plan](../../MAINNET_DEPLOYMENT_PLAN.md)
- [Test Summary](../../E2E_TEST_SUITE_SUMMARY.md)

## Quick Commands

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch

# Specific test
npm test -- 1-auth
```

---

**For detailed testing guide, see:** [tests/README.md](./tests/README.md)
