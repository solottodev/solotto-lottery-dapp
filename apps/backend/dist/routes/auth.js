"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const speakeasy_1 = __importDefault(require("speakeasy"));
const qrcode_1 = __importDefault(require("qrcode"));
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
 * Body: { email: string, password: string, totpCode?: string }
 */
router.post("/login", async (req, res) => {
    const { email, password, totpCode } = req.body;
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
        // Check if 2FA is enabled
        if (user.totpEnabled) {
            if (!totpCode) {
                // Password is correct but 2FA code required
                return res.status(200).json({
                    requiresTOTP: true,
                    message: "2FA code required"
                });
            }
            // Verify TOTP code
            const verified = speakeasy_1.default.totp.verify({
                secret: user.totpSecret,
                encoding: "base32",
                token: totpCode,
                window: 1, // Allow 1 step before/after for time drift
            });
            if (!verified) {
                return res.status(401).json({ error: "Invalid 2FA code" });
            }
        }
        // Issue JWT token
        const token = (0, jwt_1.issueJwt)({ id: user.id, email: user.email });
        return res.json({ token });
    }
    catch (err) {
        console.error("Login failed:", err);
        return res.status(500).json({ error: "Internal error" });
    }
});
/**
 * POST /auth/setup-2fa
 * Setup 2FA for a user (requires valid JWT token)
 * Headers: { Authorization: Bearer <token> }
 */
router.post("/setup-2fa", async (req, res) => {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing or invalid authorization header" });
        }
        const token = authHeader.substring(7); // Remove "Bearer " prefix
        let decoded;
        try {
            decoded = (0, jwt_1.verifyJwt)(token);
        }
        catch (err) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }
        // Find user
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        // Check if 2FA is already enabled
        if (user.totpEnabled) {
            return res.status(400).json({ error: "2FA is already enabled for this account" });
        }
        // Generate TOTP secret
        const secret = speakeasy_1.default.generateSecret({
            name: `Solotto (${user.email})`,
            issuer: "Solotto Lottery",
            length: 32,
        });
        // Generate QR code
        const qrCodeDataURL = await qrcode_1.default.toDataURL(secret.otpauth_url);
        // Save the secret to the database (but don't enable 2FA yet)
        await prisma.user.update({
            where: { id: user.id },
            data: {
                totpSecret: secret.base32,
                totpEnabled: false, // Will be enabled after verification
            },
        });
        return res.status(200).json({
            secret: secret.base32,
            qrCode: qrCodeDataURL,
            otpauthUrl: secret.otpauth_url,
            message: "Scan the QR code with your authenticator app and verify with /auth/verify-2fa",
        });
    }
    catch (err) {
        console.error("2FA setup failed:", err);
        return res.status(500).json({ error: "Internal error" });
    }
});
/**
 * POST /auth/verify-2fa
 * Verify and enable 2FA with a TOTP code (requires valid JWT token)
 * Headers: { Authorization: Bearer <token> }
 * Body: { totpCode: string }
 */
router.post("/verify-2fa", async (req, res) => {
    const { totpCode } = req.body;
    if (!totpCode) {
        return res.status(400).json({ error: "Missing TOTP code" });
    }
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing or invalid authorization header" });
        }
        const token = authHeader.substring(7);
        let decoded;
        try {
            decoded = (0, jwt_1.verifyJwt)(token);
        }
        catch (err) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }
        // Find user
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        if (!user.totpSecret) {
            return res.status(400).json({ error: "2FA setup not initiated. Call /auth/setup-2fa first" });
        }
        if (user.totpEnabled) {
            return res.status(400).json({ error: "2FA is already enabled for this account" });
        }
        // Verify TOTP code
        const verified = speakeasy_1.default.totp.verify({
            secret: user.totpSecret,
            encoding: "base32",
            token: totpCode,
            window: 1,
        });
        if (!verified) {
            return res.status(401).json({ error: "Invalid 2FA code. Please try again" });
        }
        // Enable 2FA
        await prisma.user.update({
            where: { id: user.id },
            data: {
                totpEnabled: true,
            },
        });
        return res.status(200).json({
            success: true,
            message: "2FA enabled successfully. You will now need to provide a code when logging in.",
        });
    }
    catch (err) {
        console.error("2FA verification failed:", err);
        return res.status(500).json({ error: "Internal error" });
    }
});
/**
 * POST /auth/disable-2fa
 * Disable 2FA for a user (requires valid JWT token and current TOTP code)
 * Headers: { Authorization: Bearer <token> }
 * Body: { totpCode: string }
 */
router.post("/disable-2fa", async (req, res) => {
    const { totpCode } = req.body;
    if (!totpCode) {
        return res.status(400).json({ error: "Missing TOTP code" });
    }
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Missing or invalid authorization header" });
        }
        const token = authHeader.substring(7);
        let decoded;
        try {
            decoded = (0, jwt_1.verifyJwt)(token);
        }
        catch (err) {
            return res.status(401).json({ error: "Invalid or expired token" });
        }
        // Find user
        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        if (!user.totpEnabled || !user.totpSecret) {
            return res.status(400).json({ error: "2FA is not enabled for this account" });
        }
        // Verify TOTP code before disabling
        const verified = speakeasy_1.default.totp.verify({
            secret: user.totpSecret,
            encoding: "base32",
            token: totpCode,
            window: 1,
        });
        if (!verified) {
            return res.status(401).json({ error: "Invalid 2FA code" });
        }
        // Disable 2FA and clear secret
        await prisma.user.update({
            where: { id: user.id },
            data: {
                totpEnabled: false,
                totpSecret: null,
            },
        });
        return res.status(200).json({
            success: true,
            message: "2FA disabled successfully",
        });
    }
    catch (err) {
        console.error("2FA disable failed:", err);
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
