import { el } from "@/lib/i18n";
import Image from "next/image";
import Link from "next/link";
import {
  HiOutlineLockClosed,
  HiOutlineShieldCheck,
  HiOutlineFolderOpen,
  HiOutlineArrowRightOnRectangle,
} from "react-icons/hi2";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)]">
      {/* Subtle gradient mesh */}
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -20%, var(--primary) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(66, 133, 244, 0.15) 0%, transparent 50%)",
        }}
      />
      <div className="relative flex min-h-screen flex-col">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-[var(--outline)]/50 px-6 py-4 backdrop-blur-sm md:px-10">
          <div className="flex items-center gap-3">
            <Image
              src="/logoFileShareX.png"
              alt={el.appName}
              width={140}
              height={40}
              className="h-9 w-auto object-contain"
            />
          </div>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-2.5 font-medium text-[var(--on-primary)] shadow-lg shadow-[var(--primary)]/25 transition hover:opacity-90 hover:shadow-[var(--primary)]/30"
            style={{ fontSize: "var(--text-body1)" }}
          >
            <HiOutlineArrowRightOnRectangle className="h-5 w-5" aria-hidden />
            {el.signIn}
          </Link>
        </header>

        {/* Hero */}
        <main className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center md:py-24">
          <h1
            className="max-w-3xl font-bold tracking-tight text-[var(--foreground)]"
            style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)", lineHeight: 1.2 }}
          >
            {el.landingHero}
          </h1>
          <p
            className="mt-4 max-w-2xl text-[var(--muted-foreground)]"
            style={{ fontSize: "var(--text-body1)" }}
          >
            {el.landingSub}
          </p>
          <Link
            href="/login"
            className="mt-10 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-8 py-4 font-semibold text-[var(--on-primary)] shadow-xl shadow-[var(--primary)]/30 transition hover:opacity-95 hover:shadow-[var(--primary)]/40"
            style={{ fontSize: "var(--text-body1)" }}
          >
            {el.landingCta}
            <HiOutlineArrowRightOnRectangle className="h-5 w-5" aria-hidden />
          </Link>
        </main>

        {/* Feature cards */}
        <section className="border-t border-[var(--outline)]/50 px-6 py-16 md:px-10 md:py-20">
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-[var(--outline)]/60 bg-[var(--surface)]/80 p-6 backdrop-blur-sm transition hover:border-[var(--primary)]/40 hover:bg-[var(--surface)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/15 text-[var(--primary)]">
                <HiOutlineLockClosed className="h-6 w-6" aria-hidden />
              </div>
              <h2
                className="mt-4 font-semibold text-[var(--foreground)]"
                style={{ fontSize: "var(--text-subtitle1)" }}
              >
                {el.landingFeature1Title}
              </h2>
              <p
                className="mt-2 text-[var(--muted-foreground)]"
                style={{ fontSize: "var(--text-body2)" }}
              >
                {el.landingFeature1Desc}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--outline)]/60 bg-[var(--surface)]/80 p-6 backdrop-blur-sm transition hover:border-[var(--primary)]/40 hover:bg-[var(--surface)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/15 text-[var(--primary)]">
                <HiOutlineShieldCheck className="h-6 w-6" aria-hidden />
              </div>
              <h2
                className="mt-4 font-semibold text-[var(--foreground)]"
                style={{ fontSize: "var(--text-subtitle1)" }}
              >
                {el.landingFeature2Title}
              </h2>
              <p
                className="mt-2 text-[var(--muted-foreground)]"
                style={{ fontSize: "var(--text-body2)" }}
              >
                {el.landingFeature2Desc}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--outline)]/60 bg-[var(--surface)]/80 p-6 backdrop-blur-sm transition hover:border-[var(--primary)]/40 hover:bg-[var(--surface)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)]/15 text-[var(--primary)]">
                <HiOutlineFolderOpen className="h-6 w-6" aria-hidden />
              </div>
              <h2
                className="mt-4 font-semibold text-[var(--foreground)]"
                style={{ fontSize: "var(--text-subtitle1)" }}
              >
                {el.landingFeature3Title}
              </h2>
              <p
                className="mt-2 text-[var(--muted-foreground)]"
                style={{ fontSize: "var(--text-body2)" }}
              >
                {el.landingFeature3Desc}
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-[var(--outline)]/50 px-6 py-6 text-center md:px-10">
          <p
            className="text-[var(--muted-foreground)]"
            style={{ fontSize: "var(--text-caption)" }}
          >
            {el.appName} · {el.appTagline}
          </p>
          <Link
            href="/login"
            className="mt-2 inline-block font-medium text-[var(--primary)] transition hover:underline"
            style={{ fontSize: "var(--text-caption)" }}
          >
            {el.signIn} →
          </Link>
        </footer>
      </div>
    </div>
  );
}
