import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canWriteFile, canWriteFolder } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { EventType, TargetType } from "@prisma/client";
import type { File, Folder } from "@prisma/client";

/**
 * Move a file to another folder. Requires canWriteFile on file and canWriteFolder on target folder.
 */
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

  let body: { folderId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetFolderId = body.folderId != null ? Number(body.folderId) : NaN;
  if (Number.isNaN(targetFolderId)) {
    return NextResponse.json({ error: "folderId required" }, { status: 400 });
  }

  const [file, targetFolder] = await Promise.all([
    prisma.file.findUnique({
      where: { id: fileId },
      include: { folder: true },
    }),
    prisma.folder.findUnique({
      where: { id: targetFolderId },
    }),
  ]);

  if (!file || file.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
  if (!targetFolder || targetFolder.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Target folder not found" }, { status: 404 });
  }

  if (file.folderId === targetFolderId) {
    return NextResponse.json({ error: "File already in that folder" }, { status: 400 });
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
  if (!canWriteFolder(user, targetFolder as Folder)) {
    return NextResponse.json({ error: "Forbidden: no write access to target folder" }, { status: 403 });
  }
  if (file.deletionStatus !== "ACTIVE") {
    return NextResponse.json({ error: "File not available" }, { status: 410 });
  }

  await prisma.file.update({
    where: { id: fileId },
    data: {
      folderId: targetFolderId,
      departmentId: targetFolder.departmentId,
    },
  });

  await createAuditLog({
    companyId: file.companyId,
    actorUserId: session.user.id,
    eventType: EventType.FILE_MOVE,
    targetType: TargetType.FILE,
    targetId: file.id,
    metadata: {
      fileName: file.name,
      fromFolderId: file.folderId,
      toFolderId: targetFolderId,
    },
  });

  return NextResponse.json({ ok: true, folderId: targetFolderId });
}
