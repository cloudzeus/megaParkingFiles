import { auth } from "@/auth";
import { el } from "@/lib/i18n";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FileBrowserClient } from "./file-browser-client";

export default async function FilesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:py-6">
      {/* Hero header – shadcn/Material: clear hierarchy, no clutter */}
      <header className="flex flex-col gap-1">
        <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>
          {el.filesTitle}
        </h1>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          {el.filesDescription}
        </p>
      </header>

      {/* Single elevated browser – Material elevation, shadcn card feel */}
      <section
        className="flex min-h-[72vh] flex-1 flex-col overflow-hidden rounded-xl border border-[var(--outline)] bg-[var(--card)] shadow-sm"
        style={{ boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.08), 0 1px 2px -1px rgb(0 0 0 / 0.08)" }}
      >
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center gap-3 text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
              <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-[var(--outline)] border-t-[var(--primary)]" aria-hidden />
              Φόρτωση…
            </div>
          }
        >
          <FileBrowserClient />
        </Suspense>
      </section>
    </div>
  );
}
