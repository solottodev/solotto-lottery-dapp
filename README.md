# Solotto Lottery dApp

This is the full-stack monorepo for the Solotto on-chain lottery system on Solana.

## Database Setup (PostgreSQL)

The backend uses PostgreSQL. For setup options (Docker Compose on port 5433, native Postgres, or hosted), migrations and seeding instructions, and read-only role guidance, see:

- apps/backend/README_DB.md

Quick start with Docker on Windows:

- PowerShell
  - `cd apps/backend`
  - `./scripts/setup.ps1` (or `./scripts/setup.ps1 -Recreate` for a clean start)

This brings up Postgres on `localhost:5433`, creates application roles, and runs Prisma generate/migrate/seed. The backend reads connection strings from `apps/backend/.env`.
