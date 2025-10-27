"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/hooks/useAuthStore";

export default function Setup2FA() {
  const jwt = useAuthStore((s) => s.jwt);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<"init" | "scan" | "verify">("init");

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

  // Check if user already has 2FA enabled
  useEffect(() => {
    if (!jwt) return;

    // You could add an endpoint to check 2FA status
    // For now, we'll just show the setup flow
  }, [jwt]);

  async function handleSetup2FA() {
    if (!jwt) {
      setError("You must be logged in to setup 2FA");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${backendUrl}/auth/setup-2fa`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${jwt}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to setup 2FA");
      }

      setQrCode(data.qrCode);
      setSecret(data.secret);
      setStep("scan");
    } catch (err: any) {
      setError(err.message || "Failed to setup 2FA");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify2FA(e: React.FormEvent) {
    e.preventDefault();

    if (!jwt || !totpCode) {
      setError("Missing authentication or code");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${backendUrl}/auth/verify-2fa`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ totpCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid 2FA code");
      }

      setSuccess(true);
      setStep("verify");
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (!jwt) {
      setPasswordError("You must be logged in to change password");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("New password must be at least 8 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match");
      return;
    }

    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(false);

    try {
      const res = await fetch(`${backendUrl}/auth/change-password`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${jwt}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to change password");
      }

      setPasswordSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setShowPasswordChange(false);
        setPasswordSuccess(false);
      }, 3000);
    } catch (err: any) {
      setPasswordError(err.message || "Password change failed");
    } finally {
      setPasswordLoading(false);
    }
  }

  if (!jwt) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 rounded-xl border border-primary/25 bg-night-900">
        <p className="text-slate-300">Please log in to setup 2FA</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-8 space-y-6">
      {/* Password Change Section */}
      <div className="p-6 rounded-xl border border-primary/25 bg-night-900">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-primary">Change Password</h2>
          {!showPasswordChange && (
            <button
              onClick={() => setShowPasswordChange(true)}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Change Password
            </button>
          )}
        </div>

        {showPasswordChange ? (
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-300 mb-2">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-lg border border-primary/25 bg-night-800 px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Enter current password"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-primary/25 bg-night-800 px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Enter new password (min 8 characters)"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-2">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-primary/25 bg-night-800 px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Confirm new password"
                required
                minLength={8}
              />
            </div>

            {passwordError && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="text-green-400 text-sm bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                ✓ Password changed successfully!
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPasswordChange(false);
                  setPasswordError(null);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="flex-1 rounded-lg border border-primary/25 px-4 py-2.5 text-sm text-slate-300 hover:bg-night-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={passwordLoading}
                className="flex-1 rounded-lg bg-badge-gradient px-4 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-60 hover:brightness-110 transition-all"
              >
                {passwordLoading ? "Changing..." : "Change Password"}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-slate-400 text-sm">
            It's recommended to change your initial password after first login.
          </p>
        )}
      </div>

      {/* 2FA Setup Section */}
      <div className="p-6 rounded-xl border border-primary/25 bg-night-900">
        <h2 className="text-xl font-bold text-primary mb-4">Two-Factor Authentication</h2>

      {/* Step 1: Initialize */}
      {step === "init" && (
        <div className="space-y-4">
          <p className="text-slate-300 text-sm">
            Two-factor authentication adds an extra layer of security to your account.
            You'll need an authenticator app like:
          </p>
          <ul className="list-disc list-inside text-slate-400 text-sm space-y-1 ml-2">
            <li>Google Authenticator</li>
            <li>Microsoft Authenticator</li>
            <li>Authy</li>
          </ul>
          <button
            onClick={handleSetup2FA}
            disabled={loading}
            className="w-full rounded-lg bg-badge-gradient px-4 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-60 hover:brightness-110 transition-all"
          >
            {loading ? "Generating QR Code..." : "Start Setup"}
          </button>
        </div>
      )}

      {/* Step 2: Scan QR Code */}
      {step === "scan" && qrCode && (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-slate-300 text-sm font-medium">Step 1: Scan this QR code</p>
            <div className="bg-white p-4 rounded-lg">
              <img src={qrCode} alt="2FA QR Code" className="w-full" />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-slate-300 text-sm font-medium">Or enter this code manually:</p>
            <div className="bg-night-800 p-3 rounded-lg">
              <code className="text-primary text-xs break-all">{secret}</code>
            </div>
          </div>

          <form onSubmit={handleVerify2FA} className="space-y-4 pt-2">
            <div>
              <label className="block text-sm text-slate-300 mb-2">
                Step 2: Enter the 6-digit code from your app
              </label>
              <input
                type="text"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="w-full rounded-lg border border-primary/25 bg-night-800 px-4 py-3 text-white text-center tracking-widest placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/40 font-mono text-lg"
                placeholder="123456"
                maxLength={6}
                autoComplete="off"
                autoFocus
                required
              />
            </div>

            {error && (
              <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || totpCode.length !== 6}
              className="w-full rounded-lg bg-badge-gradient px-4 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-60 hover:brightness-110 transition-all"
            >
              {loading ? "Verifying..." : "Verify and Enable 2FA"}
            </button>
          </form>
        </div>
      )}

      {/* Step 3: Success */}
      {success && (
        <div className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-green-400 font-medium">✓ 2FA Enabled Successfully!</p>
            <p className="text-slate-300 text-sm mt-2">
              From now on, you'll need to enter a code from your authenticator app when logging in.
            </p>
          </div>
          <button
            onClick={() => window.location.href = "/"}
            className="w-full rounded-lg bg-badge-gradient px-4 py-3 text-sm font-semibold text-white shadow-md hover:brightness-110 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      )}

      {error && step === "init" && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3 mt-4">
          {error}
        </div>
      )}
      </div>
    </div>
  );
}
