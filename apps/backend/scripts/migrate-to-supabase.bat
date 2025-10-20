@echo off
REM ===============================================
REM Supabase Migration Script (Windows)
REM Deploys Prisma migrations to Supabase database
REM ===============================================

echo.
echo 🚀 Supabase Migration Script (Windows)
echo ======================================
echo.

REM Check if .env.supabase exists
if not exist ".env.supabase" (
    echo ❌ Error: .env.supabase not found
    echo    1. Copy .env.supabase.example to .env.supabase
    echo    2. Fill in your Supabase connection details
    echo    3. Run this script again
    exit /b 1
)

echo ✅ Found .env.supabase
echo.

REM Load environment variables from .env.supabase
for /f "usebackq tokens=1,2 delims==" %%a in (".env.supabase") do (
    set "%%a=%%b"
)

REM Verify DATABASE_URL_DIRECT is set
if "%DATABASE_URL_DIRECT%"=="" (
    echo ❌ Error: DATABASE_URL_DIRECT not set in .env.supabase
    echo    Add: DATABASE_URL_DIRECT="postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?sslmode=require"
    exit /b 1
)

echo ✅ Environment loaded from .env.supabase
echo.

REM Confirm before proceeding
set /p CONFIRM="⚠️  This will apply migrations to Supabase. Continue? (y/N): "
if /i not "%CONFIRM%"=="y" (
    echo ❌ Migration cancelled
    exit /b 0
)

echo.
echo 📦 Running Prisma migrations...
echo ======================================
echo.

REM Use direct connection for migrations (no pooler)
set DATABASE_URL=%DATABASE_URL_DIRECT%

REM Check migration status
echo 🔍 Checking migration status...
call npx prisma migrate status

echo.
echo 🚀 Deploying migrations...
call npx prisma migrate deploy

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Migrations applied successfully!
    echo.
    echo 📊 Verifying schema...
    call npx prisma db pull --print

    echo.
    echo ======================================
    echo ✅ Migration Complete!
    echo ======================================
    echo.
    echo Next steps:
    echo 1. Run role setup SQL in Supabase SQL Editor:
    echo    → Open: apps\backend\prisma\supabase-init-roles.sql
    echo    → Copy contents to Supabase SQL Editor
    echo    → Replace password placeholders
    echo    → Execute
    echo.
    echo 2. Test connection:
    echo    → npx ts-node scripts\test-supabase-connection.ts
    echo.
    echo 3. Verify in Supabase Dashboard:
    echo    → Table Editor should show all tables
    echo    → Database → Roles should show solotto_app, solotto_ro
    echo.
) else (
    echo.
    echo ❌ Migration failed!
    echo.
    echo Troubleshooting:
    echo 1. Verify connection string is correct
    echo 2. Check Supabase Dashboard → Database Health
    echo 3. Ensure IP is allowed in Network Restrictions
    echo 4. Review error messages above
    echo.
    exit /b 1
)
