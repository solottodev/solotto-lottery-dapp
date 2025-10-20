@echo off
REM Quick migration script for Supabase
echo.
echo 🚀 Running Prisma Migrations to Supabase
echo ==========================================
echo.

REM Set the Supabase connection string
set DATABASE_URL=postgresql://postgres:2Solanasbesta99!@db.nkiezfkiasqgefzgyuwb.supabase.co:5432/postgres?sslmode=require

echo 📍 Target: db.nkiezfkiasqgefzgyuwb.supabase.co
echo.

REM Check migration status
echo 🔍 Checking migration status...
call npx prisma migrate status

echo.
echo 🚀 Deploying migrations...
echo.

REM Deploy migrations
call npx prisma migrate deploy

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Migrations completed successfully!
    echo.
    echo 📊 Verifying schema...
    call npx prisma db pull --print
    echo.
    echo ==========================================
    echo ✅ Migration Complete!
    echo ==========================================
    echo.
    echo Next step: Create database roles in Supabase SQL Editor
    echo See: apps\backend\prisma\supabase-init-roles.sql
    echo.
) else (
    echo.
    echo ❌ Migration failed! Check errors above.
    echo.
    exit /b 1
)
