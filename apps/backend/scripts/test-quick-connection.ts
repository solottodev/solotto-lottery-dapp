/**
 * Quick connection test for Supabase
 */
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:2Solanasbesta99!@db.nkiezfkiasqgefzgyuwb.supabase.co:5432/postgres?sslmode=require";

async function testConnection() {
  console.log('🔌 Testing Supabase connection...\n');

  const prisma = new PrismaClient({
    datasources: {
      db: { url: connectionString }
    }
  });

  try {
    await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Connection successful!');
    console.log('📍 Host: db.nkiezfkiasqgefzgyuwb.supabase.co\n');
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', (error as Error).message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();
