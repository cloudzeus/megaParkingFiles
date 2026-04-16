import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManagePolicies } from "@/lib/rbac";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getEffectiveCompanyIdForMainFeatures(session);
  if (companyId == null) {
    return NextResponse.json({ error: "No company context" }, { status: 403 });
  }

  const user = {
    id: session.user.id,
    role: session.user.role,
    companyId,
    departmentId: session.user.departmentId,
  };
  if (!canManagePolicies(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number((await params).id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let body: { name?: string; description?: string; durationDays?: number; autoDelete?: boolean; legalHoldAllowed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const policy = await prisma.retentionPolicy.findFirst({
    where: { id, companyId },
  });
  if (!policy) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }

  const data: { name?: string; description?: string | null; durationDays?: number | null; autoDelete?: boolean; legalHoldAllowed?: boolean } = {};
  if (typeof body.name === "string") data.name = body.name.trim();
  if (body.description !== undefined) data.description = typeof body.description === "string" ? body.description.trim() || null : null;
  if (body.durationDays !== undefined) data.durationDays = body.durationDays != null ? Math.max(0, Number(body.durationDays)) : null;
  if (typeof body.autoDelete === "boolean") data.autoDelete = body.autoDelete;
  if (typeof body.legalHoldAllowed === "boolean") data.legalHoldAllowed = body.legalHoldAllowed;

  const updated = await prisma.retentionPolicy.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    id: updated.id,
    name: updated.name,
    description: updated.description,
    durationDays: updated.durationDays,
    autoDelete: updated.autoDelete,
    legalHoldAllowed: updated.legalHoldAllowed,
    updatedAt: updated.updatedAt.toISOString(),
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getEffectiveCompanyIdForMainFeatures(session);
  if (companyId == null) {
    return NextResponse.json({ error: "No company context" }, { status: 403 });
  }

  const user = {
    id: session.user.id,
    role: session.user.role,
    companyId,
    departmentId: session.user.departmentId,
  };
  if (!canManagePolicies(user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number((await params).id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const policy = await prisma.retentionPolicy.findFirst({
    where: { id, companyId },
    include: { fileRetentions: { take: 1 } },
  });
  if (!policy) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }
  if (policy.fileRetentions.length > 0) {
    return NextResponse.json(
      { error: "Policy is assigned to files. Remove assignments first." },
      { status: 400 }
    );
  }

  await prisma.retentionPolicy.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
