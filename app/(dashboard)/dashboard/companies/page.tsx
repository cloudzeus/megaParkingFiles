import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { el } from "@/lib/i18n";
import { CompaniesClient } from "./companies-client";

export default async function CompaniesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col gap-4 md:gap-6 md:py-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold tracking-tight text-[var(--foreground)]" style={{ fontSize: "var(--text-h4)" }}>
          {el.companiesTitle}
        </h1>
        <p className="text-[var(--muted-foreground)]" style={{ fontSize: "var(--text-body2)" }}>
          {el.companiesDescription}
        </p>
      </div>
      <CompaniesClient />
    </div>
  );
}
