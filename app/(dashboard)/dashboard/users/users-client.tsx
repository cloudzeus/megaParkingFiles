"use client";

import { el, roleLabel } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { HiOutlineUserGroup, HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash } from "react-icons/hi2";
import { AdminEmployeeModal } from "@/app/(dashboard)/admin-employee-modal";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  departmentId: number | null;
  isActive: boolean;
  department: { id: number; name: string } | null;
  companyId?: number;
  company?: { id: number; name: string };
};

type DepartmentRow = { id: number; name: string; description: string | null };
type CompanyRow = { id: number; name: string };

type Props = {
  users: UserRow[];
  departments: DepartmentRow[];
  companies: CompanyRow[];
  isSuperAdmin: boolean;
  defaultCompanyId?: number;
  currentUserId: string;
};

export function UsersClient({ users, departments, companies, isSuperAdmin, defaultCompanyId, currentUserId }: Props) {
  const router = useRouter();
  const [modal, setModal] = useState<"add" | UserRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDeactivate(user: UserRow) {
    if (user.id === currentUserId) {
      alert("Δεν μπορείτε να απενεργοποιήσετε τον εαυτό σας.");
      return;
    }
    if (!confirm(el.deleteUserConfirm)) return;
    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Σφάλμα");
        return;
      }
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  function openEdit(u: UserRow) {
    setModal(u);
  }

  if (users.length === 0) {
    return (
      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <HiOutlineUserGroup className="h-12 w-12 text-[var(--muted-foreground)]" aria-hidden />
          <p className="mt-3 font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body1)" }}>
            {el.employeesPlaceholder}
          </p>
          <p className="mt-1 max-w-md text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
            Προσθέστε υπαλλήλους για να εμφανιστούν εδώ.
          </p>
          <button
            type="button"
            onClick={() => setModal("add")}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 font-medium text-[var(--on-primary)] transition hover:opacity-90"
            style={{ fontSize: "var(--text-body2)" }}
          >
            <HiOutlinePlus className="h-5 w-5 shrink-0" aria-hidden />
            {el.add}
          </button>
        </div>
        {modal === "add" && (
          <AdminEmployeeModal
            mode="add"
            departments={departments}
            companies={isSuperAdmin ? companies : []}
            isSuperAdmin={isSuperAdmin}
            defaultCompanyId={defaultCompanyId}
            onClose={() => setModal(null)}
            onSuccess={() => { setModal(null); router.refresh(); }}
          />
        )}
      </section>
    );
  }

  return (
    <>
      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--outline)] px-4 py-3 md:px-6">
          <h2 className="font-semibold text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
            {el.employeesTitle}
          </h2>
          <button
            type="button"
            onClick={() => setModal("add")}
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 font-medium text-[var(--foreground)] transition hover:bg-[var(--muted)]"
            style={{ fontSize: "var(--text-body2)" }}
          >
            <HiOutlinePlus className="h-4 w-4 shrink-0" aria-hidden />
            {el.add}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
            <thead>
              <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.employeeName}</th>
                <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.employeeEmail}</th>
                <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.employeeRole}</th>
                {isSuperAdmin && (
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.companiesTitle}</th>
                )}
                <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.employeeDepartment}</th>
                <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Κατάσταση</th>
                <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6 w-28">{el.actions}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={`border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30 ${!u.isActive ? "opacity-60" : ""}`}>
                  <td className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{u.name ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{u.email ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--foreground)] md:px-6">{roleLabel(u.role)}</td>
                  {isSuperAdmin && (
                    <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{u.company?.name ?? "—"}</td>
                  )}
                  <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{u.department?.name ?? "—"}</td>
                  <td className="px-4 py-3 md:px-6">{u.isActive ? "Ενεργός" : "Απενεργοποιημένος"}</td>
                  <td className="px-4 py-3 md:px-6">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[var(--primary)] transition hover:bg-[var(--primary)]/10"
                        title={el.adminEditEmployee}
                      >
                        <HiOutlinePencilSquare className="h-4 w-4 shrink-0" aria-hidden />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeactivate(u)}
                        disabled={u.id === currentUserId || deletingId === u.id}
                        title={u.id === currentUserId ? "Δεν μπορείτε να απενεργοποιήσετε τον εαυτό σας" : el.deleteUser}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-red-600 transition hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed dark:text-red-400"
                      >
                        <HiOutlineTrash className="h-4 w-4 shrink-0" aria-hidden />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modal === "add" && (
        <AdminEmployeeModal
          mode="add"
          departments={departments}
          companies={isSuperAdmin ? companies : []}
          isSuperAdmin={isSuperAdmin}
          defaultCompanyId={defaultCompanyId}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); router.refresh(); }}
        />
      )}
      {modal && modal !== "add" && (
        <AdminEmployeeModal
          mode="edit"
          initial={modal}
          departments={departments}
          companies={isSuperAdmin ? companies : []}
          isSuperAdmin={isSuperAdmin}
          onClose={() => setModal(null)}
          onSuccess={() => { setModal(null); router.refresh(); }}
        />
      )}
    </>
  );
}
