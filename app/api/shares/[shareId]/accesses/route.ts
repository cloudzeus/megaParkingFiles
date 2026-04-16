import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET: List access events (including downloads) for a share.
 * Only share creator or company admin.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const shareId = Number((await params).shareId);
  if (Number.isNaN(shareId)) {
    return NextResponse.json({ error: "Invalid share" }, { status: 400 });
  }

  const share = await prisma.fileShare.findUnique({
    where: { id: shareId },
    select: { id: true, companyId: true, createdByUserId: true },
  });

  if (!share || share.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  const canView =
    session.user.role === "SUPER_ADMIN" ||
    session.user.role === "COMPANY_ADMIN" ||
    share.createdByUserId === session.user.id;

  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const accesses = await prisma.fileShareAccess.findMany({
    where: { shareId },
    orderBy: { accessedAt: "desc" },
    select: {
      id: true,
      accessedAt: true,
      download: true,
      success: true,
      reason: true,
      ipAddress: true,
      userAgent: true,
    },
  });

  return NextResponse.json({
    accesses: accesses.map((a) => ({
      id: a.id,
      accessedAt: a.accessedAt.toISOString(),
      download: a.download,
      success: a.success,
      reason: a.reason,
      ipAddress: a.ipAddress ?? null,
      userAgent: a.userAgent ?? null,
    })),
  });
}
