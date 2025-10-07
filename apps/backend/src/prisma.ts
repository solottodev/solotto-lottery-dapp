import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query', 'error', 'warn'], // Optional: Adjust for production
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;

// Optional read-only client (uses DATABASE_URL_RO if provided)
let _prismaRO: PrismaClient | null = null;
export function getPrismaRO(): PrismaClient {
  if (_prismaRO) return _prismaRO;
  const roUrl = process.env.DATABASE_URL_RO;
  if (roUrl) {
    _prismaRO = new PrismaClient({
      log: ['error', 'warn'],
      datasources: { db: { url: roUrl } },
    });
    return _prismaRO;
  }
  // Fallback to primary if RO not configured
  return prisma;
}

export const prismaRO = getPrismaRO();
