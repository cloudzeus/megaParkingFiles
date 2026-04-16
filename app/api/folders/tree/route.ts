import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canReadFolder } from "@/lib/rbac";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";
import type { Folder } from "@prisma/client";

type FolderNode = {
  id: number;
  name: string;
  path: string;
  isDepartmentRoot: boolean;
  children: FolderNode[];
};

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const companyId = await getEffectiveCompanyIdForMainFeatures(session);
  if (companyId == null) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = {
    id: session.user.id,
    role: session.user.role,
    companyId,
    departmentId: session.user.departmentId,
  };

  const allFolders = await prisma.folder.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, path: true, parentFolderId: true, isDepartmentRoot: true, departmentId: true, createdByUserId: true },
  });

  const allowed = allFolders.filter((f) => canReadFolder(user, f as Folder));

  // Build a lookup map for O(n) tree construction instead of O(n²)
  const childrenMap = new Map<number | null, typeof allowed>();
  for (const f of allowed) {
    const key = f.parentFolderId;
    if (!childrenMap.has(key)) childrenMap.set(key, []);
    childrenMap.get(key)!.push(f);
  }

  function buildTree(parentId: number | null): FolderNode[] {
    return (childrenMap.get(parentId) ?? []).map((f) => ({
      id: f.id,
      name: f.name,
      path: f.path,
      isDepartmentRoot: f.isDepartmentRoot,
      children: buildTree(f.id),
    }));
  }

  const tree = buildTree(null);
  return NextResponse.json({ tree });
}
