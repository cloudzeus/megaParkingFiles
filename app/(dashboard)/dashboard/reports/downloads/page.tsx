import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";
import { el } from "@/lib/i18n";
import { redirect } from "next/navigation";

const PAGE_SIZE = 200;

export default async function ReportsDownloadsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const companyId = await getEffectiveCompanyIdForMainFeatures(session);
  const hasCompany = companyId != null;

  // Internal downloads from audit log (FILE_DOWNLOAD events)
  const downloadLogs = hasCompany
    ? await prisma.auditLog.findMany({
        where: { companyId: companyId!, eventType: "FILE_DOWNLOAD" },
        orderBy: { createdAt: "desc" },
        take: PAGE_SIZE,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
              department: { select: { name: true } },
            },
          },
        },
      })
    : [];

  // Get file info for the target IDs
  const fileIds = downloadLogs
    .map((l) => l.targetId)
    .filter((id): id is number => id != null);
  const files =
    fileIds.length > 0
      ? await prisma.file.findMany({
          where: { id: { in: fileIds } },
          select: { id: true, name: true, extension: true, department: { select: { name: true } } },
        })
      : [];
  const fileMap = new Map(files.map((f) => [f.id, f]));

  // External share downloads
  const shareAccesses = hasCompany
    ? await prisma.fileShareAccess.findMany({
        where: {
          share: { companyId: companyId! },
          download: true,
        },
        orderBy: { accessedAt: "desc" },
        take: PAGE_SIZE,
        include: {
          share: {
            select: {
              id: true,
              shareType: true,
              createdBy: { select: { name: true, email: true, department: { select: { name: true } } } },
              file: { select: { name: true, extension: true, department: { select: { name: true } } } },
            },
          },
        },
      })
    : [];

  // Summary stats
  const totalInternal = downloadLogs.length;
  const totalExternal = shareAccesses.length;

  // Per-user download counts
  const userDownloads = new Map<string, { name: string; email: string; dept: string; count: number }>();
  for (const log of downloadLogs) {
    const key = log.actorUserId ?? "unknown";
    const existing = userDownloads.get(key);
    if (existing) {
      existing.count++;
    } else {
      userDownloads.set(key, {
        name: log.actor?.name ?? "—",
        email: log.actor?.email ?? "—",
        dept: log.actor?.department?.name ?? "—",
        count: 1,
      });
    }
  }
  const userDownloadsSorted = [...userDownloads.values()].sort((a, b) => b.count - a.count);

  // Per-department download counts
  const deptDownloads = new Map<string, number>();
  for (const log of downloadLogs) {
    const dept = log.actor?.department?.name ?? "Χωρίς τμήμα";
    deptDownloads.set(dept, (deptDownloads.get(dept) ?? 0) + 1);
  }
  const deptDownloadsSorted = [...deptDownloads.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>
          {el.reportDownloadsTitle}
        </h1>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          {el.reportDownloadsDescription}
        </p>
      </div>

      {hasCompany ? (
        <>
          {/* Summary cards */}
          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
              <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                Εσωτερικές λήψεις
              </p>
              <p className="mt-2 font-semibold tracking-tight" style={{ fontSize: "var(--text-h4)" }}>
                {totalInternal}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
              <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                Εξωτερικές λήψεις (κοινοποιήσεις)
              </p>
              <p className="mt-2 font-semibold tracking-tight" style={{ fontSize: "var(--text-h4)" }}>
                {totalExternal}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
              <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                Χρήστες με λήψεις
              </p>
              <p className="mt-2 font-semibold tracking-tight" style={{ fontSize: "var(--text-h4)" }}>
                {userDownloads.size}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
              <p className="font-medium text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                Τμήματα με λήψεις
              </p>
              <p className="mt-2 font-semibold tracking-tight" style={{ fontSize: "var(--text-h4)" }}>
                {deptDownloads.size}
              </p>
            </div>
          </section>

          {/* Per-user and per-department breakdown side by side */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Per-user breakdown */}
            <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
              <div className="border-b border-[var(--outline)] px-4 py-4 md:px-6">
                <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
                  Λήψεις ανά χρήστη
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
                  <thead>
                    <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Χρήστης</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Τμήμα</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6 text-right">Λήψεις</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userDownloadsSorted.map((u) => (
                      <tr key={u.email} className="border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30">
                        <td className="px-4 py-3 md:px-6">
                          <div className="font-medium text-[var(--foreground)]">{u.name}</div>
                          <div className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-caption)" }}>{u.email}</div>
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{u.dept}</td>
                        <td className="px-4 py-3 text-right font-medium text-[var(--foreground)] md:px-6">{u.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Per-department breakdown */}
            <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
              <div className="border-b border-[var(--outline)] px-4 py-4 md:px-6">
                <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
                  Λήψεις ανά τμήμα
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
                  <thead>
                    <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Τμήμα</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6 text-right">Λήψεις</th>
                    </tr>
                  </thead>
                  <tbody>
                    {deptDownloadsSorted.map(([dept, count]) => (
                      <tr key={dept} className="border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30">
                        <td className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">{dept}</td>
                        <td className="px-4 py-3 text-right font-medium text-[var(--foreground)] md:px-6">{count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Internal downloads log */}
          <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
            <div className="border-b border-[var(--outline)] px-4 py-4 md:px-6">
              <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
                Ιστορικό εσωτερικών λήψεων
              </h2>
            </div>
            {downloadLogs.length === 0 ? (
              <div className="px-6 py-12 text-center text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                Δεν υπάρχουν εσωτερικές λήψεις.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
                  <thead>
                    <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Ημερομηνία</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Αρχείο</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Χρήστης</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Τμήμα</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {downloadLogs.map((log) => {
                      const file = log.targetId != null ? fileMap.get(log.targetId) : null;
                      return (
                        <tr key={log.id} className="border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30">
                          <td className="whitespace-nowrap px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                            {log.createdAt.toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" })}
                          </td>
                          <td className="px-4 py-3 text-[var(--foreground)] md:px-6">
                            {file ? file.name : `#${log.targetId ?? "—"}`}
                          </td>
                          <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                            {log.actor?.name ?? log.actor?.email ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                            {log.actor?.department?.name ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                            {log.ipAddress ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* External share downloads log */}
          <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
            <div className="border-b border-[var(--outline)] px-4 py-4 md:px-6">
              <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
                Ιστορικό εξωτερικών λήψεων (κοινοποιήσεις)
              </h2>
            </div>
            {shareAccesses.length === 0 ? (
              <div className="px-6 py-12 text-center text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                Δεν υπάρχουν εξωτερικές λήψεις.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
                  <thead>
                    <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Ημερομηνία</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Αρχείο</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Κοινοποιήθηκε από</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Τμήμα αρχείου</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">IP</th>
                      <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Τύπος</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shareAccesses.map((a) => (
                      <tr key={a.id} className="border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30">
                        <td className="whitespace-nowrap px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                          {a.accessedAt.toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" })}
                        </td>
                        <td className="px-4 py-3 text-[var(--foreground)] md:px-6">
                          {a.share?.file ? a.share.file.name : "—"}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                          {a.share?.createdBy?.name ?? a.share?.createdBy?.email ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                          {a.share?.file?.department?.name ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                          {a.ipAddress ?? "—"}
                        </td>
                        <td className="px-4 py-3 md:px-6">
                          <span className={`rounded px-1.5 py-0.5 ${a.share?.shareType === "EXTERNAL_OTP" ? "bg-amber-500/20 text-amber-600 dark:text-amber-400" : "bg-blue-500/20 text-blue-600 dark:text-blue-400"}`} style={{ fontSize: "var(--text-caption)" }}>
                            {a.share?.shareType === "EXTERNAL_OTP" ? "Εξωτερικό OTP" : "Εσωτερικός σύνδεσμος"}
                          </span>
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
            {el.reportsNoCompanyAccess}
          </p>
        </div>
      )}
    </div>
  );
}
