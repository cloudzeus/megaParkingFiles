import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { el } from "@/lib/i18n";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";
import { UsersClient } from "./users-client";

function canManageUsers(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
}

export default async function UsersPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (!canManageUsers(session.user.role)) redirect("/dashboard");

  const companyId = await getEffectiveCompanyIdForMainFeatures(session);
  if (companyId == null) redirect("/dashboard");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  const [users, departments, companies] = await Promise.all([
    prisma.user.findMany({
      where: { companyId },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        departmentId: true,
        isActive: true,
        companyId: true,
        department: { select: { id: true, name: true } },
        company: { select: { id: true, name: true } },
      },
    }),
    prisma.department.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, description: true },
    }),
    isSuperAdmin
      ? prisma.company.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const userRows = users.map((u) => {
    const row: {
      id: string;
      name: string | null;
      email: string | null;
      role: string;
      departmentId: number | null;
      isActive: boolean;
      department: { id: number; name: string } | null;
      companyId?: number;
      company?: { id: number; name: string };
    } = {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      departmentId: u.departmentId,
      isActive: u.isActive,
      department: u.department,
    };
    if (isSuperAdmin) {
      row.companyId = u.companyId;
      row.company = u.company;
    }
    return row;
  });

  const deptRows = departments.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
  }));

  const companyRows = companies.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>
          {el.employeesTitle}
        </h1>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          {el.employeesDescription}
        </p>
        <Link
          href="/dashboard/departments"
          className="mt-1 inline-flex items-center gap-1 text-[var(--primary)] transition hover:underline"
          style={{ fontSize: "var(--text-caption)" }}
        >
          {el.navDepartments} →
        </Link>
      </div>

      <UsersClient
        users={userRows}
        departments={deptRows}
        companies={companyRows}
        isSuperAdmin={isSuperAdmin}
        defaultCompanyId={companyId}
        currentUserId={session.user.id}
      />
    </div>
  );
}
