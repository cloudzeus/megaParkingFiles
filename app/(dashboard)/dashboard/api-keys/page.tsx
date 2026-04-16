import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { el } from "@/lib/i18n";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ApiKeysClient } from "./api-keys-client";
import { HiOutlineDocumentText } from "react-icons/hi2";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";

function canCreateDepartmentKey(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "DEPARTMENT_MANAGER";
}

export default async function ApiKeysPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const companyId = (await getEffectiveCompanyIdForMainFeatures(session)) ?? session.user.companyId;

  const where: Prisma.ApiKeyWhereInput = {
    companyId,
    OR: [
      { userId: session.user.id },
      ...(session.user.role === "SUPER_ADMIN" || session.user.role === "COMPANY_ADMIN"
        ? [{}]
        : []),
      ...(session.user.role === "DEPARTMENT_MANAGER" && session.user.departmentId != null
        ? [{ departmentId: session.user.departmentId }]
        : []),
    ],
  };

  const [apiKeys, departments] = await Promise.all([
    prisma.apiKey.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        departmentId: true,
        department: { select: { name: true } },
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
      },
    }),
    prisma.department.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows = apiKeys.map((k) => ({
    id: k.id,
    name: k.name,
    keyPrefix: k.keyPrefix,
    departmentId: k.departmentId,
    departmentName: k.department?.name ?? null,
    expiresAt: k.expiresAt?.toISOString() ?? null,
    lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
    createdAt: k.createdAt.toISOString(),
  }));

  const deptOptions = departments.map((d) => ({ id: d.id, name: d.name }));

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>
              {el.apiKeysTitle}
            </h1>
            <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
              {el.apiKeysDescription}
            </p>
          </div>
          <Link
            href="/docs/api-keys.md"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--outline)] bg-[var(--card)] px-3 py-2 font-medium text-[var(--foreground)] transition hover:bg-[var(--surface-variant)]"
            style={{ fontSize: "var(--text-body2)" }}
          >
            <HiOutlineDocumentText className="h-5 w-5 shrink-0" aria-hidden />
            {el.apiKeysDocumentation}
          </Link>
        </div>
      </div>
      <ApiKeysClient
        apiKeys={rows}
        departments={deptOptions}
        canCreateDepartmentKey={canCreateDepartmentKey(session.user.role)}
      />
    </div>
  );
}
