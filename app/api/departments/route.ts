import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";

function canManageDepartments(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
}

/**
 * GET: List departments for the default company only.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const companyId = await getEffectiveCompanyIdForMainFeatures(session);
  if (companyId == null) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const departments = await prisma.department.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true },
  });

  return NextResponse.json({ departments });
}

/**
 * POST: Create department (default company only). Super Admin / Company Admin only.
 * Body: { name, description? }
 */
export async function POST(request: Request) {
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

  let body: { name: string; description?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return NextResponse.json({ error: "Name required" }, { status: 400 });
  }

  const department = await prisma.department.create({
    data: {
      companyId,
      name,
      description: body.description?.trim() || null,
    },
    select: { id: true, name: true, description: true },
  });

  return NextResponse.json({ department });
}
