"use client";

import { el, roleLabel } from "@/lib/i18n";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { HiOutlineArrowRightOnRectangle, HiOutlineBars3, HiOutlineXMark } from "react-icons/hi2";
import { DashboardNav } from "./dashboard-nav";
import { DashboardAdminSidebar } from "./dashboard-admin-sidebar";

type SessionUser = {
  id?: string;
  email?: string | null;
  role?: string;
  companyId?: number | null;
};

type Props = {
  session: { user: SessionUser };
  isSuperAdmin: boolean;
  children: React.ReactNode;
};

function useIsMd() {
  const [isMd, setIsMd] = useState(true);
  useEffect(() => {
    const m = window.matchMedia("(min-width: 768px)");
    const update = () => setIsMd(m.matches);
    queueMicrotask(update); // initial value after mount
    m.addEventListener("change", update);
    return () => m.removeEventListener("change", update);
  }, []);
  return isMd;
}

export function DashboardShell({ session, isSuperAdmin, children }: Props) {
  const pathname = usePathname();
  const isMd = useIsMd();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes (e.g. after clicking a nav link)
  useEffect(() => {
    queueMicrotask(() => setMobileMenuOpen(false));
  }, [pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (!isMd && mobileMenuOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [isMd, mobileMenuOpen]);

  const closeMobileMenu = () => setMobileMenuOpen(false);
  const sidebarVisible = isMd || mobileMenuOpen;

  return (
    <div className="flex min-h-screen w-full min-w-0 bg-[var(--background)] text-[var(--foreground)]">
      {/* Backdrop – mobile only, when menu open */}
      <button
        type="button"
        aria-label={el.closeMenu}
        onClick={closeMobileMenu}
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity md:hidden ${mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`}
      />

      {/* Left sidebar – overlay on mobile, static on md+ */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-[var(--outline)] bg-[var(--surface)] shadow-xl transition-transform duration-200 ease-out md:relative md:inset-auto md:z-auto md:w-56 md:translate-x-0 md:shadow-none ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
        aria-hidden={!sidebarVisible}
      >
        <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-[var(--outline)] px-4">
          <Link href="/dashboard" className="flex items-center gap-2" onClick={closeMobileMenu}>
            <Image
              src="/logoFileShareX.png"
              alt={el.appName}
              width={140}
              height={40}
              className="h-8 w-auto object-contain"
            />
          </Link>
          <button
            type="button"
            aria-label={el.closeMenu}
            onClick={closeMobileMenu}
            className="rounded-lg p-2 text-[var(--foreground)]/70 hover:bg-[var(--surface-variant)] hover:text-[var(--foreground)] md:hidden"
          >
            <HiOutlineXMark className="h-6 w-6" aria-hidden />
          </button>
        </div>
        <DashboardNav
          isSuperAdmin={isSuperAdmin}
          showEmployeesLink={session.user.role === "SUPER_ADMIN" || session.user.role === "COMPANY_ADMIN"}
        />
        <div className="border-t border-[var(--outline)] p-2">
          <form action="/api/auth/signout" method="POST">
            <button
              type="submit"
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[var(--foreground)]/70 transition hover:bg-[var(--surface-variant)] hover:text-[var(--foreground)]"
              style={{ fontSize: "var(--text-body2)" }}
            >
              <HiOutlineArrowRightOnRectangle className="h-5 w-5 shrink-0" aria-hidden />
              {el.signOut}
            </button>
          </form>
        </div>
      </aside>

      {/* Main: top bar + content */}
      <div className="flex min-w-0 flex-1 flex-col w-full">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-[var(--outline)] bg-[var(--surface)] px-4 md:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <button
              type="button"
              aria-label={el.openMenu}
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-[var(--foreground)]/80 hover:bg-[var(--surface-variant)] hover:text-[var(--foreground)] md:hidden"
            >
              <HiOutlineBars3 className="h-6 w-6" aria-hidden />
            </button>
            <Link
              href="/dashboard/files"
              className="shrink-0 rounded-lg bg-[var(--primary)] px-3 py-1.5 font-medium text-[var(--on-primary)] transition hover:opacity-90"
              style={{ fontSize: "var(--text-body2)" }}
            >
              + Create
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="max-w-[120px] truncate text-right text-[var(--foreground)]/80 sm:max-w-[180px]"
              style={{ fontSize: "var(--text-caption)" }}
              title={session.user.email ?? undefined}
            >
              {session.user.email}
            </span>
            <span
              className="hidden rounded bg-[var(--surface-variant)] px-2 py-0.5 text-[var(--foreground)]/70 sm:inline-block"
              style={{ fontSize: "var(--text-caption)" }}
            >
              {roleLabel(session.user.role ?? "")}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 w-full min-w-0">
          {children}
        </main>
      </div>

      {/* Right sidebar – Super Admin only, hidden on small screens */}
      {isSuperAdmin && (
        <div className="hidden lg:block">
          <DashboardAdminSidebar
            companyId={session.user.companyId ?? 0}
          />
        </div>
      )}
    </div>
  );
}
