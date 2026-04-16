import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { clearDefaultCompanyCache } from "@/lib/default-company";

/**
 * GET: List all companies. Super Admin only.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const companies = await prisma.company.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      isDefault: true,
      country: true,
      address: true,
      afm: true,
      activity: true,
      bunnyStorageZoneName: true,
      defaultDataRetentionPolicyId: true,
      _count: {
        select: { users: true, departments: true, files: true, folders: true },
      },
    },
  });

  return NextResponse.json({ companies });
}

/**
 * POST: Create a new company. Super Admin only.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = body.name?.trim();
  const slug = body.slug?.trim().toLowerCase().replace(/\s+/g, "-");

  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required" }, { status: 400 });
  }

  const existing = await prisma.company.findUnique({ where: { slug } });
  if (existing) {
    return NextResponse.json({ error: "A company with this slug already exists" }, { status: 409 });
  }

  if (body.afm) {
    const afmExists = await prisma.company.findUnique({ where: { afm: body.afm.trim() } });
    if (afmExists) {
      return NextResponse.json({ error: "A company with this AFM already exists" }, { status: 409 });
    }
  }

  if (body.isDefault) {
    await prisma.company.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
    clearDefaultCompanyCache();
  }

  const company = await prisma.company.create({
    data: {
      name,
      slug,
      country: body.country?.trim() || null,
      address: body.address?.trim() || null,
      afm: body.afm?.trim() || null,
      activity: body.activity?.trim() || null,
      isDefault: body.isDefault ?? false,
      bunnyStorageZoneName: body.bunnyStorageZoneName?.trim() || null,
    },
    include: {
      _count: { select: { users: true, departments: true, files: true, folders: true } },
    },
  });

  return NextResponse.json({ company }, { status: 201 });
}
