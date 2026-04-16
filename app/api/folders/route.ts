import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canReadFolder } from "@/lib/rbac";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const companyId = await getEffectiveCompanyIdForMainFeatures(session);
  if (companyId == null) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const folderIdParam = searchParams.get("folderId");
  const parentId = folderIdParam === "" || folderIdParam === "root" || folderIdParam === null
    ? null
    : Number(folderIdParam);

  if (parentId !== null && Number.isNaN(parentId)) {
    return NextResponse.json({ error: "Invalid folderId" }, { status: 400 });
  }

  const user = {
    id: session.user.id,
    role: session.user.role,
    companyId,
    departmentId: session.user.departmentId,
  };

  if (parentId !== null) {
    const parent = await prisma.folder.findUnique({
      where: { id: parentId },
    });
    if (!parent || !canReadFolder(user, parent)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const [folders, files] = await Promise.all([
    prisma.folder.findMany({
      where: {
        companyId,
        parentFolderId: parentId,
      },
      orderBy: { name: "asc" },
      include: { createdBy: { select: { name: true, email: true } } },
    }),
    parentId !== null
      ? prisma.file.findMany({
          where: { folderId: parentId, companyId, deletionStatus: "ACTIVE" },
          orderBy: { name: "asc" },
          include: { createdBy: { select: { name: true, email: true } } },
        })
      : Promise.resolve([]),
  ]);

  const foldersFiltered = folders.filter((f) => canReadFolder(user, f));

  return NextResponse.json({
    folderId: parentId,
    folders: foldersFiltered.map((f) => ({
      id: f.id,
      name: f.name,
      path: f.path,
      isDepartmentRoot: f.isDepartmentRoot,
      containsPersonalData: f.containsPersonalData,
      createdAt: f.createdAt.toISOString(),
      createdBy: f.createdBy?.name ?? f.createdBy?.email ?? null,
    })),
    files: files.map((f) => ({
      id: f.id,
      name: f.name,
      extension: f.extension,
      sizeBytes: f.sizeBytes,
      mimeType: f.mimeType,
      malwareStatus: f.malwareStatus,
      gdprRiskLevel: f.gdprRiskLevel,
      uploadedAt: f.uploadedAt.toISOString(),
      createdBy: f.createdBy?.name ?? f.createdBy?.email ?? null,
    })),
  });
}
