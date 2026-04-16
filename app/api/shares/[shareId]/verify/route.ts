import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
import { createShareCookie } from "@/lib/share-cookie";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shareId: string }> }
) {
  const shareId = Number((await params).shareId);
  if (Number.isNaN(shareId)) {
    return NextResponse.json({ error: "Invalid share" }, { status: 400 });
  }

  let body: { otp?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const otp = typeof body.otp === "string" ? body.otp.trim() : "";
  if (!otp) {
    return NextResponse.json({ error: "OTP required" }, { status: 400 });
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

  if (!share.otpSaltedHash) {
    return NextResponse.json({ error: "OTP not required for this share" }, { status: 400 });
  }

  const valid = await compare(otp, share.otpSaltedHash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
  }

  const { name, value, options } = createShareCookie(shareId);
  const res = NextResponse.json({
    ok: true,
    downloadUrl: `/api/shares/${shareId}/download`,
    fileName: share.file.name,
  });
  res.cookies.set(name, value, options);

  return res;
}
