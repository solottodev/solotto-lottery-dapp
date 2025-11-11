import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Connection pool configuration for Supabase
// Supabase Pro tier allows 15 connections per pooler (session mode)
// We use 5 conservative connections per Render instance to prevent exhaustion
// This leaves headroom for:
// - Multiple Render instances (if scaling up)
// - Direct database connections
// - Migration tools
// - Other services
const POOL_SIZE = 5;
const POOL_TIMEOUT = 20; // seconds

// Build connection URL with pool parameters
function getDatabaseUrlWithPool() {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) throw new Error('DATABASE_URL is not defined');

  const url = new URL(baseUrl);
  url.searchParams.set('connection_limit', POOL_SIZE.toString());
  url.searchParams.set('pool_timeout', POOL_TIMEOUT.toString());

  return url.toString();
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
    datasources: {
      db: {
        url: getDatabaseUrlWithPool(),
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
