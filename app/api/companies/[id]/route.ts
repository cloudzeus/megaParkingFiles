import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { clearDefaultCompanyCache } from "@/lib/default-company";

/**
 * GET: Company details. Super Admin only.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number((await params).id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      defaultRetentionPolicy: { select: { id: true, name: true, durationDays: true } },
      dpo: { select: { id: true, name: true, email: true } },
      securityOfficer: { select: { id: true, name: true, email: true } },
      _count: { select: { users: true, departments: true, files: true, folders: true } },
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({
    company: {
      ...company,
      bunnyStorageAccessKey: company.bunnyStorageAccessKey ? "(set)" : null,
    },
  });
}

/**
 * PATCH: Update company. Super Admin only.
 * Body: { name?, slug?, country?, bunnyStorageZoneName?, bunnyStorageAccessKey?, defaultDataRetentionPolicyId? }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number((await params).id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.company.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  let body: {
    name?: string;
    slug?: string;
    country?: string | null;
    address?: string | null;
    afm?: string | null;
    activity?: string | null;
    isDefault?: boolean;
    bunnyStorageZoneName?: string | null;
    bunnyStorageAccessKey?: string | null;
    defaultDataRetentionPolicyId?: number | null;
    dpoUserId?: string | null;
    securityOfficerUserId?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.dpoUserId !== undefined && body.dpoUserId !== null) {
    const dpoUser = await prisma.user.findFirst({
      where: { id: body.dpoUserId!, companyId: id },
      select: { id: true },
    });
    if (!dpoUser) {
      return NextResponse.json({ error: "DPO user must belong to this company" }, { status: 400 });
    }
  }
  if (body.securityOfficerUserId !== undefined && body.securityOfficerUserId !== null) {
    const soUser = await prisma.user.findFirst({
      where: { id: body.securityOfficerUserId!, companyId: id },
      select: { id: true },
    });
    if (!soUser) {
      return NextResponse.json({ error: "Security Officer user must belong to this company" }, { status: 400 });
    }
  }

  const updateData: Record<string, unknown> = {};
  if (body.name !== undefined) updateData.name = body.name.trim();
  if (body.slug !== undefined) updateData.slug = body.slug.trim().toLowerCase().replace(/\s+/g, "-");
  if (body.country !== undefined) updateData.country = body.country?.trim() || null;
  if (body.address !== undefined) updateData.address = body.address?.trim() || null;
  if (body.afm !== undefined) updateData.afm = body.afm?.trim() || null;
  if (body.activity !== undefined) updateData.activity = body.activity?.trim() || null;
  if (body.bunnyStorageZoneName !== undefined) updateData.bunnyStorageZoneName = body.bunnyStorageZoneName?.trim() || null;
  if (body.bunnyStorageAccessKey !== undefined) updateData.bunnyStorageAccessKey = body.bunnyStorageAccessKey === "" ? null : (body.bunnyStorageAccessKey ?? null);
  if (body.defaultDataRetentionPolicyId !== undefined) updateData.defaultDataRetentionPolicyId = body.defaultDataRetentionPolicyId ?? null;
  if (body.dpoUserId !== undefined) updateData.dpoUserId = body.dpoUserId === "" ? null : body.dpoUserId;
  if (body.securityOfficerUserId !== undefined) updateData.securityOfficerUserId = body.securityOfficerUserId === "" ? null : body.securityOfficerUserId;
  if (body.isDefault === true) {
    await prisma.company.updateMany({
      where: { id: { not: id } },
      data: { isDefault: false },
    });
    updateData.isDefault = true;
    clearDefaultCompanyCache();
  } else if (body.isDefault === false) {
    updateData.isDefault = false;
    clearDefaultCompanyCache();
  }

  const company = await prisma.company.update({
    where: { id },
    data: updateData,
    include: {
      defaultRetentionPolicy: { select: { id: true, name: true, durationDays: true } },
      dpo: { select: { id: true, name: true, email: true } },
      securityOfficer: { select: { id: true, name: true, email: true } },
      _count: { select: { users: true, departments: true, files: true, folders: true } },
    },
  });

  return NextResponse.json({ company });
}

/**
 * DELETE: Delete company and all related data (cascade). Super Admin only.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const id = Number((await params).id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const existing = await prisma.company.findUnique({
    where: { id },
    include: {
      _count: { select: { users: true, departments: true, files: true, folders: true } },
    },
  });
  if (!existing) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }
  if (existing.isDefault) {
    return NextResponse.json({ error: "Cannot delete the default company. Set another company as default first." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    // Clear self-referencing FKs before deleting related records
    await tx.company.update({
      where: { id },
      data: { dpoUserId: null, securityOfficerUserId: null, defaultDataRetentionPolicyId: null },
    });

    const shareIds = await tx.fileShare.findMany({ where: { companyId: id }, select: { id: true } }).then((s) => s.map((x) => x.id));
    if (shareIds.length > 0) {
      await tx.fileShareAccess.deleteMany({ where: { shareId: { in: shareIds } } });
    }
    await tx.fileShare.deleteMany({ where: { companyId: id } });
    const fileIds = await tx.file.findMany({ where: { companyId: id }, select: { id: true } }).then((f) => f.map((x) => x.id));
    if (fileIds.length > 0) {
      await tx.fileClassificationJob.deleteMany({ where: { fileId: { in: fileIds } } });
      await tx.fileTag.deleteMany({ where: { fileId: { in: fileIds } } });
      await tx.fileRetention.deleteMany({ where: { fileId: { in: fileIds } } });
      await tx.file.updateMany({ where: { companyId: id }, data: { deletionProofId: null } });
    }
    await tx.erasureProof.deleteMany({ where: { companyId: id } });
    await tx.file.deleteMany({ where: { companyId: id } });
    const folderIds = await tx.folder.findMany({ where: { companyId: id }, select: { id: true } }).then((f) => f.map((x) => x.id));
    if (folderIds.length > 0) {
      await tx.folderPermission.deleteMany({ where: { folderId: { in: folderIds } } });
    }
    await tx.folder.deleteMany({ where: { companyId: id } });
    await tx.apiKey.deleteMany({ where: { companyId: id } });
    await tx.department.deleteMany({ where: { companyId: id } });
    const userIds = await tx.user.findMany({ where: { companyId: id }, select: { id: true } }).then((u) => u.map((x) => x.id));
    if (userIds.length > 0) {
      await tx.account.deleteMany({ where: { userId: { in: userIds } } });
      await tx.session.deleteMany({ where: { userId: { in: userIds } } });
    }
    await tx.user.deleteMany({ where: { companyId: id } });
    await tx.retentionPolicy.deleteMany({ where: { companyId: id } });
    await tx.auditLog.deleteMany({ where: { companyId: id } });
    await tx.fileCategory.deleteMany({ where: { companyId: id } });
    await tx.company.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
