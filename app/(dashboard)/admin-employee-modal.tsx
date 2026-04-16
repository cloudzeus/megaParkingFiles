"use client";

import { el } from "@/lib/i18n";
import { roleLabel } from "@/lib/i18n";
import { useState } from "react";
import { HiOutlineTrash } from "react-icons/hi2";

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

const ROLES = ["EMPLOYEE", "DEPARTMENT_MANAGER", "COMPANY_ADMIN", "AUDITOR", "DPO"] as const;
const ROLES_SUPER_ADMIN = ["EMPLOYEE", "DEPARTMENT_MANAGER", "COMPANY_ADMIN", "AUDITOR", "DPO", "SUPER_ADMIN"] as const;

type Props = {
  mode: "add" | "edit";
  initial?: UserRow;
  departments: DepartmentRow[];
  companies?: CompanyRow[];
  isSuperAdmin?: boolean;
  defaultCompanyId?: number;
  onClose: () => void;
  onSuccess: () => void;
};

export function AdminEmployeeModal({ mode, initial, departments, companies = [], isSuperAdmin = false, defaultCompanyId, onClose, onSuccess }: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(initial?.role ?? "EMPLOYEE");
  const [companyId, setCompanyId] = useState<string>(initial?.companyId?.toString() ?? (mode === "add" && defaultCompanyId != null ? String(defaultCompanyId) : ""));
  const [departmentId, setDepartmentId] = useState<string>(initial?.departmentId?.toString() ?? "");
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const body: { name?: string; email?: string; password?: string; role?: string; companyId?: number; departmentId?: number | null } = {
        name: name.trim() || undefined,
        email: email.trim() || undefined,
        role,
        departmentId: departmentId === "" ? null : Number(departmentId) || null,
      };
      if (password) body.password = password;
      if (isSuperAdmin && companies.length > 0 && companyId !== "") {
        body.companyId = Number(companyId) || undefined;
      }

      const url = mode === "add" ? "/api/users" : `/api/users/${initial!.id}`;
      const method = mode === "add" ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "add" ? { ...body, email: body.email!, password: body.password! } : body),
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
    if (!initial || !confirm(el.deleteUserConfirm)) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${initial.id}`, { method: "DELETE" });
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
      aria-labelledby="employee-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl border border-[var(--outline)] bg-[var(--card)] shadow-xl">
        <div className="border-b border-[var(--outline)] px-6 py-4">
          <h2 id="employee-dialog-title" className="font-semibold text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
            {mode === "add" ? el.adminAddEmployee : el.adminEditEmployee}
          </h2>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-6">
          <div>
            <label htmlFor="emp-name" className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
              {el.employeeName}
            </label>
            <input
              id="emp-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
              style={{ fontSize: "var(--text-body2)" }}
            />
          </div>
          <div>
            <label htmlFor="emp-email" className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
              {el.employeeEmail}
            </label>
            <input
              id="emp-email"
              type="email"
              required={mode === "add"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={mode === "edit"}
              className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] disabled:opacity-60"
              style={{ fontSize: "var(--text-body2)" }}
            />
          </div>
          {mode === "add" && (
            <div>
              <label htmlFor="emp-password" className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.employeePassword}
              </label>
              <input
                id="emp-password"
                type="password"
                required={mode === "add"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
                style={{ fontSize: "var(--text-body2)" }}
              />
            </div>
          )}
          {mode === "edit" && (
            <div>
              <label htmlFor="emp-password-edit" className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.employeePassword}
              </label>
              <input
                id="emp-password-edit"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="— αφήστε κενό για αλλαγή"
                className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
                style={{ fontSize: "var(--text-body2)" }}
              />
            </div>
          )}
          <div>
            <label htmlFor="emp-role" className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
              {el.employeeRole}
            </label>
            <select
              id="emp-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
              style={{ fontSize: "var(--text-body2)" }}
            >
              {(isSuperAdmin ? ROLES_SUPER_ADMIN : ROLES).map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </div>
          {isSuperAdmin && companies.length > 0 && (
            <div>
              <label htmlFor="emp-company" className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                {el.companiesTitle}
              </label>
              <select
                id="emp-company"
                value={companyId}
                onChange={(e) => {
                  setCompanyId(e.target.value);
                  setDepartmentId("");
                }}
                className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
                style={{ fontSize: "var(--text-body2)" }}
              >
                <option value="">—</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="emp-dept" className="mb-1 block font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
              {el.employeeDepartment}
            </label>
            <select
              id="emp-dept"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 text-[var(--foreground)]"
              style={{ fontSize: "var(--text-body2)" }}
            >
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
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
                {el.deleteUser}
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
