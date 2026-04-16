import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewAudit } from "@/lib/rbac";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";
import { el } from "@/lib/i18n";
import { redirect } from "next/navigation";

const PAGE_SIZE = 100;

export default async function ReportsDeletionProofPage() {
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

  const proofs = canView && companyId != null
    ? await prisma.erasureProof.findMany({
        where: { companyId },
        orderBy: { erasedAt: "desc" },
        take: PAGE_SIZE,
        include: {
          file: { select: { id: true, name: true, extension: true, deletionStatus: true } },
        },
      })
    : [];

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

      {canView ? (
        <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
          <div className="border-b border-[var(--outline)] px-4 py-4 md:px-6">
            <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
              Τεκμηρίωση διαγραφών (Erasure proof)
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
                    <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Ημερομηνία διαγραφής</th>
                    <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Αρχείο</th>
                    <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Μέθοδος</th>
                    <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Hash πριν τη διαγραφή</th>
                  </tr>
                </thead>
                <tbody>
                  {proofs.map((p) => (
                    <tr key={p.id} className="border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30">
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                        {p.erasedAt.toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)] md:px-6">
                        {p.file ? `${p.file.name}${p.file.extension ? `.${p.file.extension}` : ""}` : `#${p.fileId}`}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{p.method}</td>
                      <td className="px-4 py-3 font-mono text-[var(--muted-foreground)] md:px-6">
                        {p.hashBeforeDelete ?? "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
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
