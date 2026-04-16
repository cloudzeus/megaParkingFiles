import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canWriteFolder } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { EventType, TargetType } from "@prisma/client";
import type { Folder } from "@prisma/client";

/**
 * Delete a folder. Only allowed if folder is empty (no files, no subfolders).
 * Blocked if folder is marked as containing personal data unless ?gdprOverride=true (DPO/Company Admin).
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folderId = Number((await params).folderId);
  if (Number.isNaN(folderId)) {
    return NextResponse.json({ error: "Invalid folderId" }, { status: 400 });
  }

  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
  });
  if (!folder || folder.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const user = {
    id: session.user.id,
    role: session.user.role,
    companyId: session.user.companyId,
    departmentId: session.user.departmentId,
  };
  if (!canWriteFolder(user, folder as Folder)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const canOverride = session.user.role === "DPO" || session.user.role === "COMPANY_ADMIN" || session.user.role === "SUPER_ADMIN";
  const url = new URL(req.url);
  const gdprOverride = url.searchParams.get("gdprOverride") === "true";
  if (folder.containsPersonalData && !(gdprOverride && canOverride)) {
    await createAuditLog({
      companyId: folder.companyId,
      actorUserId: session.user.id,
      eventType: EventType.FOLDER_DELETE,
      targetType: TargetType.FOLDER,
      targetId: folder.id,
      metadata: { action: "delete_blocked", reason: "containsPersonalData", name: folder.name },
    });
    return NextResponse.json(
      { error: "Deletion blocked: folder is marked as containing personal data. DPO/Company Admin can override with ?gdprOverride=true." },
      { status: 403 }
    );
  }

  const [fileCount, subfolderCount] = await Promise.all([
    prisma.file.count({ where: { folderId } }),
    prisma.folder.count({ where: { parentFolderId: folderId } }),
  ]);

  if (fileCount > 0 || subfolderCount > 0) {
    return NextResponse.json(
      { error: "Folder is not empty. Delete or move contents first." },
      { status: 400 }
    );
  }

  await prisma.folder.delete({ where: { id: folderId } });

  await createAuditLog({
    companyId: folder.companyId,
    actorUserId: session.user.id,
    eventType: EventType.FOLDER_DELETE,
    targetType: TargetType.FOLDER,
    targetId: folder.id,
    metadata: { action: "delete", name: folder.name, path: folder.path },
  });

  return NextResponse.json({ ok: true, message: "Folder deleted" });
}

/**
 * PATCH folder: update containsPersonalData and optionally apply CONFIRMED_PII to all files in folder.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folderId = Number((await params).folderId);
  if (Number.isNaN(folderId)) {
    return NextResponse.json({ error: "Invalid folderId" }, { status: 400 });
  }

  let body: { containsPersonalData?: boolean; applyToFiles?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
  });
  if (!folder || folder.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const user = {
    id: session.user.id,
    role: session.user.role,
    companyId: session.user.companyId,
    departmentId: session.user.departmentId,
  };
  if (!canWriteFolder(user, folder as Folder)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (typeof body.containsPersonalData !== "boolean") {
    return NextResponse.json({ error: "Provide containsPersonalData (boolean)" }, { status: 400 });
  }

  await prisma.folder.update({
    where: { id: folderId },
    data: { containsPersonalData: body.containsPersonalData },
  });

  if (body.containsPersonalData === true && body.applyToFiles === true) {
    await prisma.file.updateMany({
      where: { folderId },
      data: { gdprRiskLevel: "CONFIRMED_PII" },
    });
  }

  return NextResponse.json({ ok: true, containsPersonalData: body.containsPersonalData });
}
