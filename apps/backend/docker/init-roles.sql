-- Initializes application roles for Solotto when the Postgres container is created.
-- Container creates DB 'solotto' from POSTGRES_DB env before running this script.

-- Strong example passwords. Keep these in sync with apps/backend/.env
DO $$
BEGIN
  -- Create roles if not exists
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'solotto_app') THEN
    CREATE ROLE solotto_app LOGIN PASSWORD 'solotto_app_pw';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'solotto_ro') THEN
    CREATE ROLE solotto_ro LOGIN PASSWORD 'solotto_ro_pw';
  END IF;
END$$;

-- Grants
GRANT CONNECT ON DATABASE solotto TO solotto_app, solotto_ro;
GRANT USAGE ON SCHEMA public TO solotto_app, solotto_ro;

-- RW privileges for app role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO solotto_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO solotto_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO solotto_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO solotto_app;

-- Read-only privileges
GRANT SELECT ON ALL TABLES IN SCHEMA public TO solotto_ro;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO solotto_ro;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO solotto_ro;

