import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import type { UserRole } from "@prisma/client";
import { getEffectiveCompanyIdForMainFeatures } from "@/lib/default-company";

function canManageUsers(role: string): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN";
}

/**
 * GET: List users (employees) for the current user's company. Super Admin / Company Admin only.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const companyId = await getEffectiveCompanyIdForMainFeatures(session);
  if (companyId == null) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { companyId },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentId: true,
      isActive: true,
      companyId: true,
      department: { select: { id: true, name: true } },
      company: { select: { id: true, name: true } },
    },
  });

  const isSuperAdmin = session.user.role === "SUPER_ADMIN";
  const serialized = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    departmentId: u.departmentId,
    isActive: u.isActive,
    department: u.department,
    ...(isSuperAdmin ? { companyId: u.companyId, company: u.company } : {}),
  }));

  return NextResponse.json({ users: serialized });
}

/**
 * POST: Create a new user (employee). Super Admin / Company Admin only.
 * Body: { name?, email, password, role, departmentId?, companyId? }
 * companyId only allowed for SUPER_ADMIN (default company used otherwise).
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageUsers(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  let companyId = await getEffectiveCompanyIdForMainFeatures(session);
  if (companyId == null) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { name?: string; email: string; password: string; role: UserRole; departmentId?: number | null; companyId?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { email, password, role, name, departmentId } = body;
  if (!email || typeof email !== "string" || !password || typeof password !== "string") {
    return NextResponse.json({ error: "Email and password required" }, { status: 400 });
  }

  if (session.user.role === "SUPER_ADMIN" && body.companyId != null) {
    const companyExists = await prisma.company.findUnique({
      where: { id: body.companyId },
      select: { id: true },
    });
    if (!companyExists) {
      return NextResponse.json({ error: "Company not found" }, { status: 400 });
    }
    companyId = body.companyId;
  }

  const validRoles: UserRole[] = ["EMPLOYEE", "DEPARTMENT_MANAGER", "COMPANY_ADMIN", "AUDITOR", "DPO"];
  if (!role || !validRoles.includes(role)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  if (departmentId != null) {
    const dept = await prisma.department.findFirst({
      where: { id: departmentId, companyId },
    });
    if (!dept) {
      return NextResponse.json({ error: "Department not found or not in company" }, { status: 400 });
    }
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    return NextResponse.json({ error: "Email already in use" }, { status: 409 });
  }

  const hashedPassword = await hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      name: name?.trim() || null,
      companyId,
      departmentId: departmentId ?? null,
      role,
      hashedPassword,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentId: true,
      isActive: true,
      department: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ user });
}
