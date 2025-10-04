import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";

/**
 * Verify a signed message from a Solana wallet
 */
export function verifySignature(message: string, signature: Uint8Array, publicKey: string): boolean {
  const pk = new PublicKey(publicKey);
  const messageBytes = Buffer.from(message, "utf8");
  return nacl.sign.detached.verify(messageBytes, signature, pk.toBytes());
}
