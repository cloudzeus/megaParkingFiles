import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { el } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { MySharesTable } from "./my-shares-table";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";

export default async function MySharesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const companyId = await getEffectiveCompanyIdForMainFeatures(session);

  const shares = await prisma.fileShare.findMany({
    where: {
      createdByUserId: session.user.id,
      ...(companyId != null ? { companyId } : { companyId: session.user.companyId }),
      isRevoked: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileId: true,
      expiresAt: true,
      remainingDownloads: true,
      maxDownloads: true,
      createdAt: true,
      file: { select: { name: true } },
    },
  });

  const shareIds = shares.map((s) => s.id);
  const downloadStats =
    shareIds.length > 0
      ? await prisma.fileShareAccess.groupBy({
          by: ["shareId"],
          where: { shareId: { in: shareIds }, download: true },
          _count: { id: true },
          _max: { accessedAt: true },
        })
      : [];
  const statsByShareId = new Map(
    downloadStats.map((s) => [
      s.shareId,
      { downloadCount: s._count.id, lastDownloadedAt: s._max.accessedAt },
    ])
  );

  const rows = shares.map((s) => {
    const stats = statsByShareId.get(s.id);
    return {
      id: s.id,
      fileId: s.fileId,
      fileName: s.file.name,
      expiresAt: s.expiresAt?.toISOString() ?? null,
      remainingDownloads: s.remainingDownloads,
      maxDownloads: s.maxDownloads,
      createdAt: s.createdAt.toISOString(),
      downloadCount: stats?.downloadCount ?? 0,
      lastDownloadedAt: stats?.lastDownloadedAt?.toISOString() ?? null,
    };
  });

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>
          {el.mySharesTitle}
        </h1>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          {el.mySharesDescription}
        </p>
      </div>

      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)]">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
            <p className="font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body1)" }}>
              {el.mySharesEmpty}
            </p>
            <p className="mt-1 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
              Δημιουργήστε κοινοποίηση από τη σελίδα Αρχεία, επιλέγοντας «Κοινοποίηση» σε ένα αρχείο.
            </p>
          </div>
        ) : (
          <MySharesTable shares={rows} />
        )}
      </section>
    </div>
  );
}
