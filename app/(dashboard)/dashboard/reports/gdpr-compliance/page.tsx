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
    { id: session.user.id, role: session.user.role, companyId, departmentId: session.user.departmentId },
    "company"
  );

  if (!canView || companyId == null) {
    return (
      <div className="flex flex-1 flex-col gap-4 md:gap-6 md:py-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>{el.reportGdprComplianceTitle}</h1>
          <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>{el.reportGdprComplianceDescription}</p>
        </div>
        <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-8 text-center">
          <p className="font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body1)" }}>{el.reportsNoAuditAccess}</p>
        </div>
      </div>
    );
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [
    policies,
    fileCounts,
    retentionCounts,
    company,
    totalFiles,
    erasedFiles,
    softDeletedFiles,
    pendingErasure,
    erasureProofs,
    piiByDept,
    gdprEvents,
    blockedShares,
    externalSharesOnPii,
    totalUsers,
    activeUsers,
    recentGdprLogs,
  ] = await Promise.all([
    prisma.retentionPolicy.findMany({
      where: { companyId },
      orderBy: { name: "asc" },
      include: { _count: { select: { fileRetentions: true, erasureProofs: true } } },
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
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        dpo: { select: { id: true, name: true, email: true } },
        securityOfficer: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.file.count({ where: { companyId } }),
    prisma.file.count({ where: { companyId, deletionStatus: "ERASED" } }),
    prisma.file.count({ where: { companyId, deletionStatus: "SOFT_DELETED" } }),
    prisma.file.count({ where: { companyId, deletionStatus: "PENDING_ERASURE" } }),
    prisma.erasureProof.count({ where: { companyId } }),
    prisma.file.groupBy({
      by: ["departmentId"],
      where: { companyId, deletionStatus: "ACTIVE", gdprRiskLevel: { in: ["CONFIRMED_PII", "POSSIBLE_PII"] } },
      _count: true,
    }),
    prisma.auditLog.count({
      where: { companyId, eventType: { in: ["GDPR_PII_DETECTED", "GDPR_SHARE_BLOCKED", "GDPR_ERASURE_COMPLETED"] } },
    }),
    prisma.auditLog.count({
      where: { companyId, eventType: "GDPR_SHARE_BLOCKED" },
    }),
    prisma.fileShare.count({
      where: { companyId, shareType: "EXTERNAL_OTP", file: { gdprRiskLevel: { in: ["CONFIRMED_PII", "POSSIBLE_PII"] } } },
    }),
    prisma.user.count({ where: { companyId } }),
    prisma.user.count({ where: { companyId, isActive: true } }),
    prisma.auditLog.findMany({
      where: {
        companyId,
        eventType: { in: ["GDPR_PII_DETECTED", "GDPR_SHARE_BLOCKED", "GDPR_ERASURE_COMPLETED"] },
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { actor: { select: { name: true, email: true } } },
    }),
  ]);

  // Department names for PII breakdown
  const deptIds = piiByDept.map((d) => d.departmentId).filter((id): id is number => id != null);
  const departments = deptIds.length > 0
    ? await prisma.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true } })
    : [];
  const deptMap = new Map(departments.map((d) => [d.id, d.name]));

  const riskLabels: Record<string, string> = {
    UNKNOWN: el.gdprUnknown,
    NO_PII_DETECTED: el.gdprNoPii,
    POSSIBLE_PII: el.gdprPossiblePii,
    CONFIRMED_PII: el.gdprConfirmedPii,
  };

  const gdprEventLabels: Record<string, string> = {
    GDPR_PII_DETECTED: "Εντοπισμός PII",
    GDPR_SHARE_BLOCKED: "Μπλοκάρισμα κοινοποίησης",
    GDPR_ERASURE_COMPLETED: "Ολοκλήρωση διαγραφής",
  };

  const activeFileCount = fileCounts.reduce((sum, g) => sum + g._count, 0);
  const confirmedPii = fileCounts.find((g) => g.gdprRiskLevel === "CONFIRMED_PII")?._count ?? 0;
  const possiblePii = fileCounts.find((g) => g.gdprRiskLevel === "POSSIBLE_PII")?._count ?? 0;
  const filesWithRetention = retentionCounts.reduce((sum, r) => sum + r._count, 0);
  const retentionCoverage = activeFileCount > 0 ? Math.round((filesWithRetention / activeFileCount) * 100) : 0;

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

      {/* Executive summary with key metrics */}
      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        <h2 className="font-semibold tracking-tight text-[var(--card-foreground)] mb-4" style={{ fontSize: "var(--text-h6)" }}>
          {el.gdprReportExecutiveSummary}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-4">
            <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>Συνολικά αρχεία</p>
            <p className="mt-1 font-semibold tracking-tight" style={{ fontSize: "var(--text-h4)" }}>{totalFiles}</p>
            <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>{activeFileCount} ενεργά</p>
          </div>
          <div className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-4">
            <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>Αρχεία με PII</p>
            <p className="mt-1 font-semibold tracking-tight text-amber-600 dark:text-amber-400" style={{ fontSize: "var(--text-h4)" }}>{confirmedPii + possiblePii}</p>
            <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>{confirmedPii} επιβεβαιωμένα, {possiblePii} πιθανά</p>
          </div>
          <div className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-4">
            <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>Κάλυψη πολιτικών</p>
            <p className="mt-1 font-semibold tracking-tight" style={{ fontSize: "var(--text-h4)" }}>{retentionCoverage}%</p>
            <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>{filesWithRetention}/{activeFileCount} αρχεία</p>
          </div>
          <div className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-4">
            <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>Συμβάντα GDPR</p>
            <p className="mt-1 font-semibold tracking-tight" style={{ fontSize: "var(--text-h4)" }}>{gdprEvents}</p>
            <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>{blockedShares} μπλοκαρίσματα</p>
          </div>
        </div>
      </section>

      {/* Files overview by risk level */}
      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
        <div className="border-b border-[var(--outline)] px-4 py-4 md:px-6">
          <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
            {el.gdprReportFilesOverview}
          </h2>
        </div>
        <div className="grid gap-4 p-4 md:grid-cols-2 lg:grid-cols-4 md:p-6">
          {fileCounts.map((g) => (
            <div key={g.gdprRiskLevel} className={`rounded-lg border p-4 ${g.gdprRiskLevel === "CONFIRMED_PII" ? "border-red-500/30 bg-red-500/5" : g.gdprRiskLevel === "POSSIBLE_PII" ? "border-amber-500/30 bg-amber-500/5" : "border-[var(--outline)] bg-[var(--surface)]"}`}>
              <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                {riskLabels[g.gdprRiskLevel] ?? g.gdprRiskLevel}
              </p>
              <p className="mt-2 font-semibold tracking-tight" style={{ fontSize: "var(--text-h4)" }}>{g._count}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Data lifecycle */}
      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
        <div className="border-b border-[var(--outline)] px-4 py-4 md:px-6">
          <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
            Κύκλος ζωής δεδομένων
          </h2>
        </div>
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5 md:p-6">
          <div className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-4 text-center">
            <p className="font-semibold tracking-tight text-emerald-600 dark:text-emerald-400" style={{ fontSize: "var(--text-h4)" }}>{activeFileCount}</p>
            <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>Ενεργά</p>
          </div>
          <div className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-4 text-center">
            <p className="font-semibold tracking-tight text-amber-600 dark:text-amber-400" style={{ fontSize: "var(--text-h4)" }}>{softDeletedFiles}</p>
            <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>Ήπια διαγραφή</p>
          </div>
          <div className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-4 text-center">
            <p className="font-semibold tracking-tight text-orange-600 dark:text-orange-400" style={{ fontSize: "var(--text-h4)" }}>{pendingErasure}</p>
            <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>Εκκρεμεί διαγραφή</p>
          </div>
          <div className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-4 text-center">
            <p className="font-semibold tracking-tight text-red-600 dark:text-red-400" style={{ fontSize: "var(--text-h4)" }}>{erasedFiles}</p>
            <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>Διαγραμμένα</p>
          </div>
          <div className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-4 text-center">
            <p className="font-semibold tracking-tight" style={{ fontSize: "var(--text-h4)" }}>{erasureProofs}</p>
            <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>Αποδείξεις διαγραφής</p>
          </div>
        </div>
      </section>

      {/* PII by department + Sharing risk side by side */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* PII files by department */}
        <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
          <div className="border-b border-[var(--outline)] px-4 py-4 md:px-6">
            <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
              Αρχεία PII ανά τμήμα
            </h2>
          </div>
          {piiByDept.length === 0 ? (
            <div className="px-6 py-8 text-center text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
              Δεν εντοπίστηκαν αρχεία με προσωπικά δεδομένα.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
                <thead>
                  <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                    <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Τμήμα</th>
                    <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6 text-right">Αρχεία PII</th>
                  </tr>
                </thead>
                <tbody>
                  {piiByDept.map((d) => (
                    <tr key={d.departmentId ?? "none"} className="border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30">
                      <td className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">
                        {d.departmentId ? deptMap.get(d.departmentId) ?? `#${d.departmentId}` : "Χωρίς τμήμα"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-amber-600 dark:text-amber-400 md:px-6">{d._count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Sharing risk analysis */}
        <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
          <div className="border-b border-[var(--outline)] px-4 py-4 md:px-6">
            <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
              Ανάλυση κινδύνου κοινοποιήσεων
            </h2>
          </div>
          <div className="space-y-4 p-4 md:p-6">
            <div className="flex items-center justify-between rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-4">
              <div>
                <p className="font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>Μπλοκαρισμένες κοινοποιήσεις</p>
                <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>Αποτράπηκε εξωτερική κοινοποίηση λόγω GDPR</p>
              </div>
              <p className="font-semibold text-red-600 dark:text-red-400" style={{ fontSize: "var(--text-h5)" }}>{blockedShares}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-4">
              <div>
                <p className="font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>Εξωτερικές κοινοποιήσεις PII αρχείων</p>
                <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>Κοινοποιήσεις OTP σε αρχεία με προσωπικά δεδομένα</p>
              </div>
              <p className="font-semibold text-amber-600 dark:text-amber-400" style={{ fontSize: "var(--text-h5)" }}>{externalSharesOnPii}</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-4">
              <div>
                <p className="font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>Χρήστες στο σύστημα</p>
                <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>{activeUsers} ενεργοί / {totalUsers} συνολικά</p>
              </div>
              <p className="font-semibold" style={{ fontSize: "var(--text-h5)" }}>{activeUsers}</p>
            </div>
          </div>
        </section>
      </div>

      {/* Designated officers */}
      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        <h2 className="font-semibold tracking-tight text-[var(--card-foreground)] mb-4" style={{ fontSize: "var(--text-h6)" }}>
          {el.gdprReportDesignatedOfficers}
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-4">
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
          <div className="rounded-lg border border-[var(--outline)] bg-[var(--surface)] p-4">
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
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Αποδείξεις διαγραφής</th>
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
                      <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{p._count.erasureProofs}</td>
                      <td className="px-4 py-3 md:px-6">
                        <span className={`rounded px-1.5 py-0.5 ${p.autoDelete ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"}`} style={{ fontSize: "var(--text-caption)" }}>
                          {p.autoDelete ? "Αυτόματη" : "Χειροκίνητη"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent GDPR events */}
      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
        <div className="border-b border-[var(--outline)] px-4 py-4 md:px-6">
          <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
            Πρόσφατα συμβάντα GDPR (τελευταίες 30 ημέρες)
          </h2>
        </div>
        {recentGdprLogs.length === 0 ? (
          <div className="px-6 py-8 text-center text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
            Δεν υπάρχουν πρόσφατα συμβάντα GDPR.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
              <thead>
                <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Ημερομηνία</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Συμβάν</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Χρήστης</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Στόχος</th>
                </tr>
              </thead>
              <tbody>
                {recentGdprLogs.map((log) => (
                  <tr key={log.id} className="border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30">
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                      {log.createdAt.toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 md:px-6">
                      <span className={`rounded px-1.5 py-0.5 ${log.eventType === "GDPR_SHARE_BLOCKED" ? "bg-red-500/20 text-red-600 dark:text-red-400" : log.eventType === "GDPR_PII_DETECTED" ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-blue-500/20 text-blue-600 dark:text-blue-400"}`} style={{ fontSize: "var(--text-caption)" }}>
                        {gdprEventLabels[log.eventType] ?? log.eventType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                      {log.actor?.name ?? log.actor?.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                      {log.targetType}{log.targetId != null ? ` #${log.targetId}` : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Regulatory framework */}
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

      {/* Recommendations */}
      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        <h2 className="font-semibold tracking-tight text-[var(--card-foreground)] mb-2" style={{ fontSize: "var(--text-h6)" }}>
          {el.gdprReportRecommendations}
        </h2>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          {el.gdprReportRecommendationsDesc}
        </p>
      </section>
    </div>
  );
}
