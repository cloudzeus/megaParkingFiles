import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canWriteFolder } from "@/lib/rbac";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";
import { uploadFile } from "@/lib/bunny";
import { scanFile } from "@/lib/malware";
import { runClassification } from "@/lib/classification";
import { createAuditLog } from "@/lib/audit";
import { EventType, TargetType } from "@prisma/client";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const folderIdRaw = formData.get("folderId");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "File required" }, { status: 400 });
  }

  const folderId = folderIdRaw != null ? Number(folderIdRaw) : NaN;
  if (Number.isNaN(folderId)) {
    return NextResponse.json({ error: "Valid folderId required" }, { status: 400 });
  }

  const companyId = await getEffectiveCompanyIdForMainFeatures(session);
  if (companyId == null) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const folder = await prisma.folder.findUnique({
    where: { id: folderId },
    include: { company: true },
  });
  if (!folder || folder.companyId !== companyId) {
    return NextResponse.json({ error: "Folder not found" }, { status: 404 });
  }

  const user = {
    id: session.user.id,
    role: session.user.role,
    companyId,
    departmentId: session.user.departmentId,
  };
  if (!canWriteFolder(user, folder)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const originalName = file.name.replace(/[/\\]/g, "");
  const ext = originalName.includes(".") ? originalName.slice(originalName.lastIndexOf(".")) : "";
  const storageFileName = `${randomUUID()}${ext}`;
  const bunnyPath = `${folder.companyId}/${folderId}/${storageFileName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const uploadResult = await uploadFile(bunnyPath, buffer, file.type || undefined);
  if (!uploadResult.ok) {
    return NextResponse.json({ error: `Upload failed: ${uploadResult.error}` }, { status: 502 });
  }

  const dbFile = await prisma.file.create({
    data: {
      companyId: folder.companyId,
      folderId: folder.id,
      departmentId: folder.departmentId,
      name: originalName,
      extension: ext || null,
      sizeBytes: file.size,
      mimeType: file.type || null,
      bunnyStoragePath: bunnyPath,
      createdByUserId: session.user.id,
      malwareStatus: "PENDING",
      gdprRiskLevel: "UNKNOWN",
      classificationStatus: "PENDING",
      deletionStatus: "ACTIVE",
    },
  });

  await createAuditLog({
    companyId: folder.companyId,
    actorUserId: session.user.id,
    eventType: EventType.FILE_UPLOAD,
    targetType: TargetType.FILE,
    targetId: dbFile.id,
    metadata: { fileName: originalName, sizeBytes: file.size, folderId },
  });

  scanFile(dbFile.id).catch(() => {});
  runClassification(dbFile.id).catch(() => {});

  return NextResponse.json({
    id: dbFile.id,
    name: dbFile.name,
    sizeBytes: dbFile.sizeBytes,
    folderId: dbFile.folderId,
    malwareStatus: dbFile.malwareStatus,
    uploadedAt: dbFile.uploadedAt.toISOString(),
  });
}
