import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DashboardShell } from "./dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";

  return (
    <DashboardShell session={session} isSuperAdmin={isSuperAdmin}>
      {children}
    </DashboardShell>
  );
}
