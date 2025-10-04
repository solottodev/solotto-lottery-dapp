import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { issueJwt } from "../utils/jwt";
import { verifySignature } from "../utils/solana";

const router = Router();
const prisma = new PrismaClient();

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
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    // Issue JWT
    const token = issueJwt({ id: user.id, email: user.email });
    return res.status(201).json({ token });
  } catch (err) {
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

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = issueJwt({ id: user.id, email: user.email });
    return res.json({ token });
  } catch (err) {
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
    const valid = verifySignature(message, sigBytes, publicKey);

    if (!valid) {
      return res.status(401).json({ error: "Signature verification failed" });
    }

    const token = issueJwt({ publicKey });
    return res.json({ token });
  } catch (err) {
    console.error("Wallet login failed:", err);
    return res.status(500).json({ error: "Internal error" });
  }
});

export default router;
