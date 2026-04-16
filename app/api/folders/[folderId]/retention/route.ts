import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManagePolicies, canWriteFolder } from "@/lib/rbac";
import type { Folder } from "@prisma/client";

/**
 * Get all file IDs under a folder (and optionally its subfolders).
 * Uses two bulk queries instead of recursive per-folder queries.
 */
async function getFileIdsInFolder(
  folderId: number,
  companyId: number,
  recursive: boolean
): Promise<number[]> {
  if (!recursive) {
    const files = await prisma.file.findMany({
      where: { folderId, companyId, deletionStatus: "ACTIVE" },
      select: { id: true },
    });
    return files.map((f) => f.id);
  }

  // Fetch all company folders once, then walk the tree in-memory
  const allFolders = await prisma.folder.findMany({
    where: { companyId },
    select: { id: true, parentFolderId: true },
  });

  const childrenMap = new Map<number | null, number[]>();
  for (const f of allFolders) {
    if (!childrenMap.has(f.parentFolderId)) childrenMap.set(f.parentFolderId, []);
    childrenMap.get(f.parentFolderId)!.push(f.id);
  }

  const folderIds: number[] = [folderId];
  const stack = [folderId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const children = childrenMap.get(current) ?? [];
    for (const childId of children) {
      folderIds.push(childId);
      stack.push(childId);
    }
  }

  const files = await prisma.file.findMany({
    where: { folderId: { in: folderIds }, companyId, deletionStatus: "ACTIVE" },
    select: { id: true },
  });
  return files.map((f) => f.id);
}

/**
 * POST: Assign a retention (GDPR) policy to all files in a folder.
 * Body: { policyId: number, recursive?: boolean }
 * Requires canManagePolicies; folder must be writable.
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

  let body: { policyId: number; recursive?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const policyId = Number(body.policyId);
  if (Number.isNaN(policyId) || policyId < 1) {
    return NextResponse.json({ error: "Valid policyId required" }, { status: 400 });
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
  if (!canManagePolicies(user) && !canWriteFolder(user, folder as Folder)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const policy = await prisma.retentionPolicy.findFirst({
    where: { id: policyId, companyId: session.user.companyId },
  });
  if (!policy) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }

  const fileIds = await getFileIdsInFolder(
    folderId,
    session.user.companyId,
    body.recursive === true
  );

  if (fileIds.length === 0) {
    return NextResponse.json({
      ok: true,
      message: "No files in folder",
      assignedCount: 0,
    });
  }

  await prisma.fileRetention.createMany({
    data: fileIds.map((fileId) => ({ fileId, policyId })),
    skipDuplicates: false,
  });

  return NextResponse.json({
    ok: true,
    message: "Policy assigned to files in folder",
    assignedCount: fileIds.length,
  });
}
