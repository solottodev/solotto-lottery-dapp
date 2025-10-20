-- ===============================================
-- Supabase Database Roles Setup for Solotto
-- Run this in Supabase SQL Editor after migrations
-- ===============================================

-- Instructions:
-- 1. Go to Supabase Dashboard → SQL Editor
-- 2. Click "New query"
-- 3. Replace REPLACE_WITH_STRONG_PASSWORD_1 and REPLACE_WITH_STRONG_PASSWORD_2
--    with strong passwords (use password generator, 32+ chars)
-- 4. Save these passwords in your password manager or secrets vault
-- 5. Click "Run" to execute

-- -----------------------------------------------
-- 1. Create application role (read/write)
-- -----------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'solotto_app') THEN
    CREATE ROLE solotto_app LOGIN PASSWORD 'REPLACE_WITH_STRONG_PASSWORD_1';
    RAISE NOTICE 'Created role: solotto_app';
  ELSE
    RAISE NOTICE 'Role solotto_app already exists';
  END IF;
END$$;

-- -----------------------------------------------
-- 2. Create read-only role (for public endpoints)
-- -----------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'solotto_ro') THEN
    CREATE ROLE solotto_ro LOGIN PASSWORD 'REPLACE_WITH_STRONG_PASSWORD_2';
    RAISE NOTICE 'Created role: solotto_ro';
  ELSE
    RAISE NOTICE 'Role solotto_ro already exists';
  END IF;
END$$;

-- -----------------------------------------------
-- 3. Grant connection privileges
-- -----------------------------------------------
GRANT CONNECT ON DATABASE postgres TO solotto_app, solotto_ro;
GRANT USAGE ON SCHEMA public TO solotto_app, solotto_ro;

-- -----------------------------------------------
-- 4. Grant read/write privileges to solotto_app
-- -----------------------------------------------
-- Current tables
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO solotto_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO solotto_app;

-- Future tables (important for Prisma migrations)
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO solotto_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO solotto_app;

-- -----------------------------------------------
-- 5. Grant read-only privileges to solotto_ro
-- -----------------------------------------------
-- Current tables
GRANT SELECT ON ALL TABLES IN SCHEMA public TO solotto_ro;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO solotto_ro;

-- Future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO solotto_ro;

-- -----------------------------------------------
-- 6. Verify roles were created successfully
-- -----------------------------------------------
SELECT
  rolname AS "Role Name",
  rolcanlogin AS "Can Login",
  rolsuper AS "Superuser",
  rolcreatedb AS "Can Create DB",
  rolcreaterole AS "Can Create Role"
FROM pg_roles
WHERE rolname IN ('solotto_app', 'solotto_ro', 'postgres')
ORDER BY rolname;

-- Expected output:
--  Role Name   | Can Login | Superuser | Can Create DB | Can Create Role
-- -------------+-----------+-----------+---------------+-----------------
--  postgres    | t         | t         | t             | t
--  solotto_app | t         | f         | f             | f
--  solotto_ro  | t         | f         | f             | f

-- -----------------------------------------------
-- 7. Verify table permissions
-- -----------------------------------------------
SELECT
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE grantee IN ('solotto_app', 'solotto_ro')
  AND table_schema = 'public'
ORDER BY grantee, table_name, privilege_type;

-- Expected: solotto_app should have SELECT, INSERT, UPDATE, DELETE
--           solotto_ro should have SELECT only

-- -----------------------------------------------
-- 8. Test read-only enforcement (Optional)
-- -----------------------------------------------
-- Uncomment to test that solotto_ro cannot write:

-- SET ROLE solotto_ro;
-- INSERT INTO "User" (id, email, password) VALUES ('test-id', 'test@test.com', 'test');
-- Expected: ERROR: permission denied for table User
-- RESET ROLE;

RAISE NOTICE '✅ Role setup complete! Save the passwords and update your .env file.';
