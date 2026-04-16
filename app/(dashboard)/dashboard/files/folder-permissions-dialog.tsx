"use client";

import { el } from "@/lib/i18n";
import { useCallback, useEffect, useState } from "react";

type Perm = {
  id: number;
  subjectType: string;
  subjectId: number;
  canRead: boolean;
  canWrite: boolean;
  canShare: boolean;
  canManage: boolean;
};

type Department = { id: number; name: string };

type Props = {
  folderId: number;
  folderName: string;
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
};

function subjectLabel(subjectType: string, subjectId: number, departments: Department[]): string {
  if (subjectType === "DEPARTMENT") {
    const d = departments.find((x) => x.id === subjectId);
    return d ? d.name : `Τμήμα #${subjectId}`;
  }
  if (subjectType === "ROLE") return `Ρόλος #${subjectId}`;
  if (subjectType === "USER") return `Χρήστης #${subjectId}`;
  return `${subjectType} #${subjectId}`;
}

export function FolderPermissionsDialog({
  folderId,
  folderName,
  open,
  onClose,
  onSuccess,
}: Props) {
  const [permissions, setPermissions] = useState<Perm[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const newSubjectType = "DEPARTMENT" as const;
  const [newSubjectId, setNewSubjectId] = useState<number | "">("");
  const [canRead, setCanRead] = useState(true);
  const [canWrite, setCanWrite] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [canManage, setCanManage] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(() => {
    if (!open || !folderId) return;
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(`/api/folders/${folderId}/permissions`).then((r) => r.json()),
      fetch("/api/departments").then((r) => r.json()),
    ])
      .then(([permData, deptData]) => {
        if (permData.error) throw new Error(permData.error);
        if (deptData.error) throw new Error(deptData.error);
        setPermissions(permData.permissions ?? []);
        setDepartments(deptData.departments ?? []);
        if ((deptData.departments ?? []).length > 0 && newSubjectId === "") {
          setNewSubjectId(deptData.departments[0].id);
        }
      })
      .catch((err) => setError(err.message ?? "Σφάλμα"))
      .finally(() => setLoading(false));
  }, [open, folderId, newSubjectId]);

  useEffect(() => {
    load();
  }, [load]);

  async function addPermission(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const subjectId = newSubjectType === "DEPARTMENT" ? newSubjectId : 0;
    if (typeof subjectId !== "number" || subjectId <= 0) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/folders/${folderId}/permissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectType: newSubjectType,
          subjectId,
          canRead,
          canWrite,
          canShare,
          canManage,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      setNewSubjectId(departments[0]?.id ?? "");
      setCanRead(true);
      setCanWrite(false);
      setCanShare(false);
      setCanManage(false);
      load();
      onSuccess?.();
    } finally {
      setAdding(false);
    }
  }

  async function removePermission(permId: number) {
    setError(null);
    setDeletingId(permId);
    try {
      const res = await fetch(`/api/folders/${folderId}/permissions/${permId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      setPermissions((prev) => prev.filter((p) => p.id !== permId));
      onSuccess?.();
    } finally {
      setDeletingId(null);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="folder-permissions-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-[var(--outline)] bg-[var(--card)] shadow-xl">
        <div className="flex items-center justify-between border-b border-[var(--outline)] px-4 py-3">
          <h2 id="folder-permissions-title" className="font-semibold text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
            {el.permissions} — {folderName}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--muted-foreground)] transition hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
            style={{ fontSize: "var(--text-body2)" }}
            aria-label="Κλείσιμο"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4">
          {loading ? (
            <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>Φόρτωση…</p>
          ) : (
            <>
              {error && (
                <p className="mb-4 rounded-lg bg-red-500/10 px-3 py-2 text-red-500 dark:text-red-400" style={{ fontSize: "var(--text-body2)" }} role="alert">
                  {error}
                </p>
              )}

              <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
                <thead>
                  <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                    <th className="py-2 font-medium text-[var(--foreground)]">Θέμα</th>
                    <th className="py-2 font-medium text-[var(--foreground)]">Ανάγνωση</th>
                    <th className="py-2 font-medium text-[var(--foreground)]">Επεξεργασία</th>
                    <th className="py-2 font-medium text-[var(--foreground)]">Κοινοποίηση</th>
                    <th className="py-2 font-medium text-[var(--foreground)]">Διαχείριση</th>
                    <th className="w-20 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {permissions.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--outline)]/70">
                      <td className="py-2 text-[var(--foreground)]">
                        {subjectLabel(p.subjectType, p.subjectId, departments)}
                      </td>
                      <td className="py-2 text-[var(--muted-foreground)]">{p.canRead ? "✓" : "—"}</td>
                      <td className="py-2 text-[var(--muted-foreground)]">{p.canWrite ? "✓" : "—"}</td>
                      <td className="py-2 text-[var(--muted-foreground)]">{p.canShare ? "✓" : "—"}</td>
                      <td className="py-2 text-[var(--muted-foreground)]">{p.canManage ? "✓" : "—"}</td>
                      <td className="py-2">
                        <button
                          type="button"
                          disabled={deletingId === p.id}
                          onClick={() => removePermission(p.id)}
                          className="rounded px-2 py-0.5 font-medium text-red-500 transition hover:bg-red-500/10 disabled:opacity-50"
                          style={{ fontSize: "var(--text-caption)" }}
                        >
                          {deletingId === p.id ? "…" : el.policyDelete}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {permissions.length === 0 && !loading && (
                <p className="mt-4 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                  Δεν υπάρχουν επιπλέον δικαιώματα. Προσθέστε τμήμα παρακάτω.
                </p>
              )}

              <form onSubmit={addPermission} className="mt-6 space-y-3 rounded-lg border border-[var(--outline)] bg-[var(--muted)]/30 p-4">
                <p className="font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>Προσθήκη δικαιώματος (τμήμα)</p>
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={newSubjectId}
                    onChange={(e) => setNewSubjectId(e.target.value ? Number(e.target.value) : "")}
                    className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
                    style={{ fontSize: "var(--text-body2)" }}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1.5 text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                    <input type="checkbox" checked={canRead} onChange={(e) => setCanRead(e.target.checked)} className="rounded border-[var(--outline)]" />
                    Ανάγνωση
                  </label>
                  <label className="flex items-center gap-1.5 text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                    <input type="checkbox" checked={canWrite} onChange={(e) => setCanWrite(e.target.checked)} className="rounded border-[var(--outline)]" />
                    Επεξεργασία
                  </label>
                  <label className="flex items-center gap-1.5 text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                    <input type="checkbox" checked={canShare} onChange={(e) => setCanShare(e.target.checked)} className="rounded border-[var(--outline)]" />
                    Κοινοποίηση
                  </label>
                  <label className="flex items-center gap-1.5 text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                    <input type="checkbox" checked={canManage} onChange={(e) => setCanManage(e.target.checked)} className="rounded border-[var(--outline)]" />
                    Διαχείριση
                  </label>
                </div>
                <button
                  type="submit"
                  disabled={adding || departments.length === 0}
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90 disabled:opacity-50"
                  style={{ fontSize: "var(--text-body2)" }}
                >
                  {adding ? "…" : "Προσθήκη"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
