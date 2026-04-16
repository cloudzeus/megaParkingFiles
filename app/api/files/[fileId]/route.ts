import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canWriteFile, canWriteFolder } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { EventType, TargetType } from "@prisma/client";
import type { File, Folder } from "@prisma/client";

/**
 * Soft-delete a file: set deletionStatus = SOFT_DELETED.
 * Requires canWriteFile. Logs FILE_DELETE.
 */
export async function DELETE(
  _req: Request,
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

  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });
  if (!file || file.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const user = {
    id: session.user.id,
    role: session.user.role,
    companyId: session.user.companyId,
    departmentId: session.user.departmentId,
  };
  if (!canWriteFile(user, file as File)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (file.deletionStatus !== "ACTIVE") {
    return NextResponse.json({ error: "File already deleted" }, { status: 410 });
  }

  const isPersonalData = file.gdprRiskLevel === "CONFIRMED_PII";
  const canOverride = session.user.role === "DPO" || session.user.role === "COMPANY_ADMIN" || session.user.role === "SUPER_ADMIN";
  const url = new URL(_req.url);
  const gdprOverride = url.searchParams.get("gdprOverride") === "true";
  if (isPersonalData && !(gdprOverride && canOverride)) {
    await createAuditLog({
      companyId: file.companyId,
      actorUserId: session.user.id,
      eventType: EventType.FILE_DELETE,
      targetType: TargetType.FILE,
      targetId: file.id,
      metadata: { blocked: true, reason: "CONFIRMED_PII", fileName: file.name },
    });
    return NextResponse.json(
      { error: "Deletion blocked: file is marked as containing personal data. DPO/Company Admin can override with ?gdprOverride=true." },
      { status: 403 }
    );
  }

  await prisma.file.update({
    where: { id: fileId },
    data: { deletionStatus: "SOFT_DELETED" },
  });

  await createAuditLog({
    companyId: file.companyId,
    actorUserId: session.user.id,
    eventType: EventType.FILE_DELETE,
    targetType: TargetType.FILE,
    targetId: file.id,
    metadata: { fileName: file.name },
  });

  return NextResponse.json({ ok: true, message: "File deleted" });
}

/**
 * Rename a file (name) and/or move to another folder (folderId). Requires canWriteFile and canWriteFolder on target. Logs FILE_RENAME and/or FILE_MOVE.
 */
export async function PATCH(
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

  let body: { name?: string; folderId?: number; gdprRiskLevel?: "CONFIRMED_PII" | "NO_PII_DETECTED" };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const targetFolderId = typeof body.folderId === "number" ? body.folderId : undefined;
  const gdprRiskLevel = body.gdprRiskLevel === "CONFIRMED_PII" || body.gdprRiskLevel === "NO_PII_DETECTED" ? body.gdprRiskLevel : undefined;
  if (!name && targetFolderId === undefined && gdprRiskLevel === undefined) {
    return NextResponse.json({ error: "Provide name, folderId, or gdprRiskLevel" }, { status: 400 });
  }

  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });
  if (!file || file.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const user = {
    id: session.user.id,
    role: session.user.role,
    companyId: session.user.companyId,
    departmentId: session.user.departmentId,
  };
  if (!canWriteFile(user, file as File)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (file.deletionStatus !== "ACTIVE") {
    return NextResponse.json({ error: "File not available" }, { status: 410 });
  }

  let newName: string | undefined;
  if (name) {
    const ext = file.extension ?? "";
    newName = ext && !name.toLowerCase().endsWith(ext.toLowerCase()) ? `${name}${ext}` : name;
  }

  let targetFolder: { departmentId: number | null } | null = null;
  if (targetFolderId !== undefined) {
    if (targetFolderId === file.folderId) {
      return NextResponse.json({ error: "File already in this folder" }, { status: 400 });
    }
    const folder = await prisma.folder.findUnique({
      where: { id: targetFolderId },
    });
    if (!folder || folder.companyId !== session.user.companyId) {
      return NextResponse.json({ error: "Target folder not found" }, { status: 404 });
    }
    if (!canWriteFolder(user, folder as Folder)) {
      return NextResponse.json({ error: "No write access to target folder" }, { status: 403 });
    }
    targetFolder = folder;
  }

  const updateData: { name?: string; folderId?: number; departmentId?: number | null; gdprRiskLevel?: "CONFIRMED_PII" | "NO_PII_DETECTED" } = {};
  if (newName !== undefined) updateData.name = newName;
  if (targetFolderId !== undefined && targetFolder) {
    updateData.folderId = targetFolderId;
    updateData.departmentId = targetFolder.departmentId;
  }
  if (gdprRiskLevel !== undefined) updateData.gdprRiskLevel = gdprRiskLevel;

  await prisma.file.update({
    where: { id: fileId },
    data: updateData,
  });

  if (newName !== undefined) {
    await createAuditLog({
      companyId: file.companyId,
      actorUserId: session.user.id,
      eventType: EventType.FILE_RENAME,
      targetType: TargetType.FILE,
      targetId: file.id,
      metadata: { oldName: file.name, newName },
    });
  }
  if (targetFolderId !== undefined) {
    await createAuditLog({
      companyId: file.companyId,
      actorUserId: session.user.id,
      eventType: EventType.FILE_MOVE,
      targetType: TargetType.FILE,
      targetId: file.id,
      metadata: { fileName: file.name, fromFolderId: file.folderId, toFolderId: targetFolderId },
    });
  }

  return NextResponse.json({
    ok: true,
    ...(newName !== undefined && { name: newName }),
    ...(targetFolderId !== undefined && { folderId: targetFolderId }),
  });
}
