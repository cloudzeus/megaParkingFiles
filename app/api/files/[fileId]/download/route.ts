import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canReadFile } from "@/lib/rbac";
import { getSignedDownloadUrl } from "@/lib/bunny";
import { createAuditLog } from "@/lib/audit";
import { EventType, TargetType } from "@prisma/client";

const DOWNLOAD_EXPIRES_SECONDS = 3600;

export async function GET(
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
  if (!canReadFile(user, file)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (file.malwareStatus === "INFECTED") {
    return NextResponse.json({ error: "File blocked (malware)" }, { status: 403 });
  }
  if (file.deletionStatus !== "ACTIVE") {
    return NextResponse.json({ error: "File not available" }, { status: 410 });
  }

  const url = getSignedDownloadUrl(file.bunnyStoragePath, DOWNLOAD_EXPIRES_SECONDS);
  if (!url) {
    return NextResponse.json({ error: "Download URL not configured" }, { status: 502 });
  }

  await createAuditLog({
    companyId: file.companyId,
    actorUserId: session.user.id,
    eventType: EventType.FILE_DOWNLOAD,
    targetType: TargetType.FILE,
    targetId: file.id,
    metadata: { fileName: file.name },
  });

  return NextResponse.redirect(url);
}
