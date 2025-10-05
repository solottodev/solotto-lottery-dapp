"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/hooks/useAuthStore";

export default function OperatorLogin() {
  const { login } = useAuth();
  const jwt = useAuthStore((s) => s.jwt);
  const setJwt = useAuthStore((s) => s.setJwt);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login({ email, password });
      setOpen(false);
      setEmail("");
      setPassword("");
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="my-4 relative">
      {jwt ? (
        <button
          onClick={() => setJwt(null)}
          className="rounded bg-gradient-to-br from-green-500 to-emerald-500 px-5 py-2 text-sm font-semibold text-night shadow-glow hover:brightness-110"
        >
          Logged in • Logout
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded bg-gradient-to-br from-purple-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-night shadow-glow hover:brightness-110"
        >
          Authenticate as Operator
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-primary/25 bg-night-900 p-6 text-slate-100 shadow-xl">
            <div className="mb-4 text-center">
              <h3 className="text-lg font-semibold text-primary">Operator Login</h3>
              <p className="text-xs text-slate-400">Enter your email and password</p>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-slate-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-primary/25 bg-night-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-slate-300">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-primary/25 bg-night-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && <div className="text-red-400 text-sm">{error}</div>}
              <div className="mt-1 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-primary/25 px-3 py-1.5 text-xs text-slate-200 hover:bg-night-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-badge-gradient px-3.5 py-1.5 text-xs font-semibold text-white shadow-md disabled:opacity-60"
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

