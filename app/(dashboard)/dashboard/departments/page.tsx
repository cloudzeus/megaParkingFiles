import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { el } from "@/lib/i18n";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";
import { DepartmentsClient } from "./departments-client";

function canManageDepartments(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
}

export default async function DepartmentsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const companyId = await getEffectiveCompanyIdForMainFeatures(session);
  if (companyId == null) redirect("/dashboard");

  const departments = await prisma.department.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { users: true, folders: true, files: true },
      },
      folders: {
        where: { isDepartmentRoot: true },
        take: 1,
        select: { id: true },
      },
    },
  });

  const rows = departments.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    _count: d._count,
    rootFolderId: d.folders[0]?.id ?? null,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>
          {el.departmentsListTitle}
        </h1>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          {el.departmentsListDescription}
        </p>
        {canManageDepartments(session.user.role) && (
          <Link
            href="/dashboard/users"
            className="mt-1 inline-flex items-center gap-1 text-[var(--primary)] transition hover:underline"
            style={{ fontSize: "var(--text-caption)" }}
          >
            {el.navEmployees} →
          </Link>
        )}
      </div>

      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
        <DepartmentsClient departments={rows} canManage={canManageDepartments(session.user.role)} />
      </section>
    </div>
  );
}
