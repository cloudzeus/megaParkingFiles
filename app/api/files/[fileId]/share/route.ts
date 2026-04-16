import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canShareFile } from "@/lib/rbac";
import { sendOtpForShare } from "@/lib/email";
import { hash } from "bcryptjs";
import { randomInt } from "crypto";
import { EventType, TargetType } from "@prisma/client";

const OTP_LENGTH = 6;

export async function POST(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileId = Number((await params).fileId);
  if (Number.isNaN(fileId)) {
    return NextResponse.json({ error: "Invalid fileId" }, { status: 400 });
  }

  let body: { recipientEmail?: string; expiresInHours?: number; maxDownloads?: number; gdprOverride?: boolean };
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const file = await prisma.file.findUnique({
    where: { id: fileId },
    include: { company: true },
  });
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const user = {
    id: session.user.id,
    role: session.user.role,
    companyId: session.user.companyId,
    departmentId: session.user.departmentId,
  };
  if (!canShareFile(user, file)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const riskyPii = file.gdprRiskLevel === "POSSIBLE_PII" || file.gdprRiskLevel === "CONFIRMED_PII";
  const canOverride = session.user.role === "DPO" || session.user.role === "COMPANY_ADMIN" || session.user.role === "SUPER_ADMIN";
  if (riskyPii && !(body.gdprOverride === true && canOverride)) {
    const { createAuditLog } = await import("@/lib/audit");
    await createAuditLog({
      companyId: file.companyId,
      actorUserId: session.user.id,
      eventType: EventType.GDPR_SHARE_BLOCKED,
      targetType: TargetType.FILE,
      targetId: file.id,
      metadata: { fileName: file.name, gdprRiskLevel: file.gdprRiskLevel },
    });
    return NextResponse.json(
      { error: "Sharing blocked: file may contain PII. DPO/Company Admin can override with gdprOverride: true." },
      { status: 403 }
    );
  }

  const otp = String(randomInt(10 ** (OTP_LENGTH - 1), 10 ** OTP_LENGTH - 1));
  const otpSaltedHash = await hash(otp, 10);

  const expiresInHours = Math.min(Math.max(Number(body.expiresInHours) || 24, 1), 720);
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
  const maxDownloads = body.maxDownloads != null ? Math.max(0, Number(body.maxDownloads)) : null;

  const share = await prisma.fileShare.create({
    data: {
      companyId: file.companyId,
      fileId: file.id,
      createdByUserId: session.user.id,
      shareType: "EXTERNAL_OTP",
      requireOtp: true,
      otpSaltedHash,
      otpLength: OTP_LENGTH,
      expiresAt,
      maxDownloads: maxDownloads ?? undefined,
      remainingDownloads: maxDownloads ?? undefined,
    },
  });

  const recipientEmail = typeof body.recipientEmail === "string" ? body.recipientEmail.trim() : undefined;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? req.headers.get("origin") ?? "";
  const shareUrl = baseUrl ? `${baseUrl.replace(/\/$/, "")}/share/${share.id}` : undefined;
  if (recipientEmail) {
    const sendResult = await sendOtpForShare(recipientEmail, otp, file.name, shareUrl);
    await prisma.fileShare.update({
      where: { id: share.id },
      data: { lastOtpSentAt: new Date() },
    });
    if (!sendResult.ok) {
      await prisma.auditLog.create({
        data: {
          companyId: file.companyId,
          actorUserId: session.user.id,
          eventType: EventType.FILE_SHARE_CREATE,
          targetType: TargetType.SHARE,
          targetId: share.id,
          metadata: { sendOtpError: sendResult.error },
        },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      companyId: file.companyId,
      actorUserId: session.user.id,
      eventType: EventType.FILE_SHARE_CREATE,
      targetType: TargetType.SHARE,
      targetId: share.id,
      metadata: { fileId: file.id, fileName: file.name, recipientEmail: recipientEmail ?? null },
    },
  });

  return NextResponse.json({
    shareId: share.id,
    otp,
    expiresAt: share.expiresAt?.toISOString() ?? null,
    otpSentTo: recipientEmail ?? null,
  });
}
