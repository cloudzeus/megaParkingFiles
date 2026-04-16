import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canViewAudit } from "@/lib/rbac";
import { eventTypeLabel } from "@/lib/i18n";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";

/**
 * Export audit log as CSV. Same filters as reports page (eventType optional).
 * Requires canViewAudit(company scope).
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getEffectiveCompanyIdForMainFeatures(session);
  if (companyId == null) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const canView = canViewAudit(
    {
      id: session.user.id,
      role: session.user.role,
      companyId,
      departmentId: session.user.departmentId,
    },
    "company"
  );

  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const eventType = searchParams.get("eventType")?.trim() || undefined;

  const logs = await prisma.auditLog.findMany({
    where: {
      companyId,
      ...(eventType ? { eventType: eventType as import("@prisma/client").EventType } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 5000,
    include: {
      actor: { select: { email: true, name: true } },
    },
  });

  const header = "Date,Event,Actor,TargetType,TargetId\n";
  const escapeCsv = (s: string) => {
    const t = String(s ?? "").replace(/"/g, '""');
    return t.includes(",") || t.includes('"') || t.includes("\n") ? `"${t}"` : t;
  };
  const rows = logs.map(
    (l) =>
      `${escapeCsv(l.createdAt.toISOString())},${escapeCsv(eventTypeLabel(l.eventType))},${escapeCsv(l.actor?.email ?? l.actor?.name ?? l.actorUserId ?? "")},${escapeCsv(l.targetType)},${escapeCsv(l.targetId != null ? String(l.targetId) : "")}\n`
  ).join("");

  const csv = "\uFEFF" + header + rows;
  const filename = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
