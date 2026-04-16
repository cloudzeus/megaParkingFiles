import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewAudit } from "@/lib/rbac";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";
import { el } from "@/lib/i18n";
import { redirect } from "next/navigation";

const PAGE_SIZE = 200;

export default async function ReportsDeletionProofPage() {
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
          <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>{el.reportDeletionProofTitle}</h1>
          <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>{el.reportDeletionProofDescription}</p>
        </div>
        <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-8 text-center">
          <p className="font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body1)" }}>{el.reportsNoAuditAccess}</p>
        </div>
      </div>
    );
  }

  const [proofs, totalErasures, byPolicy, byMonth] = await Promise.all([
    prisma.erasureProof.findMany({
      where: { companyId },
      orderBy: { erasedAt: "desc" },
      take: PAGE_SIZE,
      include: {
        file: { select: { id: true, name: true, extension: true, deletionStatus: true, department: { select: { name: true } } } },
        policy: { select: { name: true } },
        erasedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.erasureProof.count({ where: { companyId } }),
    prisma.erasureProof.groupBy({
      by: ["policyId"],
      where: { companyId },
      _count: true,
    }),
    prisma.$queryRaw<Array<{ month: string; count: bigint }>>`
      SELECT DATE_FORMAT(erasedAt, '%Y-%m') as month, COUNT(*) as count
      FROM ErasureProof WHERE companyId = ${companyId}
      GROUP BY month ORDER BY month DESC LIMIT 12
    `.catch(() => [] as Array<{ month: string; count: bigint }>),
  ]);

  // Policy names for breakdown
  const policyIds = byPolicy.map((p) => p.policyId).filter((id): id is number => id != null);
  const policyNames = policyIds.length > 0
    ? await prisma.retentionPolicy.findMany({ where: { id: { in: policyIds } }, select: { id: true, name: true } })
    : [];
  const policyMap = new Map(policyNames.map((p) => [p.id, p.name]));

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>
          {el.reportDeletionProofTitle}
        </h1>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          {el.reportDeletionProofDescription}
        </p>
      </div>

      {/* Summary cards */}
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
          <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>Συνολικές αποδείξεις διαγραφής</p>
          <p className="mt-2 font-semibold tracking-tight" style={{ fontSize: "var(--text-h4)" }}>{totalErasures}</p>
        </div>
        <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
          <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>Πολιτικές με διαγραφές</p>
          <p className="mt-2 font-semibold tracking-tight" style={{ fontSize: "var(--text-h4)" }}>{byPolicy.filter((p) => p.policyId != null).length}</p>
        </div>
        <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
          <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>Χειροκίνητες διαγραφές</p>
          <p className="mt-2 font-semibold tracking-tight" style={{ fontSize: "var(--text-h4)" }}>{byPolicy.find((p) => p.policyId == null)?._count ?? 0}</p>
        </div>
      </section>

      {/* Per-policy and per-month breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* By policy */}
        <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
          <div className="border-b border-[var(--outline)] px-4 py-4 md:px-6">
            <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>Διαγραφές ανά πολιτική</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
              <thead>
                <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Πολιτική</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6 text-right">Διαγραφές</th>
                </tr>
              </thead>
              <tbody>
                {byPolicy.map((p) => (
                  <tr key={p.policyId ?? "none"} className="border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30">
                    <td className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">
                      {p.policyId ? policyMap.get(p.policyId) ?? `#${p.policyId}` : "Χωρίς πολιτική"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-[var(--foreground)] md:px-6">{p._count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* By month */}
        <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
          <div className="border-b border-[var(--outline)] px-4 py-4 md:px-6">
            <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>Διαγραφές ανά μήνα</h2>
          </div>
          {byMonth.length === 0 ? (
            <div className="px-6 py-8 text-center text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>—</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
                <thead>
                  <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                    <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Μήνας</th>
                    <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6 text-right">Διαγραφές</th>
                  </tr>
                </thead>
                <tbody>
                  {byMonth.map((m) => (
                    <tr key={m.month} className="border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30">
                      <td className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{m.month}</td>
                      <td className="px-4 py-3 text-right font-medium text-[var(--foreground)] md:px-6">{Number(m.count)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Detailed proofs table */}
      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
        <div className="border-b border-[var(--outline)] px-4 py-4 md:px-6">
          <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
            Αναλυτική τεκμηρίωση διαγραφών
          </h2>
        </div>
        {proofs.length === 0 ? (
          <div className="px-6 py-12 text-center text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
            Δεν υπάρχουν εγγραφές απόδειξης διαγραφής.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
              <thead>
                <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Ημερομηνία</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Αρχείο</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Τμήμα</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Πολιτική</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Διεγράφη από</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Μέθοδος</th>
                  <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Hash</th>
                </tr>
              </thead>
              <tbody>
                {proofs.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30">
                    <td className="whitespace-nowrap px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                      {p.erasedAt.toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)] md:px-6">
                      {p.file ? p.file.name : `#${p.fileId}`}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                      {p.file?.department?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                      {p.policy?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                      {p.erasedBy?.name ?? p.erasedBy?.email ?? "Σύστημα"}
                    </td>
                    <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{p.method}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 font-mono text-[var(--muted-foreground)] md:px-6" title={p.hashBeforeDelete ?? undefined}>
                      {p.hashBeforeDelete ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
