"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.login = login;
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jwt_1 = require("../utils/jwt");
const prisma = new client_1.PrismaClient();
async function register(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }
    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(409).json({ error: "User already exists" });
        }
        const hashedPassword = await bcrypt_1.default.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
            },
        });
        return res.status(201).json({ message: "User registered successfully", user: { id: user.id, email: user.email } });
    }
    catch (error) {
        console.error("Register Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
async function login(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }
    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const passwordMatch = await bcrypt_1.default.compare(password, user.password);
        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = (0, jwt_1.issueJwt)({ id: user.id, email: user.email });
        return res.status(200).json({ token });
    }
    catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
}
