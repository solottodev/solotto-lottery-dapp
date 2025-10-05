import { useCallback } from "react";
import { useAuthStore } from "./useAuthStore";

export function useAuth() {
  const setJwt = useAuthStore((s) => s.setJwt);

  const login = useCallback(
    async (creds?: { email: string; password: string }) => {
      let email = creds?.email;
      let password = creds?.password;
      if (!email || !password) {
        email = window.prompt("Operator email:") || '';
        password = window.prompt("Operator password:") || '';
      }
      if (!email || !password) {
        alert("Email and password are required.");
        return;
      }

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
      const res = await fetch(`${backendUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        console.error("Login failed:", data);
        alert(data?.error || "Login failed");
        return;
      }

      setJwt(data.token);
    },
    [setJwt]
  );

  return { login };
}
