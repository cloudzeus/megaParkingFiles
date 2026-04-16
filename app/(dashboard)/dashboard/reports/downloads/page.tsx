import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";
import { el } from "@/lib/i18n";
import { redirect } from "next/navigation";

const PAGE_SIZE = 100;

export default async function ReportsDownloadsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const companyId = await getEffectiveCompanyIdForMainFeatures(session);
  const hasCompany = companyId != null;

  const accesses = hasCompany && companyId != null
    ? await prisma.fileShareAccess.findMany({
        where: {
          share: { companyId },
          download: true,
        },
        orderBy: { accessedAt: "desc" },
        take: PAGE_SIZE,
        include: {
          share: { select: { id: true, file: { select: { name: true, extension: true } } } },
        },
      })
    : [];

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
        <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
          <div className="border-b border-[var(--outline)] px-4 py-4 md:px-6">
            <h2 className="font-semibold tracking-tight text-[var(--card-foreground)]" style={{ fontSize: "var(--text-h6)" }}>
              Ιστορικό λήψεων κοινοποιήσεων
            </h2>
          </div>
          {accesses.length === 0 ? (
            <div className="px-6 py-12 text-center text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
              Δεν υπάρχουν λήψεις κοινοποιήσεων.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left" style={{ fontSize: "var(--text-body2)" }}>
                <thead>
                  <tr className="border-b border-[var(--outline)] bg-[var(--muted)]/50">
                    <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Ημερομηνία</th>
                    <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Αρχείο</th>
                    <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">IP</th>
                    <th className="px-4 py-3 font-medium text-[var(--foreground)] md:px-6">Επιτυχία</th>
                  </tr>
                </thead>
                <tbody>
                  {accesses.map((a) => (
                    <tr key={a.id} className="border-b border-[var(--outline)] transition hover:bg-[var(--muted)]/30">
                      <td className="whitespace-nowrap px-4 py-3 text-[var(--muted-foreground)] md:px-6">
                        {a.accessedAt.toLocaleString("el-GR", { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-4 py-3 text-[var(--foreground)] md:px-6">
                        {a.share?.file ? `${a.share.file.name}${a.share.file.extension ? `.${a.share.file.extension}` : ""}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)] md:px-6">{a.ipAddress ?? "—"}</td>
                      <td className="px-4 py-3 md:px-6">{a.success ? "Ναι" : "Όχι"}</td>
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
            {el.reportsNoCompanyAccess}
          </p>
        </div>
      )}
    </div>
  );
}
