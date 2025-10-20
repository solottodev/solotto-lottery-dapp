import { useCallback } from "react";
import { useAuthStore } from "./useAuthStore";

export function useAuth() {
  const setJwt = useAuthStore((s) => s.setJwt);

  const login = useCallback(
    async (creds?: { email: string; password: string; totpCode?: string }) => {
      let email = creds?.email;
      let password = creds?.password;
      let totpCode = creds?.totpCode;

      if (!email || !password) {
        email = window.prompt("Operator email:") || '';
        password = window.prompt("Operator password:") || '';
      }
      if (!email || !password) {
        throw new Error("Email and password are required.");
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
      const res = await fetch(`${backendUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, totpCode })
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Login failed:", data);
        throw new Error(data?.error || "Login failed");
      }

      // Check if 2FA is required
      if (data.requiresTOTP) {
        return { requiresTOTP: true };
      }

      // Login successful, set JWT token
      if (data.token) {
        setJwt(data.token);
        return { success: true };
      }

      throw new Error("Unexpected response from server");
    },
    [setJwt]
  );

  return { login };
}
