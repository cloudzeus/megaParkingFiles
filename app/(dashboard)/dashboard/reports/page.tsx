import { auth } from "@/auth";
import { canViewAudit } from "@/lib/rbac";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";
import { el } from "@/lib/i18n";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  HiOutlineClipboardDocumentList,
  HiOutlineTrash,
  HiOutlineArrowDownTray,
  HiOutlineShieldCheck,
} from "react-icons/hi2";

const reportCards = [
  { href: "/dashboard/reports/audit", label: el.navReportsAudit, description: el.reportsDescription, Icon: HiOutlineClipboardDocumentList },
  { href: "/dashboard/reports/deletion-proof", label: el.navReportsDeletionProof, description: el.reportDeletionProofDescription, Icon: HiOutlineTrash },
  { href: "/dashboard/reports/downloads", label: el.navReportsDownloads, description: el.reportDownloadsDescription, Icon: HiOutlineArrowDownTray },
  { href: "/dashboard/reports/gdpr-compliance", label: el.navReportsGdprCompliance, description: el.reportGdprComplianceDescription, Icon: HiOutlineShieldCheck },
];

export default async function ReportsPage() {
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

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>
          {el.reportsTitle}
        </h1>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          Επιλέξτε μια αναφορά για να δείτε λογότυπα, αποδείξεις διαγραφής, λήψεις και συμμόρφωση GDPR.
        </p>
      </div>

      {canView ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {reportCards.map(({ href, label, description, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex flex-col gap-3 rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6 text-[var(--card-foreground)] transition hover:border-[var(--primary)]/50 hover:bg-[var(--surface-variant)]/50"
            >
              <Icon className="h-8 w-8 text-[var(--primary)]" aria-hidden />
              <div>
                <p className="font-semibold tracking-tight" style={{ fontSize: "var(--text-body1)" }}>
                  {label}
                </p>
                <p className="mt-1 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                  {description}
                </p>
              </div>
            </Link>
          ))}
        </section>
      ) : (
        <div className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-8 text-center">
          <p className="font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body1)" }}>
            {el.reportsNoAuditAccess}
          </p>
          <p className="mt-2 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
            Ζητήστε από τον διαχειριστή σας πρόσβαση στις αναφορές.
          </p>
        </div>
      )}
    </div>
  );
}
