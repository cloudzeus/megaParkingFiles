import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * GET: List DB backup records. Super Admin only.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const backups = await prisma.dbBackup.findMany({
    orderBy: { startedAt: "desc" },
    take: 100,
  });

  return NextResponse.json({ backups });
}
