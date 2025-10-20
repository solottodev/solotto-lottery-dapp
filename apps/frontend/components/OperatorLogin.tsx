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
  const [totpCode, setTotpCode] = useState("");
  const [requiresTOTP, setRequiresTOTP] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const result = await login({ email, password, totpCode: totpCode || undefined });

      if (result?.requiresTOTP) {
        // 2FA is required, show TOTP input
        setRequiresTOTP(true);
      } else if (result?.success) {
        // Login successful
        setOpen(false);
        setEmail("");
        setPassword("");
        setTotpCode("");
        setRequiresTOTP(false);
      }
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setEmail("");
    setPassword("");
    setTotpCode("");
    setRequiresTOTP(false);
    setError(null);
  }

  return (
    <div className="relative">
      {jwt ? (
        <button
          onClick={() => setJwt(null)}
          className="rounded-lg bg-gradient-to-br from-green-500 to-emerald-500 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-lg hover:brightness-110 transition-all whitespace-nowrap"
        >
          Logged in • Logout
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 px-3 sm:px-4 md:px-5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-white shadow-lg hover:brightness-110 transition-all whitespace-nowrap"
        >
          Authenticate as Operator
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[2000] flex items-start justify-end bg-black/60 backdrop-blur-sm p-4 pt-24 sm:pt-28 md:pt-32">
          <div className="w-full max-w-sm rounded-2xl border border-primary/25 bg-night-900 p-6 text-slate-100 shadow-2xl">
            <div className="mb-4 text-left">
              <h3 className="text-lg font-semibold text-primary">Operator Login</h3>
              <p className="text-xs text-slate-400 mt-1">
                {requiresTOTP ? 'Enter your 2FA code from your authenticator app' : 'Enter your email and password'}
              </p>
            </div>
            <form onSubmit={onSubmit} className="space-y-4">
              {!requiresTOTP ? (
                <>
                  <div>
                    <label className="mb-1 block text-sm text-slate-300">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-primary/25 bg-night-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/40"
                      placeholder="operator@localhost"
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
                </>
              ) : (
                <div>
                  <label className="mb-1 block text-sm text-slate-300">2FA Code</label>
                  <input
                    type="text"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="w-full rounded-lg border border-primary/25 bg-night-800 px-4 py-2.5 text-white text-center tracking-widest placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono text-lg"
                    placeholder="123456"
                    maxLength={6}
                    autoComplete="off"
                    autoFocus
                    required
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Enter the 6-digit code from your authenticator app
                  </p>
                </div>
              )}
              {error && <div className="text-red-400 text-sm">{error}</div>}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-primary/25 px-4 py-2 text-sm text-slate-200 hover:bg-night-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-badge-gradient px-4 py-2 text-sm font-semibold text-white shadow-md disabled:opacity-60 hover:brightness-110 transition-all"
                >
                  {loading ? 'Verifying…' : requiresTOTP ? 'Verify Code' : 'Sign in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

