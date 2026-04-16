import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";

function canManageDepartments(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
}

/**
 * PATCH: Update department (default company only). Super Admin / Company Admin only.
 * Body: { name?, description? }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageDepartments(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const companyId = await getEffectiveCompanyIdForMainFeatures(session);
  if (companyId == null) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const id = Number((await params).id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.department.findFirst({
    where: { id, companyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  let body: { name?: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const updateData: { name?: string; description?: string | null } = {};
  if (body.name !== undefined) {
    const name = body.name?.trim();
    if (!name) return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    updateData.name = name;
  }
  if (body.description !== undefined) updateData.description = body.description?.trim() || null;

  const department = await prisma.department.update({
    where: { id },
    data: updateData,
    select: { id: true, name: true, description: true },
  });

  return NextResponse.json({ department });
}

/**
 * DELETE: Delete department. Only if no users and no folders/files linked.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageDepartments(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const companyId = session.user.companyId as number;
  const id = Number((await params).id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.department.findFirst({
    where: { id, companyId },
    include: {
      _count: { select: { users: true, folders: true, files: true } },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Department not found" }, { status: 404 });
  }

  if (existing._count.users > 0 || existing._count.folders > 0 || existing._count.files > 0) {
    return NextResponse.json(
      { error: "Department has users, folders or files. Remove them first." },
      { status: 400 }
    );
  }

  await prisma.department.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
