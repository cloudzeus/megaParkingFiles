import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFile } from "@/lib/bunny";
import { verifyShareCookie } from "@/lib/share-cookie";

/**
 * Sanitize filename for Content-Disposition: only allow safe ASCII, replace rest with underscore.
 */
function safeFilename(name: string, extension: string | null): string {
  const base = name.replace(/[^\w\s.-]/gi, "_").trim() || "file";
  const ext = extension?.replace(/[^\w]/g, "") ?? "";
  return ext ? `${base}.${ext}` : base;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const shareId = Number((await params).shareId);
  if (Number.isNaN(shareId)) {
    return NextResponse.json({ error: "Invalid share" }, { status: 400 });
  }

  const cookieName = `share_${shareId}`;
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookieValue = (cookieHeader
    .split(";")
    .map((c) => c.trim().split("=", 2) as [string, string])
    .find(([name]) => name === cookieName)?.[1]
    ?? null)?.trim() ?? null;

  if (!verifyShareCookie(shareId, cookieValue)) {
    return NextResponse.json(
      { error: "Verification required. Open the share link and enter the OTP." },
      { status: 401 }
    );
  }

  const share = await prisma.fileShare.findUnique({
    where: { id: shareId },
    include: { file: true },
  });

  if (!share || share.isRevoked) {
    return NextResponse.json({ error: "Share not found or revoked" }, { status: 404 });
  }

  if (share.expiresAt && share.expiresAt < new Date()) {
    return NextResponse.json({ error: "Share expired" }, { status: 410 });
  }

  if (share.remainingDownloads !== null && share.remainingDownloads <= 0) {
    return NextResponse.json({ error: "No downloads remaining" }, { status: 410 });
  }

  const file = share.file;
  if (file.malwareStatus === "INFECTED") {
    await prisma.fileShareAccess.create({
      data: {
        shareId: share.id,
        fileId: file.id,
        success: false,
        reason: "MALWARE_BLOCKED",
      },
    });
    return NextResponse.json({ error: "File blocked (malware)" }, { status: 403 });
  }

  if (file.deletionStatus !== "ACTIVE") {
    return NextResponse.json({ error: "File not available" }, { status: 410 });
  }

  const buffer = await getFile(file.bunnyStoragePath);
  if (!buffer) {
    return NextResponse.json({ error: "File unavailable" }, { status: 502 });
  }

  await prisma.$transaction([
    prisma.fileShare.update({
      where: { id: share.id },
      data: {
        remainingDownloads: share.remainingDownloads != null ? share.remainingDownloads - 1 : null,
      },
    }),
    prisma.fileShareAccess.create({
      data: {
        shareId: share.id,
        fileId: file.id,
        success: true,
        reason: "OK",
        download: true,
      },
    }),
  ]);

  const filename = safeFilename(file.name, file.extension);
  const contentType = file.mimeType ?? "application/octet-stream";

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
