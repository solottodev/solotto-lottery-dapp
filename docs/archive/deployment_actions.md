Deployment Actions for Solotto Lottery (Control Module)

1) Backend URL and Public Transparency
- Set environment variable `BACKEND_URL` (server) and `NEXT_PUBLIC_BACKEND_URL` (client) to the deployed backend host, e.g., `https://api.solotto.example`.
- The frontend header displays the backend host via `NEXT_PUBLIC_NEXT_PUBLIC_BACKEND_URL`; update this value for each environment to ensure the public can see the active backend endpoint for transparency.

2) Operator Accounts (Email-Based)
- Pre-register operator accounts directly in the backend database or via `/auth/register` flow.
- Distribute credentials securely to authorized operators.

3) Hardcoded Blacklist Wallets (Always Denied)
- Populate env var `HARD_BLACKLIST` with permanently blacklisted Solana addresses. These are enforced server-side regardless of client input.
- Format: JSON array (preferred) or comma-separated string.
  - JSON example: `HARD_BLACKLIST='["11111111111111111111111111111111","3vRdp4xkH8n2Q9Fmsy8Z1Xbdw3sz6j4oJZtLwzqP2LZc"]'`
  - CSV example: `HARD_BLACKLIST="11111111111111111111111111111111,3vRdp4xkH8n2Q9Fmsy8Z1Xbdw3sz6j4oJZtLwzqP2LZc"`
- Example placeholder list (replace with real values during deployment):
  - 11111111111111111111111111111111
  - 3vRdp4xkH8n2Q9Fmsy8Z1Xbdw3sz6j4oJZtLwzqP2LZc
  - 9z1Yp6aQxQ2sQdwGQf3C7pR8oBv2EJZ1MZ8y4Qws8aP1
- Implementation note: Inject via `HARD_BLACKLIST` env var (JSON array) or a config file and validate in `/control` route before persisting.

4) Database Migration and Schema
- Run Prisma migrations before first deployment:
  - `infraAllocationPercent` and `slippageTolerancePercent` are required.
  - `name` removed from `LotteryConfig`.
- Confirm existing databases are migrated in a maintenance window.

5) Security and JWT
- Ensure `JWT_SECRET` is set for production.
- Enforce CORS policies as needed if the API is not private.

6) Observability
- Configure logging, error monitoring (Sentry/Grafana), and alerts for `/control` route to track operator actions.

7) Remove Test Data Participant Auto-Copy Feature
- **CRITICAL FOR PRODUCTION**: The Control module currently auto-copies participants from existing test rounds (see `apps/backend/src/routes/control.ts` lines 127-172).
- This feature is designed for local testing ONLY and must be removed before deploying to devnet/mainnet.
- **Action Required**:
  - Remove or comment out the participant auto-copy logic in `control.ts` (lines 127-172)
  - Participants should come from real blockchain snapshots, not test data templates
  - Alternative: Add an environment check `if (process.env.NODE_ENV === 'development')` to only enable this in local development
- **Why this exists**: This allows local E2E testing with pre-seeded wallet addresses without needing to run actual blockchain snapshots
- **Production behavior**: Snapshots should query real on-chain wallet holders and create participants from actual blockchain data

8) Dashboard Metrics Configuration
- **IMPORTANT FOR MAINNET**: Dashboard statistics are now network-aware and filter by `SOLANA_NETWORK` environment variable.
- All metrics (Total Rounds, SOL Distributed, Winners, Avg Prize Pool) are automatically calculated from the database.
- **Mainnet Launch Action Required**:
  - Set `SOLANA_NETWORK=mainnet-beta` in both backend and frontend environment variables
  - This ensures dashboard metrics only count mainnet data, not devnet/testnet test data
  - Devnet/testnet data will remain in the database but will be filtered out of mainnet statistics
- Implementation details:
  - Database: `Round` model now includes `network` field (defaults to "devnet")
  - Backend: `/api/v1/history/stats` endpoint filters rounds by network
  - Frontend: `/api/dashboard-stats` proxies backend stats with automatic refresh
  - Network field is automatically set when creating rounds based on `SOLANA_NETWORK` env var
- **Migration Note**: Existing devnet rounds have been backfilled with `network = 'devnet'` via Prisma migration

9) Post-Deploy Validation
- Verify operator login via email/password works (no wallet required).
- Submit a control configuration and confirm it persists and is visible in the DB.
- Confirm the frontend Control form is visible but locked until login, then becomes editable.
- **Verify participant auto-copy is disabled** by checking that new rounds have 0 participants until real snapshot data is loaded.
- **Verify dashboard metrics display correctly** and show network-specific data (devnet shows devnet stats, mainnet shows mainnet stats).
