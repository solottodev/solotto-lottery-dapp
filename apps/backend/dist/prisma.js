"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prismaRO = exports.prisma = void 0;
exports.getPrismaRO = getPrismaRO;
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        log: ['query', 'error', 'warn'], // Optional: Adjust for production
    });
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
exports.default = exports.prisma;
// Optional read-only client (uses DATABASE_URL_RO if provided)
let _prismaRO = null;
function getPrismaRO() {
    if (_prismaRO)
        return _prismaRO;
    const roUrl = process.env.DATABASE_URL_RO;
    if (roUrl) {
        _prismaRO = new client_1.PrismaClient({
            log: ['error', 'warn'],
            datasources: { db: { url: roUrl } },
        });
        return _prismaRO;
    }
    // Fallback to primary if RO not configured
    return exports.prisma;
}
exports.prismaRO = getPrismaRO();
