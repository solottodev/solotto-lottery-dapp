"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.issueJwt = issueJwt;
exports.verifyJwt = verifyJwt;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const secret = process.env.JWT_SECRET || "changeme";
function issueJwt(payload) {
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: "1h" });
}
function verifyJwt(token) {
    return jsonwebtoken_1.default.verify(token, secret);
}
