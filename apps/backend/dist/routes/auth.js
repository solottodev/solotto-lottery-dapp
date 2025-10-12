"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jwt_1 = require("../utils/jwt");
const solana_1 = require("../utils/solana");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
/**
 * POST /auth/register
 * Body: { email: string, password: string }
 */
router.post("/register", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Missing email or password" });
    }
    try {
        // Check if user already exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json({ error: "User already exists" });
        }
        // Hash password
        const hashedPassword = await bcryptjs_1.default.hash(password, 10);
        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            },
        });
        // Issue JWT
        const token = (0, jwt_1.issueJwt)({ id: user.id, email: user.email });
        return res.status(201).json({ token });
    }
    catch (err) {
        console.error("Registration failed:", err);
        return res.status(500).json({ error: "Registration failed" });
    }
});
/**
 * POST /auth/login
 * Body: { email: string, password: string }
 */
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Missing email or password" });
    }
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const validPassword = await bcryptjs_1.default.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = (0, jwt_1.issueJwt)({ id: user.id, email: user.email });
        return res.json({ token });
    }
    catch (err) {
        console.error("Login failed:", err);
        return res.status(500).json({ error: "Internal error" });
    }
});
/**
 * POST /auth/login-wallet
 * Body: { publicKey: string, signature: string, message: string }
 * (Optional wallet-based login route)
 */
router.post("/login-wallet", (req, res) => {
    const { publicKey, signature, message } = req.body;
    if (!publicKey || !signature || !message) {
        return res.status(400).json({ error: "Missing fields" });
    }
    try {
        const sigBytes = Uint8Array.from(Buffer.from(signature, "base64"));
        const valid = (0, solana_1.verifySignature)(message, sigBytes, publicKey);
        if (!valid) {
            return res.status(401).json({ error: "Signature verification failed" });
        }
        const token = (0, jwt_1.issueJwt)({ publicKey });
        return res.json({ token });
    }
    catch (err) {
        console.error("Wallet login failed:", err);
        return res.status(500).json({ error: "Internal error" });
    }
});
exports.default = router;
