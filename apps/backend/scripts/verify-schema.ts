/**
 * Verify Supabase schema after migration
 */
import { PrismaClient } from '@prisma/client';

const connectionString = "postgresql://postgres:2Solanasbesta99!@db.nkiezfkiasqgefzgyuwb.supabase.co:5432/postgres?sslmode=require";

async function verifySchema() {
  console.log('\n📊 Verifying Supabase Database Schema\n');
  console.log('='.repeat(50));

  const prisma = new PrismaClient({
    datasources: {
      db: { url: connectionString }
    }
  });

  try {
    // Check tables
    const tables: any = await prisma.$queryRaw`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    console.log('\n✅ Tables Created:\n');
    const expectedTables = [
      'User',
      'LotteryConfig',
      'Round',
      'Participant',
      'Snapshot',
      'Drawing',
      '_prisma_migrations',
    ];

    const actualTables = tables.map((t: any) => t.table_name);

    expectedTables.forEach(table => {
      if (actualTables.includes(table)) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} (MISSING)`);
      }
    });

    // Check indexes
    const indexes: any = await prisma.$queryRaw`
      SELECT
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename = 'Round'
      ORDER BY tablename, indexname;
    `;

    console.log('\n✅ Indexes on Round Table:\n');
    indexes.forEach((idx: any) => {
      console.log(`   ✅ ${idx.indexname}`);
    });

    // Check migrations history
    const migrations: any = await prisma.$queryRaw`
      SELECT migration_name, finished_at
      FROM _prisma_migrations
      ORDER BY finished_at;
    `;

    console.log('\n✅ Migration History:\n');
    migrations.forEach((m: any, i: number) => {
      console.log(`   ${i + 1}. ${m.migration_name}`);
      console.log(`      Applied: ${m.finished_at.toISOString()}`);
    });

    console.log('\n' + '='.repeat(50));
    console.log('✅ Schema verification complete!');
    console.log('='.repeat(50));
    console.log('\nNext Steps:');
    console.log('1. Go to Supabase Dashboard → SQL Editor');
    console.log('2. Run: apps/backend/prisma/supabase-init-roles.sql');
    console.log('3. Generate strong passwords for solotto_app and solotto_ro');
    console.log('4. Update .env.supabase with the passwords\n');

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Verification failed:', (error as Error).message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

verifySchema();
