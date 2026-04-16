"use client";

import { el } from "@/lib/i18n";
import { useEffect, useState } from "react";

type Props = { shareId: string };

type ShareInfo = {
  shareId: number;
  fileName: string;
  isRevoked: boolean;
  expired: boolean;
  noDownloadsLeft: boolean;
  available: boolean;
};

export function SharePageClient({ shareId }: Props) {
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [otp, setOtp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/shares/${shareId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) {
          if (data.error) setInfo(null);
          else setInfo(data);
        }
      })
      .catch(() => {
        if (!cancelled) setInfo(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [shareId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const code = otp.trim();
    if (!code) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/shares/${shareId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otp: code }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? el.sharePageInvalidOtp);
        return;
      }
      if (data.downloadUrl) {
        // Brief delay so the browser stores the Set-Cookie from this response before navigating
        await new Promise((r) => setTimeout(r, 100));
        window.location.href = data.downloadUrl;
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        Φόρτωση…
      </p>
    );
  }

  if (!info || !info.available) {
    return (
      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        {el.sharePageExpired}
      </p>
    );
  }

  return (
    <>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
        {info.fileName}
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="share-otp" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            {el.sharePageEnterOtp}
          </label>
          <input
            id="share-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-center text-lg tracking-widest text-zinc-900 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
            maxLength={6}
            required
          />
        </div>
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || otp.trim().length < 4}
          className="w-full rounded-lg bg-zinc-900 py-3 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {submitting ? el.sharePageVerifying : el.sharePageDownload}
        </button>
      </form>
    </>
  );
}
