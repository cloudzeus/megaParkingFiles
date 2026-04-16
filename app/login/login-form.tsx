"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { el } from "@/lib/i18n";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl: "/dashboard",
      });
      if (res?.error) {
        setError(el.invalidCredentials);
        return;
      }
      if (res?.url) window.location.href = res.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      {error && (
        <p className="rounded border border-red-900/50 bg-red-950/50 px-3 py-2 text-red-300" style={{ fontSize: "var(--text-body2)" }}>
          {error}
        </p>
      )}
      <label className="flex flex-col gap-1">
        <span className="font-medium text-[var(--foreground)]/80" style={{ fontSize: "var(--text-body2)" }}>{el.email}</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="rounded border border-[var(--outline)] bg-[var(--surface-variant)] px-3 py-2 text-[var(--foreground)]"
          style={{ fontSize: "var(--text-body2)" }}
          autoComplete="email"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-medium text-[var(--foreground)]/80" style={{ fontSize: "var(--text-body2)" }}>{el.password}</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="rounded border border-[var(--outline)] bg-[var(--surface-variant)] px-3 py-2 text-[var(--foreground)]"
          style={{ fontSize: "var(--text-body2)" }}
          autoComplete="current-password"
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="rounded bg-[var(--primary)] px-4 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90 disabled:opacity-50"
        style={{ fontSize: "var(--text-body2)" }}
      >
        {loading ? el.signingIn : el.signInButton}
      </button>
    </form>
  );
}
