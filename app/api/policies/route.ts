import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canManagePolicies } from "@/lib/rbac";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";

/**
 * List retention policies for the company.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const companyId = await getEffectiveCompanyIdForMainFeatures(session);
  if (companyId == null) {
    return NextResponse.json({ error: "No company context" }, { status: 403 });
  }

  const policies = await prisma.retentionPolicy.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    policies: policies.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      durationDays: p.durationDays,
      autoDelete: p.autoDelete,
      legalHoldAllowed: p.legalHoldAllowed,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  });
}

/**
 * Create a retention policy. Admin/DPO only.
 */
export async function POST(req: Request) {
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

  let body: { name: string; description?: string; durationDays?: number; autoDelete?: boolean; legalHoldAllowed?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const policy = await prisma.retentionPolicy.create({
    data: {
      companyId,
      name,
      description: typeof body.description === "string" ? body.description.trim() || null : null,
      durationDays: body.durationDays != null ? Math.max(0, Number(body.durationDays)) : null,
      autoDelete: body.autoDelete === true,
      legalHoldAllowed: body.legalHoldAllowed !== false,
    },
  });

  return NextResponse.json({
    id: policy.id,
    name: policy.name,
    description: policy.description,
    durationDays: policy.durationDays,
    autoDelete: policy.autoDelete,
    legalHoldAllowed: policy.legalHoldAllowed,
    createdAt: policy.createdAt.toISOString(),
    updatedAt: policy.updatedAt.toISOString(),
  });
}
