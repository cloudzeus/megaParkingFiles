import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewAudit } from "@/lib/rbac";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";
import { el } from "@/lib/i18n";
import { redirect } from "next/navigation";

export default async function ReportsGdprCompliancePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const companyId = await getEffectiveCompanyIdForMainFeatures(session);
  const canView = companyId != null && canViewAudit(
    {
      id: session.user.id,
      role: session.user.role,
      companyId,
      departmentId: session.user.departmentId,
    },
    "company"
  );

  const hasCompany = companyId != null;

  const [policies, fileCounts, retentionCounts] = canView && hasCompany && companyId != null
    ? await Promise.all([
        prisma.retentionPolicy.findMany({
          where: { companyId },
          orderBy: { name: "asc" },
          include: {
            _count: { select: { fileRetentions: true, erasureProofs: true } },
          },
        }),
        prisma.file.groupBy({
          by: ["gdprRiskLevel"],
          where: { companyId, deletionStatus: "ACTIVE" },
          _count: true,
        }),
        prisma.fileRetention.groupBy({
          by: ["policyId"],
          where: { file: { companyId } },
          _count: true,
        }),
      ])
    : [[], [], []];

  const riskLabels: Record<string, string> = {
    UNKNOWN: el.gdprUnknown,
    NO_PII_DETECTED: el.gdprNoPii,
    POSSIBLE_PII: el.gdprPossiblePii,
    CONFIRMED_PII: el.gdprConfirmedPii,
  };

  const company = canView && hasCompany
    ? await prisma.company.findUnique({
        where: { id: companyId! },
        select: {
          name: true,
          dpo: { select: { id: true, name: true, email: true } },
          securityOfficer: { select: { id: true, name: true, email: true } },
        },
      })
    : null;

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>
          {el.reportGdprComplianceTitle}
        </h1>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          {el.reportGdprComplianceDescription}
        </p>
      </div>

      {canView ? (
        <>
          {/* Executive summary */}
          <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
            <h2 className="font-semibold tracking-tight text-[var(--card-foreground)] mb-2" style={{ fontSize: "var(--text-h6)" }}>
              {el.gdprReportExecutiveSummary}
            </h2>
            <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
              {el.gdprReportExecutiveSummaryDesc}
            </p>
          </section>

          {/* Files overview by risk */}
          <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
            <div className="border-b border-[var(--outline)] px-4 py-4 md:px-6">
              <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
                {el.gdprReportFilesOverview}
              </h2>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-4 md:p-6">
              {fileCounts.map((g) => (
                <div key={g.gdprRiskLevel} className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-4">
                  <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                    {riskLabels[g.gdprRiskLevel] ?? g.gdprRiskLevel}
                  </p>
                  <p className="mt-2 font-semibold tracking-tight" style={{ fontSize: "var(--text-h4)" }}>
                    {g._count}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Regulatory framework (Greek) */}
          <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
            <h2 className="font-semibold tracking-tight text-[var(--card-foreground)] mb-2" style={{ fontSize: "var(--text-h6)" }}>
              {el.gdprReportRegulatoryFramework}
            </h2>
            <p className="text-[var(--muted-foreground)] mb-4" style={{ fontSize: "var(--text-body2)" }}>
              {el.gdprReportRegulationsDesc}
            </p>
            <ul className="list-disc space-y-2 pl-6 text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>
              <li>{el.gdprReportRegulationGdpr}</li>
              <li>{el.gdprReportRegulationN4624}</li>
            </ul>
          </section>

          {/* Designated officers (DPO & Security Officer) */}
          <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
            <h2 className="font-semibold tracking-tight text-[var(--card-foreground)] mb-4" style={{ fontSize: "var(--text-h6)" }}>
              {el.gdprReportDesignatedOfficers}
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="font-medium text-[var(--muted-foreground)] mb-1" style={{ fontSize: "var(--text-caption)" }}>
                  {el.gdprReportDpo}
                </p>
                <p className="font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                  {company?.dpo ? (company.dpo.name || company.dpo.email || company.dpo.id) : el.gdprReportNotAssigned}
                </p>
                {company?.dpo?.email && (
                  <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>{company.dpo.email}</p>
                )}
              </div>
              <div>
                <p className="font-medium text-[var(--muted-foreground)] mb-1" style={{ fontSize: "var(--text-caption)" }}>
                  {el.gdprReportSecurityOfficer}
                </p>
                <p className="font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                  {company?.securityOfficer ? (company.securityOfficer.name || company.securityOfficer.email || company.securityOfficer.id) : el.gdprReportNotAssigned}
                </p>
                {company?.securityOfficer?.email && (
                  <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>{company.securityOfficer.email}</p>
                )}
              </div>
            </div>
          </section>

          {/* Retention policies */}
          <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
            <div className="border-b border-[var(--outline)] px-4 py-4 md:px-6">
              <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
                {el.gdprReportRetentionSectionTitle}
              </h2>
            </div>
            {policies.length === 0 ? (
              <div className="px-6 py-12 text-center text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                {el.gdprReportNoPolicies}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
                  <thead>
                    <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.gdprReportPolicyName}</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.gdprReportPolicyDays}</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.gdprReportPolicyFiles}</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.gdprReportPolicyAutoDelete}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {policies.map((p) => {
                      const count = retentionCounts.find((r) => r.policyId === p.id)?._count ?? 0;
                      return (
                        <tr key={p.id} className="border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30">
                          <td className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{p.name}</td>
                          <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{p.durationDays ?? "—"}</td>
                          <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{count}</td>
                          <td className="px-4 py-3 md:px-6">{p.autoDelete ? el.gdprReportYes : el.gdprReportNo}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Recommendations */}
          <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
            <h2 className="font-semibold tracking-tight text-[var(--card-foreground)] mb-2" style={{ fontSize: "var(--text-h6)" }}>
              {el.gdprReportRecommendations}
            </h2>
            <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
              {el.gdprReportRecommendationsDesc}
            </p>
          </section>
        </>
      ) : (
        <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-8 text-center">
          <p className="font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body1)" }}>
            {el.reportsNoAuditAccess}
          </p>
        </div>
      )}
    </div>
  );
}
