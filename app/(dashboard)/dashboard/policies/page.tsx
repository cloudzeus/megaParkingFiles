import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManagePolicies } from "@/lib/rbac";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";
import { el } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { PoliciesClient } from "./policies-client";

export default async function PoliciesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const companyId = await getEffectiveCompanyIdForMainFeatures(session);
  if (companyId == null) redirect("/dashboard");

  const canManage = canManagePolicies({
    id: session.user.id,
    role: session.user.role,
    companyId,
    departmentId: session.user.departmentId ?? null,
  });

  const policies = await prisma.retentionPolicy.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });

  const rows = policies.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    durationDays: p.durationDays,
    autoDelete: p.autoDelete,
    legalHoldAllowed: p.legalHoldAllowed,
  }));

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>
          {el.policiesTitle}
        </h1>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          {el.policiesDescription}
        </p>
      </div>

      {canManage ? (
        <PoliciesClient policies={rows} />
      ) : (
        <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-8 text-center">
          <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
            Δεν έχετε δικαίωμα διαχείρισης πολιτικών διατήρησης.
          </p>
        </div>
      )}
    </div>
  );
}
