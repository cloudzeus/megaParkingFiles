import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewAudit } from "@/lib/rbac";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";
import { el, eventTypeLabel } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { ReportsAuditFilter } from "../reports-audit-filter";

const AUDIT_PAGE_SIZE = 100;
const RECENT_DAYS = 7;

type SearchParams = { eventType?: string };

export default async function ReportsAuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
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

  const params = await searchParams;
  const eventTypeFilter = typeof params.eventType === "string" && params.eventType.trim() ? params.eventType.trim() : null;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - RECENT_DAYS);

  const [stats, auditLogs] = await Promise.all([
    canView && companyId != null
      ? Promise.all([
          prisma.file.count({ where: { companyId, deletionStatus: "ACTIVE" } }),
          prisma.folder.count({ where: { companyId } }),
          prisma.auditLog.count({
            where: {
              companyId,
              eventType: "FILE_UPLOAD",
              createdAt: { gte: sevenDaysAgo },
            },
          }),
        ]).then(([totalFiles, totalFolders, recentUploads]) => ({
          totalFiles,
          totalFolders,
          recentUploads,
        }))
      : Promise.resolve({ totalFiles: 0, totalFolders: 0, recentUploads: 0 }),
    canView && companyId != null
      ? prisma.auditLog.findMany({
          where: {
            companyId,
            ...(eventTypeFilter ? { eventType: eventTypeFilter as import("@prisma/client").EventType } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: AUDIT_PAGE_SIZE,
          include: {
            actor: { select: { email: true, name: true } },
          },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>
          {el.navReportsAudit}
        </h1>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          {el.reportsDescription}
        </p>
      </div>

      {canView ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6 text-[var(--card-foreground)]">
              <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                {el.reportsTotalFiles}
              </p>
              <p className="mt-2 font-semibold tracking-tight" style={{ fontSize: "var(--text-h4)" }}>
                {stats.totalFiles}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6 text-[var(--card-foreground)]">
              <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                {el.reportsTotalFolders}
              </p>
              <p className="mt-2 font-semibold tracking-tight" style={{ fontSize: "var(--text-h4)" }}>
                {stats.totalFolders}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6 text-[var(--card-foreground)]">
              <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                {el.reportsRecentUploads}
              </p>
              <p className="mt-2 font-semibold tracking-tight" style={{ fontSize: "var(--text-h4)" }}>
                {stats.recentUploads}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
            <div className="flex flex-col gap-4 border-b border-[var(--outline)] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
              <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
                {el.reportsAuditTitle}
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <ReportsAuditFilter currentEventType={eventTypeFilter} basePath="/dashboard/reports/audit" />
                <a
                  href={`/api/reports/audit-export${eventTypeFilter ? `?eventType=${encodeURIComponent(eventTypeFilter)}` : ""}`}
                  className="inline-flex items-center justify-center rounded-lg border border-[var(--outline)] bg-[var(--surface)] px-3 py-2 font-medium text-[var(--foreground)] transition hover:bg-[var(--muted)]"
                  style={{ fontSize: "var(--text-body2)" }}
                  download
                >
                  {el.reportsExportCsv}
                </a>
              </div>
            </div>
            {auditLogs.length === 0 ? (
              <div className="px-6 py-12 text-center text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                Δεν υπάρχουν εγγραφές καταγραφής.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
                  <thead>
                    <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.reportsDate}</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.reportsEventType}</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.reportsActor}</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{el.reportsTarget}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30">
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                          {log.createdAt.toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-4 py-3 text-[var(--foreground)] md:px-6">{eventTypeLabel(log.eventType)}</td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                          {log.actor?.email ?? log.actor?.name ?? log.actorUserId ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                          {log.targetType}
                          {log.targetId != null ? ` #${log.targetId}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-8 text-center">
          <p className="font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body1)" }}>
            {el.reportsNoAuditAccess}
          </p>
          <p className="mt-2 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
            Ζητήστε από τον διαχειριστή σας πρόσβαση στα αρχεία καταγραφής.
          </p>
        </div>
      )}
    </div>
  );
}
