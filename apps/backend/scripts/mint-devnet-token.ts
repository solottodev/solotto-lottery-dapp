import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token";
import bs58 from "bs58";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const payer = Keypair.fromSecretKey(bs58.decode(process.env.DEVNET_WALLET_PRIVATE_KEY!));
  const decimals = 9;

  const mint = await createMint(connection, payer, payer.publicKey, null, decimals);
  console.log("Mint address:", mint.toBase58());

  const tokenAccount = await getOrCreateAssociatedTokenAccount(connection, payer, mint, payer.publicKey);
  console.log("Token Account:", tokenAccount.address.toBase58());

  const amount = 100_000_000_000; // 100 tokens (with 9 decimals)
  await mintTo(connection, payer, mint, tokenAccount.address, payer.publicKey, amount);

  console.log("Minted tokens to account.");
}

main().catch(console.error);