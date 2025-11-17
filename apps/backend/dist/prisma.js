"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prismaRO = exports.prisma = void 0;
exports.disconnectPrisma = disconnectPrisma;
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
// Connection pool configuration for Supabase
// Supabase Pro tier allows 15 connections per pooler (session mode)
// Pool parameters are configured in DATABASE_URL environment variable
// This function preserves all existing URL parameters (especially pgbouncer=true)
function getDatabaseUrlWithPool() {
    const baseUrl = process.env.DATABASE_URL;
    if (!baseUrl)
        throw new Error('DATABASE_URL is not defined');
    // Simply return the DATABASE_URL as-is to preserve all parameters
    // including pgbouncer=true, connection_limit, pool_timeout, etc.
    return baseUrl;
}
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn'],
        datasources: {
            db: {
                url: getDatabaseUrlWithPool(),
            },
        },
    });
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
exports.default = exports.prisma;
// REMOVED: Read-only client - was pointing to same database, wasting connections
// All queries now use the primary client with proper pool configuration
exports.prismaRO = exports.prisma;
// Graceful shutdown handler
async function disconnectPrisma() {
    if (exports.prisma) {
        await exports.prisma.$disconnect();
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
