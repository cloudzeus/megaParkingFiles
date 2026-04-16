"use client";

import { el } from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";
import { HiOutlineShieldCheck } from "react-icons/hi2";

type Policy = {
  id: number;
  name: string;
  description: string | null;
  durationDays: number | null;
  autoDelete: boolean;
  legalHoldAllowed: boolean;
};

type Props = {
  targetType: "file" | "folder";
  targetId: number;
  targetName: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

export function AssignPolicyDialog({
  targetType,
  targetId,
  targetName,
  open,
  onClose,
  onSuccess,
}: Props) {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [policyId, setPolicyId] = useState<string>("");
  const [recursive, setRecursive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPolicies = useCallback(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch("/api/policies")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        const list = data.policies ?? [];
        setPolicies(list);
        if (list.length > 0) {
          setPolicyId(String(list[0].id));
        } else {
          setPolicyId("");
        }
      })
      .catch(() => setError("Σφάλμα φόρτωσης πολιτικών"))
      .finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (open) {
      setRecursive(false);
      loadPolicies();
    }
  }, [open, targetId, loadPolicies]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const pid = Number(policyId);
    if (Number.isNaN(pid) || pid < 1) {
      setError("Επιλέξτε πολιτική");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const url =
        targetType === "file"
          ? `/api/files/${targetId}/retention`
          : `/api/folders/${targetId}/retention`;
      const body =
        targetType === "file"
          ? { policyId: pid }
          : { policyId: pid, recursive };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      onSuccess?.();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-policy-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[var(--outline)] bg-[var(--card)] shadow-xl">
        <div className="flex items-center gap-2 border-b border-[var(--outline)] px-4 py-3">
          <HiOutlineShieldCheck className="h-5 w-5 shrink-0 text-[var(--primary)]" aria-hidden />
          <h2
            id="assign-policy-title"
            className="font-semibold text-[var(--card-foreground)]"
            style={{ fontSize: "var(--text-h6)" }}
          >
            {el.assignPolicyTitle}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
          <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
            {targetType === "file"
              ? `${el.assignGdprPolicy}: ${targetName}`
              : `${el.assignGdprPolicy} (φάκελος): ${targetName}`}
          </p>
          {loading ? (
            <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
              Φόρτωση πολιτικών…
            </p>
          ) : (
            <>
              <div>
                <label
                  htmlFor="assign-policy-select"
                  className="mb-1 block font-medium text-[var(--muted-foreground)]"
                  style={{ fontSize: "var(--text-caption)" }}
                >
                  {el.policiesTitle}
                </label>
                <select
                  id="assign-policy-select"
                  value={policyId}
                  onChange={(e) => setPolicyId(e.target.value)}
                  className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
                  style={{ fontSize: "var(--text-body2)" }}
                >
                  <option value="">— Επιλέξτε —</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.durationDays != null ? ` (${p.durationDays} ημέρες)` : ""}
                    </option>
                  ))}
                </select>
              </div>
              {targetType === "folder" && (
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={recursive}
                    onChange={(e) => setRecursive(e.target.checked)}
                    className="rounded border-[var(--outline)]"
                  />
                  <span className="text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                    {el.assignPolicyRecursive}
                  </span>
                </label>
              )}
            </>
          )}
          {error && (
            <p className="text-sm text-red-500" role="alert">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]"
              style={{ fontSize: "var(--text-body2)" }}
            >
              {el.cancel}
            </button>
            <button
              type="submit"
              disabled={loading || submitting || !policyId}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90 disabled:opacity-50"
              style={{ fontSize: "var(--text-body2)" }}
            >
              {submitting ? "…" : el.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
