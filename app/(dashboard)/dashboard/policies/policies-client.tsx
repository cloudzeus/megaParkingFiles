"use client";

import { el } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";

type PolicyRow = {
  id: number;
  name: string;
  description: string | null;
  durationDays: number | null;
  autoDelete: boolean;
  legalHoldAllowed: boolean;
};

type Props = { policies: PolicyRow[] };

export function PoliciesClient({ policies: initialPolicies }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [autoDelete, setAutoDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function createPolicy(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const n = name.trim();
    if (!n) return;
    setCreating(true);
    try {
      const res = await fetch("/api/policies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          description: description.trim() || undefined,
          durationDays: durationDays ? Math.max(0, parseInt(durationDays, 10)) : undefined,
          autoDelete,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      setName("");
      setDescription("");
      setDurationDays("");
      setAutoDelete(false);
      startTransition(() => router.refresh());
    } finally {
      setCreating(false);
    }
  }

  async function deletePolicy(id: number) {
    if (!confirm(el.policyDeleteConfirm)) return;
    setError(null);
    setDeletingId(id);
    try {
      const res = await fetch(`/api/policies/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
          {el.policyCreate}
        </h2>
        <form onSubmit={createPolicy} className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
              {el.gdprPolicyName}
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
              style={{ fontSize: "var(--text-body2)" }}
              required
            />
          </div>
          <div>
            <label className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
              {el.gdprPolicyDuration}
            </label>
            <input
              type="number"
              min={0}
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder="—"
              className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
              style={{ fontSize: "var(--text-body2)" }}
            />
          </div>
          <label className="flex items-center gap-2 font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
            <input
              type="checkbox"
              checked={autoDelete}
              onChange={(e) => setAutoDelete(e.target.checked)}
              className="rounded border-[var(--outline)]"
            />
            {el.gdprPolicyAutoDelete}
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={creating || isPending}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90 disabled:opacity-50"
            style={{ fontSize: "var(--text-body2)" }}
          >
            {creating ? "…" : el.policyCreate}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
            <thead>
              <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.gdprPolicyName}</th>
                <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.gdprPolicyDuration}</th>
                <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6" />
              </tr>
            </thead>
            <tbody>
              {initialPolicies.map((p) => (
                <tr key={p.id} className="border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30">
                  <td className="px-4 py-3 md:px-6">
                    <span className="font-medium text-[var(--foreground)]">{p.name}</span>
                    {p.autoDelete && (
                      <span className="ml-2 rounded bg-amber-500/20 px-1.5 py-0.5 text-[var(--text-caption)] text-amber-600 dark:text-amber-400">
                        {el.gdprPolicyAutoDelete}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                    {p.durationDays != null ? p.durationDays : "—"}
                  </td>
                  <td className="px-4 py-3 md:px-6">
                    <button
                      type="button"
                      onClick={() => deletePolicy(p.id)}
                      disabled={deletingId === p.id || isPending}
                      className="rounded px-2 py-1 font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                      style={{ fontSize: "var(--text-body2)" }}
                    >
                      {deletingId === p.id ? "…" : el.policyDelete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
