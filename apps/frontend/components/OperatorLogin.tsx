"use client";

import { useAuth } from "@/hooks/useAuth";

export default function OperatorLogin() {
  const { login } = useAuth();

  return (
    <div className="my-4">
      <button
        onClick={login}
        className="rounded bg-gradient-to-br from-purple-500 to-cyan-500 px-5 py-2 text-sm font-semibold text-night shadow-glow hover:brightness-110"
      >
        🔐 Authenticate as Operator
      </button>
    </div>
  );
}
