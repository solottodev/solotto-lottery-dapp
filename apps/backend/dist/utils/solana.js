"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifySignature = verifySignature;
const web3_js_1 = require("@solana/web3.js");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
/**
 * Verify a signed message from a Solana wallet
 */
function verifySignature(message, signature, publicKey) {
    const pk = new web3_js_1.PublicKey(publicKey);
    const messageBytes = Buffer.from(message, "utf8");
    return tweetnacl_1.default.sign.detached.verify(messageBytes, signature, pk.toBytes());
}
