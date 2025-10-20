#!/bin/bash
# ===============================================
# Supabase Migration Script
# Deploys Prisma migrations to Supabase database
# ===============================================

set -e  # Exit on error

echo "🚀 Supabase Migration Script"
echo "======================================"
echo ""

# Check if .env.supabase exists
if [ ! -f ".env.supabase" ]; then
    echo "❌ Error: .env.supabase not found"
    echo "   1. Copy .env.supabase.example to .env.supabase"
    echo "   2. Fill in your Supabase connection details"
    echo "   3. Run this script again"
    exit 1
fi

# Load environment variables
set -a
source .env.supabase
set +a

# Verify DATABASE_URL_DIRECT is set
if [ -z "$DATABASE_URL_DIRECT" ]; then
    echo "❌ Error: DATABASE_URL_DIRECT not set in .env.supabase"
    echo "   Add: DATABASE_URL_DIRECT=\"postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres?sslmode=require\""
    exit 1
fi

echo "✅ Environment loaded from .env.supabase"
echo ""

# Extract host from connection string for display (hide password)
HOST=$(echo $DATABASE_URL_DIRECT | sed -n 's/.*@\(db\.[^:]*\.supabase\.co\).*/\1/p')
echo "Target Database: $HOST"
echo ""

# Confirm before proceeding
read -p "⚠️  This will apply migrations to the database above. Continue? (y/N): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Migration cancelled"
    exit 1
fi

echo ""
echo "📦 Running Prisma migrations..."
echo "======================================"
echo ""

# Use direct connection for migrations (no pooler)
export DATABASE_URL=$DATABASE_URL_DIRECT

# Check migration status
echo "🔍 Checking migration status..."
npx prisma migrate status

echo ""
echo "🚀 Deploying migrations..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrations applied successfully!"
    echo ""
    echo "📊 Verifying schema..."
    npx prisma db pull --print

    echo ""
    echo "======================================"
    echo "✅ Migration Complete!"
    echo "======================================"
    echo ""
    echo "Next steps:"
    echo "1. Run role setup SQL in Supabase SQL Editor:"
    echo "   → Open: apps/backend/prisma/supabase-init-roles.sql"
    echo "   → Copy contents to Supabase SQL Editor"
    echo "   → Replace password placeholders"
    echo "   → Execute"
    echo ""
    echo "2. Test connection:"
    echo "   → npx ts-node scripts/test-supabase-connection.ts"
    echo ""
    echo "3. Verify in Supabase Dashboard:"
    echo "   → Table Editor should show all tables"
    echo "   → Database → Roles should show solotto_app, solotto_ro"
    echo ""
else
    echo ""
    echo "❌ Migration failed!"
    echo ""
    echo "Troubleshooting:"
    echo "1. Verify connection string is correct"
    echo "2. Check Supabase Dashboard → Database Health"
    echo "3. Ensure IP is allowed in Network Restrictions"
    echo "4. Review error messages above"
    echo ""
    exit 1
fi
