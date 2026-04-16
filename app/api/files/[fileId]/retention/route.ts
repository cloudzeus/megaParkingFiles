import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManagePolicies, canWriteFile } from "@/lib/rbac";
import type { File } from "@prisma/client";

/**
 * POST: Assign a retention (GDPR) policy to a file.
 * Body: { policyId: number }
 * Requires canManagePolicies or canWriteFile.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fileId = Number((await params).fileId);
  if (Number.isNaN(fileId)) {
    return NextResponse.json({ error: "Invalid fileId" }, { status: 400 });
  }

  let body: { policyId: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const policyId = Number(body.policyId);
  if (Number.isNaN(policyId) || policyId < 1) {
    return NextResponse.json({ error: "Valid policyId required" }, { status: 400 });
  }

  const file = await prisma.file.findUnique({
    where: { id: fileId },
  });
  if (!file || file.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  const user = {
    id: session.user.id,
    role: session.user.role,
    companyId: session.user.companyId,
    departmentId: session.user.departmentId,
  };
  const canAssign = canManagePolicies(user) || canWriteFile(user, file as File);
  if (!canAssign) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (file.deletionStatus !== "ACTIVE") {
    return NextResponse.json({ error: "File not available" }, { status: 410 });
  }

  const policy = await prisma.retentionPolicy.findFirst({
    where: { id: policyId, companyId: session.user.companyId },
  });
  if (!policy) {
    return NextResponse.json({ error: "Policy not found" }, { status: 404 });
  }

  await prisma.fileRetention.create({
    data: {
      fileId,
      policyId,
    },
  });

  return NextResponse.json({ ok: true, message: "Policy assigned" });
}
