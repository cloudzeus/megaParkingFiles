"use client";

import { el } from "@/lib/i18n";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  HiOutlineSquares2X2,
  HiOutlineFolder,
  HiOutlineBuildingOffice,
  HiOutlineLink,
  HiOutlineChartBar,
  HiOutlineClipboardDocumentList,
  HiOutlineShieldCheck,
  HiOutlineKey,
  HiOutlineBuildingOffice2,
  HiOutlineChevronRight,
  HiOutlineChevronDown,
  HiOutlineDocumentText,
  HiOutlineUserGroup,
  HiOutlineCircleStack,
} from "react-icons/hi2";

const reportSubLinks = [
  { href: "/dashboard/reports", label: el.navReportsOverview },
  { href: "/dashboard/reports/audit", label: el.navReportsAudit },
  { href: "/dashboard/reports/deletion-proof", label: el.navReportsDeletionProof },
  { href: "/dashboard/reports/downloads", label: el.navReportsDownloads },
  { href: "/dashboard/reports/gdpr-compliance", label: el.navReportsGdprCompliance },
];

const baseNavLinksBeforeReports = [
  { href: "/dashboard", label: el.dashboard, Icon: HiOutlineSquares2X2 },
  { href: "/dashboard/files", label: el.navFiles, Icon: HiOutlineFolder },
  { href: "/dashboard/departments", label: el.navDepartments, Icon: HiOutlineBuildingOffice },
  { href: "/dashboard/shares", label: el.navMyShares, Icon: HiOutlineLink },
];

const baseNavLinksAfterReports = [
  { href: "/dashboard/policies", label: el.policiesTitle, Icon: HiOutlineClipboardDocumentList },
  { href: "/dashboard/gdpr", label: el.navGdpr, Icon: HiOutlineShieldCheck },
  { href: "/dashboard/api-keys", label: el.navApiKeys, Icon: HiOutlineKey },
  { href: "/dashboard/license", label: el.navLicense, Icon: HiOutlineDocumentText },
];

const companiesNavLink = { href: "/dashboard/companies", label: el.companiesTitle, Icon: HiOutlineBuildingOffice2 };
const dbBackupsNavLink = { href: "/dashboard/db-backups", label: el.navDbBackups, Icon: HiOutlineCircleStack };
const userManagementNavLink = { href: "/dashboard/users", label: el.navUserManagement, Icon: HiOutlineUserGroup };
const employeesNavLink = { href: "/dashboard/users", label: el.navEmployees, Icon: HiOutlineUserGroup };

export function DashboardNav({ isSuperAdmin = false, showEmployeesLink = false }: { isSuperAdmin?: boolean; showEmployeesLink?: boolean }) {
  const pathname = usePathname();
  const isReportsPath = pathname.startsWith("/dashboard/reports");
  const [reportsOpen, setReportsOpen] = useState(isReportsPath);

  // Keep reports section open when user navigates to a reports subpage
  useEffect(() => {
    if (isReportsPath && !reportsOpen) {
      queueMicrotask(() => setReportsOpen(true));
    }
  }, [isReportsPath, reportsOpen]);

  const linkClass = (href: string) => {
    const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
    return `flex items-center gap-3 rounded-lg px-3 py-2 transition ${
      active
        ? "bg-[var(--primary)]/20 text-[var(--primary)]"
        : "text-[var(--foreground)]/90 hover:bg-[var(--surface-variant)] hover:text-[var(--foreground)]"
    }`;
  };

  return (
    <nav className="flex-1 space-y-0.5 px-2 py-3" aria-label="Κύρια μενού">
      {baseNavLinksBeforeReports.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={linkClass(href)} style={{ fontSize: "var(--text-body2)" }}>
          <Icon className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
          <span>{label}</span>
        </Link>
      ))}

      {showEmployeesLink && (
        <Link
          href={employeesNavLink.href}
          className={linkClass(employeesNavLink.href)}
          style={{ fontSize: "var(--text-body2)" }}
        >
          <employeesNavLink.Icon className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
          <span>{employeesNavLink.label}</span>
        </Link>
      )}

      {/* Expandable Reports group */}
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() => setReportsOpen((o) => !o)}
          className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 transition ${
            isReportsPath
              ? "bg-[var(--primary)]/20 text-[var(--primary)]"
              : "text-[var(--foreground)]/90 hover:bg-[var(--surface-variant)] hover:text-[var(--foreground)]"
          }`}
          style={{ fontSize: "var(--text-body2)" }}
          aria-expanded={reportsOpen}
          aria-controls="reports-submenu"
        >
          <span className="flex items-center gap-3">
            <HiOutlineChartBar className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
            {el.navReports}
          </span>
          {reportsOpen ? (
            <HiOutlineChevronDown className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          ) : (
            <HiOutlineChevronRight className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
          )}
        </button>
        <div id="reports-submenu" className="ml-6 space-y-0.5" hidden={!reportsOpen}>
          {reportSubLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={linkClass(href)}
              style={{ fontSize: "var(--text-caption)" }}
            >
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>

      {baseNavLinksAfterReports.map(({ href, label, Icon }) => (
        <Link key={href} href={href} className={linkClass(href)} style={{ fontSize: "var(--text-body2)" }}>
          <Icon className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
          <span>{label}</span>
        </Link>
      ))}

      {isSuperAdmin && (
        <>
          <Link
            href={companiesNavLink.href}
            className={linkClass(companiesNavLink.href)}
            style={{ fontSize: "var(--text-body2)" }}
          >
            <companiesNavLink.Icon className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
            <span>{companiesNavLink.label}</span>
          </Link>
          <Link
            href={userManagementNavLink.href}
            className={linkClass(userManagementNavLink.href)}
            style={{ fontSize: "var(--text-body2)" }}
          >
            <userManagementNavLink.Icon className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
            <span>{userManagementNavLink.label}</span>
          </Link>
          <Link
            href={dbBackupsNavLink.href}
            className={linkClass(dbBackupsNavLink.href)}
            style={{ fontSize: "var(--text-body2)" }}
          >
            <dbBackupsNavLink.Icon className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
            <span>{dbBackupsNavLink.label}</span>
          </Link>
        </>
      )}
    </nav>
  );
}
