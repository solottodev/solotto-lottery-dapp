import { useWallet } from "@solana/wallet-adapter-react";
import { useCallback } from "react";
import { useAuthStore } from "./useAuthStore";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // btoa is available in the browser; avoids Node Buffer usage
  return btoa(binary);
}

export function useAuth() {
  const { publicKey, signMessage } = useWallet();
  const setJwt = useAuthStore((s) => s.setJwt);

  const login = useCallback(async () => {
    if (!publicKey || !signMessage) {
      alert("Wallet not connected or does not support message signing.");
      return;
    }

    const message = `Authenticate with Solotto\n${new Date().toISOString()}`;
    const encodedMessage = new TextEncoder().encode(message);
    const signature = await signMessage(encodedMessage);
    const signatureBase64 = toBase64(signature);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
    const res = await fetch(`${backendUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicKey: publicKey.toBase58(),
        message,
        signature: signatureBase64
      })
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("Login failed:", data);
      alert("Login failed");
      return;
    }

    setJwt(data.token);
    alert("✅ Operator authenticated");
  }, [publicKey, signMessage, setJwt]);

  return { login };
}
