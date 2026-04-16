import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET: List users of a company (id, name, email). Super Admin only.
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
    select: { id: true },
  });
  if (!company) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  const users = await prisma.user.findMany({
    where: { companyId: id, isActive: true },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ users });
}
