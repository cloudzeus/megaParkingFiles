"use client";

import { el } from "@/lib/i18n";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiOutlineBuildingOffice, HiOutlineTrash } from "react-icons/hi2";

type DepartmentRow = {
  id: number;
  name: string;
  description: string | null;
  _count: { users: number; folders: number; files: number };
  rootFolderId: number | null;
};

type Props = {
  departments: DepartmentRow[];
  canManage: boolean;
};

export function DepartmentsClient({ departments, canManage }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(d: DepartmentRow) {
    if (!canManage) return;
    if (d._count.users > 0 || d._count.folders > 0 || d._count.files > 0) {
      setError(el.deleteDepartmentNotEmpty ?? "Το τμήμα έχει χρήστες ή φακέλους. Αφαιρέστε τους πρώτα.");
      return;
    }
    if (!confirm(el.deleteDepartmentConfirm)) return;
    setError(null);
    setDeletingId(d.id);
    try {
      const res = await fetch(`/api/departments/${d.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Σφάλμα");
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  const canDelete = (d: DepartmentRow) =>
    canManage && d._count.users === 0 && d._count.folders === 0 && d._count.files === 0;

  if (departments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <HiOutlineBuildingOffice className="h-12 w-12 text-[var(--muted-foreground)]" aria-hidden />
        <p className="mt-3 font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body1)" }}>
          {el.departmentsPlaceholder}
        </p>
        <p className="mt-1 max-w-md text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          Σύντομα θα μπορείτε να δείτε τη λίστα τμημάτων, τους φακέλους ανά τμήμα και τα δικαιώματα πρόσβασης.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {error && (
        <div className="mx-4 mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-red-600 dark:text-red-400" style={{ fontSize: "var(--text-body2)" }} role="alert">
          {error}
        </div>
      )}
      <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
        <thead>
          <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
            <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.departmentName}</th>
            <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.departmentDescription}</th>
            <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.departmentUsers}</th>
            <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.departmentFolders}</th>
            <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.departmentFiles}</th>
            <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6" />
            {canManage && (
              <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6 w-20">
                {el.actions}
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {departments.map((d) => (
            <tr key={d.id} className="border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30">
              <td className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{d.name}</td>
              <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{d.description ?? "—"}</td>
              <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{d._count.users}</td>
              <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{d._count.folders}</td>
              <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{d._count.files}</td>
              <td className="px-4 py-3 md:px-6">
                {d.rootFolderId != null ? (
                  <Link
                    href={`/dashboard/files?folderId=${d.rootFolderId}`}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 font-medium text-[var(--primary)] transition hover:bg-[var(--primary)]/10"
                    style={{ fontSize: "var(--text-body2)" }}
                  >
                    {el.departmentViewFiles}
                  </Link>
                ) : (
                  <span className="text-[var(--muted-foreground)]">—</span>
                )}
              </td>
              {canManage && (
                <td className="px-4 py-3 md:px-6">
                  <button
                    type="button"
                    onClick={() => handleDelete(d)}
                    disabled={!canDelete(d) || deletingId === d.id}
                    title={canDelete(d) ? el.deleteDepartment : (el.deleteDepartmentNotEmpty ?? "Αφαιρέστε πρώτα χρήστες και φακέλους")}
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-red-600 transition hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed dark:text-red-400"
                    style={{ fontSize: "var(--text-caption)" }}
                  >
                    <HiOutlineTrash className="h-4 w-4 shrink-0" aria-hidden />
                    {el.deleteDepartment}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
