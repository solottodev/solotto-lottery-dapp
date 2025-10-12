"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireJwt = requireJwt;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function requireJwt(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader)
        return res.status(401).json({ error: "Missing Authorization header" });
    const token = authHeader.split(" ")[1];
    if (!token)
        return res.status(401).json({ error: "Invalid token format" });
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || "changeme");
        req.user = payload;
        next();
    }
    catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}
