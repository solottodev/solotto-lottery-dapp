Solotto Backend — Database Setup (PostgreSQL)
============================================

This guide helps you set up PostgreSQL for the Solotto backend with recommended roles and privileges for production-grade, read-only public endpoints.

Option 1 — Docker Compose on port 5433
--------------------------------------
1. From `apps/backend`, start Postgres with Docker Compose:
   - `docker compose up -d`
   - This creates the database `solotto` and runs `docker/init-roles.sql` on first start.

2. Verify container health:
   - `docker compose ps`
   - `docker logs solotto-pg`

3. Connect to DB for sanity check:
   - `psql -h localhost -p 5433 -U solotto_app -d solotto` (password: `solotto_app_pw`)

4. App environment:
   - Edit `apps/backend/.env`:
     - `DATABASE_URL="postgresql://solotto_app:solotto_app_pw@localhost:5433/solotto?schema=public"`
     - `DATABASE_URL_RO="postgresql://solotto_ro:solotto_ro_pw@localhost:5433/solotto?schema=public"`

5. Prisma generate/migrate/seed:
   - `cd apps/backend`
   - `npx prisma generate`
   - `npx prisma migrate dev -n init`
   - `npm run seed`

Option 2 — Native PostgreSQL (no Docker)
----------------------------------------
1. Create the database `solotto` with your preferred admin account.
2. Create app roles and grants by running:
   - `psql -h <host> -U <admin-user> -d solotto -f scripts/create_roles.sql`
   - Change passwords inside the file as needed before running.
3. Set `DATABASE_URL` and `DATABASE_URL_RO` in `apps/backend/.env` to point at your server (port typically 5432).
4. Run Prisma generate/migrate/seed as above.

Windows one-shot setup (Docker + Prisma)
---------------------------------------
Use the bundled PowerShell script to spin up Postgres on 5433 and run Prisma:

```
cd apps/backend
./scripts/setup.ps1         # or: ./scripts/setup.ps1 -Recreate for clean start
```

Security Recommendations
------------------------
- Keep PostgreSQL behind a firewall/VPC; do not expose it directly to the public internet.
- Use separate roles:
  - `solotto_app` for read/write service operations.
  - `solotto_ro` used by public read-only endpoints (history, wallet lookup).
- Store secrets in environment variables; never commit credentials.
- Rotate passwords periodically and enforce least privilege.

Troubleshooting
---------------
- Port conflicts:
  - If another Postgres is on 5432, our Docker maps to 5433 (localhost:5433).
- Test connectivity:
  - `psql -h localhost -p 5433 -U solotto_app -d solotto`
- Prisma connection issues:
  - Ensure `DATABASE_URL` matches your chosen port and credentials.
  - `npx prisma db pull` can confirm connectivity.

