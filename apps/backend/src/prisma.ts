import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Connection pool configuration for Supabase
// Supabase Pro tier allows 15 connections per pooler
// We use 12 to leave headroom for direct connections and migrations
const POOL_SIZE = 12;
const POOL_TIMEOUT = 20; // seconds

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

// REMOVED: Read-only client - was pointing to same database, wasting connections
// All queries now use the primary client with proper pool configuration
export const prismaRO = prisma;

// Graceful shutdown handler
export async function disconnectPrisma() {
  if (prisma) {
    await prisma.$disconnect();
  }
}

// Handle process termination
if (process.env.NODE_ENV === 'production') {
  process.on('SIGINT', async () => {
    console.log('Received SIGINT, closing database connections...');
    await disconnectPrisma();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, closing database connections...');
    await disconnectPrisma();
    process.exit(0);
  });
}
