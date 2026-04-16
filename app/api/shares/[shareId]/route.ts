import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Public share info (no auth). Used by /share/[shareId] to show file name and status.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const shareId = Number((await params).shareId);
  if (Number.isNaN(shareId)) {
    return NextResponse.json({ error: "Invalid share" }, { status: 400 });
  }

  const share = await prisma.fileShare.findUnique({
    where: { id: shareId },
    select: {
      id: true,
      isRevoked: true,
      expiresAt: true,
      remainingDownloads: true,
      file: { select: { name: true } },
    },
  });

  if (!share) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  const expired = share.expiresAt ? share.expiresAt < new Date() : false;
  const noDownloadsLeft = share.remainingDownloads !== null && share.remainingDownloads <= 0;

  return NextResponse.json({
    shareId: share.id,
    fileName: share.file.name,
    isRevoked: share.isRevoked,
    expired,
    noDownloadsLeft,
    available: !share.isRevoked && !expired && !noDownloadsLeft,
  });
}

/**
 * Revoke a share (set isRevoked = true). Only creator or company admin.
 */
export async function PATCH(
  req: Request,
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

  let body: { isRevoked?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (body.isRevoked !== true) {
    return NextResponse.json({ error: "Expected isRevoked: true" }, { status: 400 });
  }

  const share = await prisma.fileShare.findUnique({
    where: { id: shareId },
    select: { id: true, companyId: true, createdByUserId: true },
  });

  if (!share || share.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Share not found" }, { status: 404 });
  }

  const canRevoke =
    session.user.role === "SUPER_ADMIN" ||
    session.user.role === "COMPANY_ADMIN" ||
    share.createdByUserId === session.user.id;

  if (!canRevoke) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.fileShare.update({
    where: { id: shareId },
    data: { isRevoked: true },
  });

  return NextResponse.json({ ok: true, message: "Share revoked" });
}
