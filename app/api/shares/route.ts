import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * List shares created by the current user (dashboard "My shares").
 * Returns active shares (not revoked); optionally include expired.
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const includeExpired = searchParams.get("includeExpired") === "true";

  const shares = await prisma.fileShare.findMany({
    where: {
      createdByUserId: session.user.id,
      companyId: session.user.companyId,
      isRevoked: false,
      ...(includeExpired ? {} : { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }),
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileId: true,
      expiresAt: true,
      remainingDownloads: true,
      maxDownloads: true,
      createdAt: true,
      file: { select: { name: true } },
    },
  });

  return NextResponse.json({
    shares: shares.map((s) => ({
      id: s.id,
      fileId: s.fileId,
      fileName: s.file.name,
      expiresAt: s.expiresAt?.toISOString() ?? null,
      remainingDownloads: s.remainingDownloads,
      maxDownloads: s.maxDownloads,
      createdAt: s.createdAt.toISOString(),
    })),
  });
}
