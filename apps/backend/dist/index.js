"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const swagger_1 = __importDefault(require("./config/swagger"));
const auth_1 = __importDefault(require("./routes/auth"));
const protected_1 = __importDefault(require("./routes/protected"));
const control_1 = __importDefault(require("./routes/control"));
const harvest_1 = __importDefault(require("./routes/harvest"));
const distribution_1 = __importDefault(require("./routes/distribution"));
const history_1 = __importDefault(require("./routes/history"));
const snapshot_1 = __importDefault(require("./routes/snapshot"));
const drawing_1 = __importDefault(require("./routes/drawing"));
const transparency_1 = __importDefault(require("./routes/transparency"));
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Root endpoint - simple health check that works even if DB is down
app.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        service: 'Solotto Backend API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        docs: '/api/v1/docs'
    });
});
// API Documentation — cast swagger types to Express handlers to avoid
// duplicate @types/express instance incompatibilities in workspaces
const swaggerServe = swagger_ui_express_1.default.serve;
const swaggerSetup = swagger_ui_express_1.default.setup(swagger_1.default, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Solotto API Documentation',
    customfavIcon: '/favicon.ico'
});
app.use('/api/v1/docs', ...swaggerServe, swaggerSetup);
// Versioned API (v1)
app.use('/api/v1/control', control_1.default);
app.use('/api/v1/harvest', harvest_1.default);
app.use('/api/v1/distribution', distribution_1.default);
app.use('/api/v1/history', history_1.default);
app.use('/api/v1/snapshot', snapshot_1.default);
app.use('/api/v1/drawing', drawing_1.default);
app.use('/api/v1/transparency', transparency_1.default);
// Keep auth endpoints unversioned for now (can add /api/v1 later)
app.use("/auth", auth_1.default);
app.use('/api/v1/auth', auth_1.default);
app.use("/protected", protected_1.default);
// Basic health route
const prisma_1 = require("./prisma");
const rpc_service_1 = require("./services/rpc.service");
const jupiter_service_1 = require("./services/jupiter.service");
const alchemy_client_1 = require("./services/alchemy.client");
/**
 * @swagger
 * /api/v1/health:
 *   get:
 *     summary: System health check
 *     description: Verifies backend services are operational (database connectivity)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: true
 *                 database:
 *                   type: string
 *                   example: healthy
 *       500:
 *         description: System is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                   example: false
 *                 database:
 *                   type: string
 *                   example: unhealthy
 */
app.get('/api/v1/health', async (_req, res) => {
    try {
        await prisma_1.prismaRO.$queryRaw `SELECT 1`;
        return res.json({ ok: true, database: 'healthy' });
    }
    catch (e) {
        const err = e;
        const details = process.env.HEALTH_DEBUG === '1'
            ? { code: err?.code, message: String(err?.message || err) }
            : undefined;
        console.error('Health check failed', err?.code || '', err?.message || err);
        return res.status(500).json({ ok: false, database: 'unhealthy', details });
    }
});
/**
 * @swagger
 * /api/v1/health/rpc:
 *   get:
 *     summary: RPC connection health check
 *     description: Tests primary and fallback Solana RPC connections
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: RPC connection status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 connections:
 *                   type: object
 *                   properties:
 *                     primary:
 *                       type: object
 *                       properties:
 *                         healthy:
 *                           type: boolean
 *                         endpoint:
 *                           type: string
 *                     fallback:
 *                       type: object
 *                       properties:
 *                         healthy:
 *                           type: boolean
 *                         endpoint:
 *                           type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: RPC health check failed
 */
app.get('/api/v1/health/rpc', async (_req, res) => {
    try {
        const rpcService = (0, rpc_service_1.getRPCService)();
        const health = await rpcService.testConnections();
        const allHealthy = health.primary.healthy && health.fallback.healthy;
        return res.json({
            ok: allHealthy,
            connections: health,
            timestamp: new Date().toISOString()
        });
    }
    catch (e) {
        console.error('RPC health check failed', e);
        return res.status(500).json({ ok: false, error: 'RPC health check failed' });
    }
});
/**
 * @swagger
 * /api/v1/health/alchemy:
 *   get:
 *     summary: Alchemy API health check
 *     description: Tests connection to Alchemy Enhanced API for pricing data
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Alchemy connection status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Alchemy not configured or unhealthy
 */
app.get('/api/v1/health/alchemy', async (_req, res) => {
    try {
        const alchemyClient = (0, alchemy_client_1.getAlchemyClient)();
        const healthy = await alchemyClient.testConnection();
        return res.json({
            ok: healthy,
            timestamp: new Date().toISOString()
        });
    }
    catch (e) {
        console.error('Alchemy health check failed', e);
        return res.status(500).json({ ok: false, error: 'Alchemy not configured or unhealthy' });
    }
});
/**
 * @swagger
 * /api/v1/health/jupiter:
 *   get:
 *     summary: Jupiter API health check
 *     description: Checks Jupiter configuration and DNS resolution for the API host
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Jupiter health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:
 *                   type: boolean
 *                 configured:
 *                   type: boolean
 *                 diagnostics:
 *                   type: object
 *       500:
 *         description: Jupiter health check failed
 */
app.get('/api/v1/health/jupiter', async (_req, res) => {
    try {
        const jupiter = (0, jupiter_service_1.getJupiterService)();
        const diag = await jupiter.diagnostics();
        const ok = diag.dns.ok;
        return res.json({ ok, configured: diag.configured, diagnostics: diag, timestamp: new Date().toISOString() });
    }
    catch (e) {
        console.error('Jupiter health check failed', e);
        return res.status(500).json({ ok: false, error: 'Jupiter health check failed' });
    }
});
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`Backend running on port ${PORT}`);
});
