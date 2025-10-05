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

7) Post-Deploy Validation
- Verify operator login via email/password works (no wallet required).
- Submit a control configuration and confirm it persists and is visible in the DB.
- Confirm the frontend Control form is visible but locked until login, then becomes editable.
