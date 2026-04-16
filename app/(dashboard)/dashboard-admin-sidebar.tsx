"use client";

import { el } from "@/lib/i18n";
import { roleLabel } from "@/lib/i18n";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HiOutlineUserGroup, HiOutlineBuildingOffice, HiOutlinePlus, HiOutlineBuildingOffice2, HiOutlineShieldCheck } from "react-icons/hi2";
import { AdminEmployeeModal } from "./admin-employee-modal";
import { AdminDepartmentModal } from "./admin-department-modal";

type UserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  departmentId: number | null;
  isActive: boolean;
  department: { id: number; name: string } | null;
};

type DepartmentRow = {
  id: number;
  name: string;
  description: string | null;
};

type CompanyRow = {
  id: number;
  name: string;
  slug: string;
  country: string | null;
  _count: { users: number; departments: number };
};

const ROLES_ORDER = ["SUPER_ADMIN", "COMPANY_ADMIN", "DPO", "AUDITOR", "DEPARTMENT_MANAGER", "EMPLOYEE"] as const;

type Props = {
  companyId: number;
};

export function DashboardAdminSidebar({ companyId }: Props) {
  const pathname = usePathname();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeModal, setEmployeeModal] = useState<"add" | UserRow | null>(null);
  const [departmentModal, setDepartmentModal] = useState<"add" | DepartmentRow | null>(null);

  const roleCounts = ROLES_ORDER.map((role) => ({
    role,
    count: users.filter((u) => u.role === role).length,
  })).filter((r) => r.count > 0);

  async function load() {
    setLoading(true);
    try {
      const [uRes, dRes, cRes] = await Promise.all([
        fetch("/api/users"),
        fetch("/api/departments"),
        fetch("/api/companies"),
      ]);
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(uData.users ?? []);
      }
      if (dRes.ok) {
        const dData = await dRes.json();
        setDepartments(dData.departments ?? []);
      }
      if (cRes.ok) {
        const cData = await cRes.json();
        setCompanies(cData.companies ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [companyId, pathname]);

  return (
    <>
      <aside
        className="flex w-72 shrink-0 flex-col border-l border-[var(--outline)] bg-[var(--surface)]"
        style={{ fontSize: "var(--text-body2)" }}
      >
        <div className="border-b border-[var(--outline)] px-4 py-3">
          <h2
            className="font-medium text-[var(--foreground)]"
            style={{ fontSize: "var(--text-subtitle1)" }}
          >
            {el.adminSidebarTitle}
          </h2>
        </div>

        <div className="flex-1 overflow-auto p-3">
          {loading ? (
            <p className="text-[var(--foreground)]/60">…</p>
          ) : (
            <>
              {/* Employees */}
              <section className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium text-[var(--foreground)]">
                    <HiOutlineUserGroup className="h-4 w-4" />
                    {el.adminEmployees}
                  </span>
                  <button
                    type="button"
                    onClick={() => setEmployeeModal("add")}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[var(--primary)] transition hover:bg-[var(--primary)]/10"
                    style={{ fontSize: "var(--text-caption)" }}
                  >
                    <HiOutlinePlus className="h-4 w-4" />
                    {el.add}
                  </button>
                </div>
                <ul className="space-y-1">
                  {users.length === 0 ? (
                    <li className="text-[var(--foreground)]/60" style={{ fontSize: "var(--text-caption)" }}>
                      {el.adminNoEmployees}
                    </li>
                  ) : (
                    users.map((u) => (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => setEmployeeModal(u)}
                          className="w-full rounded-lg px-2 py-1.5 text-left transition hover:bg-[var(--surface-variant)]"
                        >
                          <span className="block truncate font-medium text-[var(--foreground)]">
                            {u.name || u.email || u.id}
                          </span>
                          <span className="block truncate text-[var(--foreground)]/70" style={{ fontSize: "var(--text-caption)" }}>
                            {u.email} · {roleLabel(u.role)}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </section>

              {/* Departments */}
              <section className="mb-6">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-medium text-[var(--foreground)]">
                    <HiOutlineBuildingOffice className="h-4 w-4" />
                    {el.adminDepartments}
                  </span>
                  <button
                    type="button"
                    onClick={() => setDepartmentModal("add")}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-[var(--primary)] transition hover:bg-[var(--primary)]/10"
                    style={{ fontSize: "var(--text-caption)" }}
                  >
                    <HiOutlinePlus className="h-4 w-4" />
                    {el.add}
                  </button>
                </div>
                <ul className="space-y-1">
                  {departments.length === 0 ? (
                    <li className="text-[var(--foreground)]/60" style={{ fontSize: "var(--text-caption)" }}>
                      {el.adminNoDepartments}
                    </li>
                  ) : (
                    departments.map((d) => (
                      <li key={d.id}>
                        <button
                          type="button"
                          onClick={() => setDepartmentModal(d)}
                          className="w-full rounded-lg px-2 py-1.5 text-left transition hover:bg-[var(--surface-variant)]"
                        >
                          <span className="block truncate font-medium text-[var(--foreground)]">
                            {d.name}
                          </span>
                          {d.description && (
                            <span className="block truncate text-[var(--foreground)]/70" style={{ fontSize: "var(--text-caption)" }}>
                              {d.description}
                            </span>
                          )}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              </section>

              {/* Roles */}
              <section className="mb-6">
                <div className="mb-2 flex items-center gap-2 font-medium text-[var(--foreground)]">
                  <HiOutlineShieldCheck className="h-4 w-4" />
                  {el.rolesTitle}
                </div>
                <ul className="space-y-1">
                  {roleCounts.length === 0 ? (
                    <li className="text-[var(--foreground)]/60" style={{ fontSize: "var(--text-caption)" }}>
                      —
                    </li>
                  ) : (
                    roleCounts.map(({ role, count }) => (
                      <li key={role} className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[var(--foreground)]">
                        <span style={{ fontSize: "var(--text-body2)" }}>{roleLabel(role)}</span>
                        <span className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>
                          {count} {el.roleUsersCount}
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </section>

              {/* Companies (Super Admin) */}
              {companies.length > 0 && (
                <section>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="flex items-center gap-2 font-medium text-[var(--foreground)]">
                      <HiOutlineBuildingOffice2 className="h-4 w-4" />
                      {el.companiesTitle}
                    </span>
                    <Link
                      href="/dashboard/companies"
                      className="text-[var(--primary)] transition hover:underline"
                      style={{ fontSize: "var(--text-caption)" }}
                    >
                      View all
                    </Link>
                  </div>
                  <ul className="space-y-1">
                    {companies.slice(0, 5).map((c) => (
                      <li key={c.id}>
                        <Link
                          href={`/dashboard/companies?id=${c.id}`}
                          className="block rounded-lg px-2 py-1.5 transition hover:bg-[var(--surface-variant)]"
                        >
                          <span className="block truncate font-medium text-[var(--foreground)]">{c.name}</span>
                          <span className="block truncate text-[var(--foreground)]/70" style={{ fontSize: "var(--text-caption)" }}>
                            {c.slug} · {c._count.users} users
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </aside>

      {employeeModal !== null && (
        <AdminEmployeeModal
          mode={employeeModal === "add" ? "add" : "edit"}
          initial={employeeModal === "add" ? undefined : employeeModal}
          departments={departments}
          onClose={() => setEmployeeModal(null)}
          onSuccess={() => {
            setEmployeeModal(null);
            load();
          }}
        />
      )}

      {departmentModal !== null && (
        <AdminDepartmentModal
          mode={departmentModal === "add" ? "add" : "edit"}
          initial={departmentModal === "add" ? undefined : departmentModal}
          onClose={() => setDepartmentModal(null)}
          onSuccess={() => {
            setDepartmentModal(null);
            load();
          }}
        />
      )}
    </>
  );
}
