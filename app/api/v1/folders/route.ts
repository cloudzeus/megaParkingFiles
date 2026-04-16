import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canReadFolder } from "@/lib/rbac";
import {
  getApiKeyFromRequest,
  validateApiKey,
  apiKeyContextToSessionUser,
} from "@/lib/api-key-auth";

export async function GET(req: Request) {
  const rawKey = getApiKeyFromRequest(req);
  if (!rawKey) {
    return NextResponse.json(
      { error: "Missing API key. Use Authorization: Bearer <key> or X-API-Key header." },
      { status: 401 }
    );
  }

  const ctx = await validateApiKey(rawKey);
  if (!ctx) {
    return NextResponse.json({ error: "Invalid or expired API key." }, { status: 401 });
  }

  const user = apiKeyContextToSessionUser(ctx);

  const { searchParams } = new URL(req.url);
  const folderIdParam = searchParams.get("folderId");
  const parentId =
    folderIdParam === "" || folderIdParam === "root" || folderIdParam === null
      ? null
      : Number(folderIdParam);

  if (parentId !== null && Number.isNaN(parentId)) {
    return NextResponse.json({ error: "Invalid folderId" }, { status: 400 });
  }

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
        companyId: ctx.companyId,
        parentFolderId: parentId,
      },
      orderBy: { name: "asc" },
      include: { createdBy: { select: { name: true, email: true } } },
    }),
    parentId !== null
      ? prisma.file.findMany({
          where: {
            folderId: parentId,
            companyId: ctx.companyId,
            deletionStatus: "ACTIVE",
          },
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
