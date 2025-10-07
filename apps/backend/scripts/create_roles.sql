-- Standalone SQL to create Solotto application roles on an existing PostgreSQL database.
-- Run this as an admin/superuser connected to your target database (e.g., DB = solotto).
-- Example: psql -h localhost -U postgres -d solotto -f scripts/create_roles.sql

-- Update these passwords before running if desired.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'solotto_app') THEN
    CREATE ROLE solotto_app LOGIN PASSWORD 'solotto_app_pw';
  ELSE
    ALTER ROLE solotto_app LOGIN PASSWORD 'solotto_app_pw';
  END IF;

  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'solotto_ro') THEN
    CREATE ROLE solotto_ro LOGIN PASSWORD 'solotto_ro_pw';
  ELSE
    ALTER ROLE solotto_ro LOGIN PASSWORD 'solotto_ro_pw';
  END IF;
END$$;

GRANT CONNECT ON DATABASE solotto TO solotto_app, solotto_ro;
GRANT USAGE ON SCHEMA public TO solotto_app, solotto_ro;

-- App role (read/write)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO solotto_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO solotto_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO solotto_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO solotto_app;

-- Read‑only role
GRANT SELECT ON ALL TABLES IN SCHEMA public TO solotto_ro;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO solotto_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO solotto_ro;

-- Optional: Verify
-- \du
-- \dt

