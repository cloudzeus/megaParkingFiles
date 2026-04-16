import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canWriteFolder } from "@/lib/rbac";
import type { Folder } from "@prisma/client";

/**
 * List permissions for a folder. Requires canWriteFolder (or canReadFolder for read-only - for simplicity we require write to manage).
 */
export async function GET(
  _req: Request,
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
    include: { permissions: true },
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

  return NextResponse.json({
    folderId: folder.id,
    permissions: folder.permissions.map((p) => ({
      id: p.id,
      subjectType: p.subjectType,
      subjectId: p.subjectId,
      canRead: p.canRead,
      canWrite: p.canWrite,
      canShare: p.canShare,
      canManage: p.canManage,
    })),
  });
}

/**
 * Add or update a permission. Body: { subjectType, subjectId, canRead, canWrite, canShare, canManage }.
 */
export async function POST(
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

  let body: { subjectType: string; subjectId: number; canRead?: boolean; canWrite?: boolean; canShare?: boolean; canManage?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const subjectType = body.subjectType === "DEPARTMENT" || body.subjectType === "ROLE" || body.subjectType === "USER" ? body.subjectType : null;
  if (!subjectType || typeof body.subjectId !== "number") {
    return NextResponse.json({ error: "subjectType (DEPARTMENT|ROLE|USER) and subjectId required" }, { status: 400 });
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

  const existing = await prisma.folderPermission.findFirst({
    where: { folderId, subjectType, subjectId: body.subjectId },
  });

  const data = {
    canRead: body.canRead !== false,
    canWrite: body.canWrite === true,
    canShare: body.canShare === true,
    canManage: body.canManage === true,
  };

  if (existing) {
    const updated = await prisma.folderPermission.update({
      where: { id: existing.id },
      data,
    });
    return NextResponse.json(updated);
  }

  const created = await prisma.folderPermission.create({
    data: {
      folderId,
      subjectType,
      subjectId: body.subjectId,
      ...data,
    },
  });
  return NextResponse.json(created);
}
