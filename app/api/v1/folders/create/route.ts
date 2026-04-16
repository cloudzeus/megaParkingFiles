import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canWriteFolder } from "@/lib/rbac";
import { createAuditLog } from "@/lib/audit";
import { EventType, TargetType } from "@prisma/client";
import {
  getApiKeyFromRequest,
  validateApiKey,
  apiKeyContextToSessionUser,
} from "@/lib/api-key-auth";

export async function POST(req: Request) {
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

  let body: { parentFolderId?: number | null; name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const parentId =
    body.parentFolderId === undefined || body.parentFolderId === null
      ? null
      : Number(body.parentFolderId);

  let parentPath = "";
  if (parentId !== null && !Number.isNaN(parentId)) {
    const parent = await prisma.folder.findUnique({
      where: { id: parentId },
    });
    if (!parent || parent.companyId !== ctx.companyId) {
      return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
    }
    if (!canWriteFolder(user, parent)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    parentPath = parent.path.endsWith("/") ? parent.path : `${parent.path}/`;
  }

  const path = `${parentPath}${name}`;
  const existing = await prisma.folder.findFirst({
    where: {
      companyId: ctx.companyId,
      parentFolderId: parentId,
      name,
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Folder with this name already exists" }, { status: 409 });
  }

  const folder = await prisma.folder.create({
    data: {
      companyId: ctx.companyId,
      parentFolderId: parentId,
      name,
      path,
      isDepartmentRoot: false,
      createdByUserId: ctx.userId,
    },
  });

  await createAuditLog({
    companyId: ctx.companyId,
    actorUserId: ctx.userId,
    eventType: EventType.FOLDER_CREATE,
    targetType: TargetType.FOLDER,
    targetId: folder.id,
    metadata: { action: "create", name: folder.name, path: folder.path },
  });

  return NextResponse.json({
    id: folder.id,
    name: folder.name,
    path: folder.path,
    parentFolderId: folder.parentFolderId,
    createdAt: folder.createdAt.toISOString(),
  });
}
