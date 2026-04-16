import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const id = Number((await params).id);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const apiKey = await prisma.apiKey.findUnique({
    where: { id },
    select: { id: true, userId: true, companyId: true, departmentId: true },
  });

  if (!apiKey || apiKey.companyId !== session.user.companyId) {
    return NextResponse.json({ error: "API key not found" }, { status: 404 });
  }

  const canRevoke =
    session.user.role === "SUPER_ADMIN" ||
    session.user.role === "COMPANY_ADMIN" ||
    apiKey.userId === session.user.id ||
    (session.user.role === "DEPARTMENT_MANAGER" &&
      apiKey.departmentId === session.user.departmentId);

  if (!canRevoke) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.apiKey.delete({ where: { id } });

  return NextResponse.json({ ok: true, message: "API key revoked" });
}
