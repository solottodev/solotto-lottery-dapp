import { PrismaClient } from '@prisma/client';

/**
 * Global teardown for tests
 * Cleans up database connections and test data
 */
export default async function globalTeardown() {
  console.log('\n🧹 Running global test teardown...');

  try {
    // Close any open Prisma connections
    const prisma = new PrismaClient();
    await prisma.$disconnect();
    console.log('✅ Database connections closed');
  } catch (error) {
    console.error('❌ Error during teardown:', error);
  }
}
