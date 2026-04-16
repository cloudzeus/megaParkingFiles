"use client";

import { el } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";

export function GdprErasureButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ processed: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runErasure() {
    if (!confirm("Εκτέλεση διαγραφής αρχείων με PENDING_ERASURE; Δεν αναιρείται.")) return;
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch("/api/erasure/process", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      setResult({ processed: data.processed ?? 0, failed: data.failed ?? 0 });
      startTransition(() => router.refresh());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-[var(--outline)] bg-[var(--muted)]/50 p-4">
      <p className="font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>
        {el.erasureProcess}
      </p>
      <button
        type="button"
        onClick={runErasure}
        disabled={loading || isPending}
        className="mt-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90 disabled:opacity-50"
        style={{ fontSize: "var(--text-body2)" }}
      >
        {loading ? "…" : el.erasureProcess}
      </button>
      {result && (
        <p className="mt-2 text-emerald-500 dark:text-emerald-400" style={{ fontSize: "var(--text-body2)" }}>
          {el.erasureProcessSuccess} Επεξεργάστηκε: {result.processed}, Αποτυχίες: {result.failed}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
