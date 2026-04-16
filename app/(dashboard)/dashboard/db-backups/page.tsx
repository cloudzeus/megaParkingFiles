import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { el } from "@/lib/i18n";
import { DbBackupsClient } from "./db-backups-client";

export default async function DbBackupsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>
          {el.dbBackupsTitle}
        </h1>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          {el.dbBackupsDescription}
        </p>
      </div>
      <DbBackupsClient />
    </div>
  );
}
