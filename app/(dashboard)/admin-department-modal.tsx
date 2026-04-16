"use client";

import { el } from "@/lib/i18n";
import { useState } from "react";
import { HiOutlineTrash } from "react-icons/hi2";

type DepartmentRow = { id: number; name: string; description: string | null };

type Props = {
  mode: "add" | "edit";
  initial?: DepartmentRow;
  onClose: () => void;
  onSuccess: () => void;
};

export function AdminDepartmentModal({ mode, initial, onClose, onSuccess }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body = { name: name.trim(), description: description.trim() || undefined };
      const url = mode === "add" ? "/api/departments" : `/api/departments/${initial!.id}`;
      const method = mode === "add" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      onSuccess();
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!initial || !confirm(el.deleteDepartmentConfirm)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/departments/${initial.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      onSuccess();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="department-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[var(--outline)] bg-[var(--card)] shadow-xl">
        <div className="border-b border-[var(--outline)] px-6 py-4">
          <h2 id="department-dialog-title" className="font-semibold text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
            {mode === "add" ? el.adminAddDepartment : el.adminEditDepartment}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label htmlFor="dept-name" className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
              {el.departmentName}
            </label>
            <input
              id="dept-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
              style={{ fontSize: "var(--text-body2)" }}
            />
          </div>
          <div>
            <label htmlFor="dept-desc" className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
              {el.departmentDescription}
            </label>
            <textarea
              id="dept-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
              style={{ fontSize: "var(--text-body2)" }}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
            {mode === "edit" && initial ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 font-medium text-red-500 transition hover:bg-red-500/10 disabled:opacity-50 [&_svg]:text-red-500"
                style={{ fontSize: "var(--text-body2)" }}
              >
                <HiOutlineTrash className="h-4 w-4 shrink-0" aria-hidden />
                {el.deleteDepartment}
              </button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 font-medium text-[var(--muted-foreground)] transition hover:bg-[var(--muted)]" style={{ fontSize: "var(--text-body2)" }}>
                {el.cancel}
              </button>
              <button type="submit" disabled={loading} className="rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90 disabled:opacity-50" style={{ fontSize: "var(--text-body2)" }}>
                {loading ? "…" : el.save}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
