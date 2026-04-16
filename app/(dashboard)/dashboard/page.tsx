import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { el, roleLabel } from "@/lib/i18n";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";
import {
  HiOutlineFolder,
  HiOutlineBuildingOffice,
  HiOutlineLink,
  HiOutlineChartBar,
  HiOutlineShieldCheck,
  HiOutlineKey,
  HiOutlineUserGroup,
} from "react-icons/hi2";

const baseQuickLinks = [
  { href: "/dashboard/files", label: el.filesTitle, desc: el.filesDescription, Icon: HiOutlineFolder },
  { href: "/dashboard/departments", label: el.departmentsTitle, desc: el.departmentsDescription, Icon: HiOutlineBuildingOffice },
  { href: "/dashboard/shares", label: el.navMyShares, desc: el.mySharesDescription, Icon: HiOutlineLink },
  { href: "/dashboard/reports", label: el.reportsTitle, desc: el.reportsDescription, Icon: HiOutlineChartBar },
  { href: "/dashboard/gdpr", label: el.navGdpr, desc: el.gdprDescription, Icon: HiOutlineShieldCheck },
  { href: "/dashboard/api-keys", label: el.navApiKeys, desc: el.apiKeysDescription, Icon: HiOutlineKey },
];

export default async function DashboardPage() {
  const session = await auth();
  const displayName = session?.user?.name ?? session?.user?.email ?? "";
  const role = session?.user?.role ? roleLabel(session.user.role) : "";
  const canManageUsers = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "COMPANY_ADMIN";
  const quickLinks = [
    ...baseQuickLinks.slice(0, 2),
    ...(canManageUsers
      ? [{ href: "/dashboard/users", label: el.employeesTitle, desc: el.employeesDescription, Icon: HiOutlineUserGroup }]
      : []),
    ...baseQuickLinks.slice(2),
  ];

  const companyId = session ? await getEffectiveCompanyIdForMainFeatures(session) : null;
  const [fileCount, folderCount] =
    companyId != null
      ? await Promise.all([
          prisma.file.count({
            where: { companyId, deletionStatus: "ACTIVE" },
          }),
          prisma.folder.count({
            where: { companyId },
          }),
        ])
      : [0, 0];

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:py-6">
      {/* Page header – shadcn dashboard style */}
      <section className="rounded-xl border border-[var(--outline)] bg-[var(--card)] p-6">
        <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h5)" }}>
          {el.welcome}, {displayName}
        </h1>
        <p className="mt-1 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          {el.dashboardIntro}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3" style={{ fontSize: "var(--text-caption)" }}>
          <span className="rounded bg-[var(--muted)] px-2 py-1 text-[var(--foreground)]/80">
            {el.yourRole}: {role}
          </span>
          <span className="text-[var(--muted-foreground)]">
            {el.reportsTotalFiles}: <strong className="text-[var(--foreground)]">{fileCount}</strong>
          </span>
          <span className="text-[var(--muted-foreground)]">
            {el.reportsTotalFolders}: <strong className="text-[var(--foreground)]">{folderCount}</strong>
          </span>
        </div>
      </section>

      {/* Quick links – shadcn card grid */}
      <section>
        <h2 className="mb-3 font-semibold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h6)" }}>
          {el.whatYouCanDo}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map(({ href, label, desc, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-start gap-4 rounded-xl border border-[var(--outline)] bg-[var(--card)] p-4 transition hover:border-[var(--primary)]/50 hover:bg-[var(--muted)]/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/20 text-[var(--primary)]">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-[var(--foreground)]" style={{ fontSize: "var(--text-body2)" }}>
                  {label}
                </span>
                <p className="mt-0.5 text-[var(--muted-foreground)] line-clamp-2" style={{ fontSize: "var(--text-caption)" }}>
                  {desc}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
