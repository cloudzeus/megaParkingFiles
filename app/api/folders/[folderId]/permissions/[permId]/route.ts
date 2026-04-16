import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canWriteFolder } from "@/lib/rbac";
import type { Folder } from "@prisma/client";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ folderId: string; permId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folderId = Number((await params).folderId);
  const permId = Number((await params).permId);
  if (Number.isNaN(folderId) || Number.isNaN(permId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const perm = await prisma.folderPermission.findFirst({
    where: { id: permId, folderId },
    include: { folder: true },
  });
  if (!perm || perm.folder.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "Permission not found" }, { status: 404 });
  }

  const user = {
    id: session.user.id,
    role: session.user.role,
    companyId: session.user.companyId,
    departmentId: session.user.departmentId,
  };
  if (!canWriteFolder(user, perm.folder as Folder)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.folderPermission.delete({ where: { id: permId } });
  return NextResponse.json({ ok: true });
}
