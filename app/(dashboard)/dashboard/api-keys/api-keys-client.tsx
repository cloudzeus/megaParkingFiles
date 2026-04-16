"use client";

import { el } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useTransition, useState } from "react";

type ApiKeyRow = {
  id: number;
  name: string;
  keyPrefix: string;
  departmentId: number | null;
  departmentName: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
};

type DepartmentOption = { id: number; name: string };

type Props = {
  apiKeys: ApiKeyRow[];
  departments: DepartmentOption[];
  canCreateDepartmentKey: boolean;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("el-GR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ApiKeysClient({
  apiKeys: initialKeys,
  departments,
  canCreateDepartmentKey,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [departmentId, setDepartmentId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [rawKeyJustCreated, setRawKeyJustCreated] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<number | null>(null);

  async function createKey(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const n = name.trim();
    if (!n) return;
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          departmentId: departmentId ? Number(departmentId) : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      setRawKeyJustCreated(data.rawKey ?? null);
      setSuccess(el.apiKeyCreateSuccess);
      setName("");
      setDepartmentId("");
      startTransition(() => router.refresh());
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: number) {
    if (!confirm(el.apiKeyRevokeConfirm)) return;
    setError(null);
    setRevokingId(id);
    try {
      const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      startTransition(() => router.refresh());
    } finally {
      setRevokingId(null);
    }
  }

  function copyRawKey() {
    if (rawKeyJustCreated && typeof navigator?.clipboard?.writeText === "function") {
      navigator.clipboard.writeText(rawKeyJustCreated);
    }
  }

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
          {el.apiKeyCreate}
        </h2>
        <form onSubmit={createKey} className="mt-4 flex flex-wrap items-end gap-4">
          <div>
            <label htmlFor="api-key-name" className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
              {el.apiKeyName}
            </label>
            <input
              id="api-key-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="π.χ. Εφαρμογή παραγγελιών"
              className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
              style={{ fontSize: "var(--text-body2)" }}
              required
            />
          </div>
          {canCreateDepartmentKey && departments.length > 0 && (
            <div>
              <label htmlFor="api-key-dept" className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.apiKeyDepartment}
              </label>
              <select
                id="api-key-dept"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
                style={{ fontSize: "var(--text-body2)" }}
              >
                <option value="">{el.apiKeyPersonal}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button
            type="submit"
            disabled={creating || isPending}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90 disabled:opacity-50"
            style={{ fontSize: "var(--text-body2)" }}
          >
            {creating ? "…" : el.apiKeyCreate}
          </button>
        </form>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {success && rawKeyJustCreated && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <p className="font-medium text-amber-600 dark:text-amber-400" style={{ fontSize: "var(--text-body2)" }}>
              {el.apiKeyRawKeyLabel}
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 break-all rounded bg-[var(--muted)] px-2 py-1 text-[var(--foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {rawKeyJustCreated}
              </code>
              <button
                type="button"
                onClick={copyRawKey}
                className="rounded bg-[var(--primary)] px-2 py-1 font-medium text-[var(--on-primary)] transition hover:opacity-90"
                style={{ fontSize: "var(--text-caption)" }}
              >
                Αντιγραφή
              </button>
            </div>
            <p className="mt-2 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>{success}</p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
        <div className="border-b border-[var(--outline)] px-4 py-4 md:px-6">
          <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
            {el.apiKeysTitle}
          </h2>
        </div>
        {initialKeys.length === 0 ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
            Δεν υπάρχουν ακόμη κλειδιά API. Δημιουργήστε ένα από τη φόρμα πάνω.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
              <thead>
                <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.apiKeyName}</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.apiKeyPrefix}</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.apiKeyDepartment}</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.apiKeyLastUsed}</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.apiKeyCreated}</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6" />
                </tr>
              </thead>
              <tbody>
                {initialKeys.map((k) => (
                  <tr key={k.id} className="border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{k.name}</td>
                    <td className="px-4 py-3 font-mono text-[var(--muted-foreground)] md:px-6">{k.keyPrefix}…</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{k.departmentName ?? el.apiKeyPersonal}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{formatDate(k.lastUsedAt)}</td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{formatDate(k.createdAt)}</td>
                    <td className="px-4 py-3 md:px-6">
                      <button
                        type="button"
                        onClick={() => revokeKey(k.id)}
                        disabled={revokingId === k.id || isPending}
                        className="rounded px-2 py-1 font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {revokingId === k.id ? "…" : el.apiKeyRevoke}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
          {el.apiV1Docs}
        </h2>
        <ul className="mt-3 space-y-2 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          <li className="font-mono">{el.apiV1Folders}</li>
          <li className="font-mono">{el.apiV1CreateFolder}</li>
          <li className="font-mono">{el.apiV1Upload}</li>
          <li className="font-mono">{el.apiV1Download}</li>
          <li className="mt-2 border-t border-[var(--outline)] pt-2 text-[var(--muted-foreground)]">
            {el.apiAuthHeader}
          </li>
        </ul>
      </section>
    </div>
  );
}
