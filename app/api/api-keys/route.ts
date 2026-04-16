import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  generateApiKey,
  hashApiKey,
} from "@/lib/api-key-auth";
import type { UserRole } from "@prisma/client";

function canCreateDepartmentKey(role: UserRole): boolean {
  return role === "SUPER_ADMIN" || role === "COMPANY_ADMIN" || role === "DEPARTMENT_MANAGER";
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const keys = await prisma.apiKey.findMany({
    where: {
      companyId: session.user.companyId,
      OR: [
        { userId: session.user.id },
        ...(session.user.role === "SUPER_ADMIN" || session.user.role === "COMPANY_ADMIN"
          ? [{}]
          : []),
        ...(session.user.role === "DEPARTMENT_MANAGER" && session.user.departmentId != null
          ? [{ departmentId: session.user.departmentId }]
          : []),
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      departmentId: true,
      department: { select: { name: true } },
      expiresAt: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    apiKeys: keys.map((k) => ({
      id: k.id,
      name: k.name,
      keyPrefix: k.keyPrefix,
      departmentId: k.departmentId,
      departmentName: k.department?.name ?? null,
      expiresAt: k.expiresAt?.toISOString() ?? null,
      lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
      createdAt: k.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { name?: string; departmentId?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const departmentId =
    body.departmentId != null && Number.isInteger(body.departmentId)
      ? body.departmentId
      : null;

  if (departmentId !== null) {
    if (!canCreateDepartmentKey(session.user.role)) {
      return NextResponse.json({ error: "Forbidden: cannot create department-scoped key" }, { status: 403 });
    }
    const dept = await prisma.department.findFirst({
      where: { id: departmentId, companyId: session.user.companyId },
    });
    if (!dept) {
      return NextResponse.json({ error: "Department not found" }, { status: 404 });
    }
    if (
      session.user.role === "DEPARTMENT_MANAGER" &&
      session.user.departmentId !== departmentId
    ) {
      return NextResponse.json({ error: "Forbidden: not your department" }, { status: 403 });
    }
  }

  const { rawKey, prefix } = generateApiKey();
  const keyHash = hashApiKey(rawKey);

  const apiKey = await prisma.apiKey.create({
    data: {
      companyId: session.user.companyId,
      userId: session.user.id,
      departmentId,
      name,
      keyHash,
      keyPrefix: prefix,
    },
  });

  return NextResponse.json({
    id: apiKey.id,
    name: apiKey.name,
    keyPrefix: apiKey.keyPrefix,
    rawKey,
    departmentId: apiKey.departmentId,
    expiresAt: apiKey.expiresAt?.toISOString() ?? null,
    createdAt: apiKey.createdAt.toISOString(),
    message: "Store the rawKey securely; it will not be shown again.",
  });
}
