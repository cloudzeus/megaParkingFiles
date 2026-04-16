import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { cancelBackup } from "@/lib/db-backup";

/**
 * POST: Cancel a running backup. Super Admin only.
 * Body: { id: number }
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { id?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const id = body.id != null ? Number(body.id) : NaN;
  if (Number.isNaN(id) || id < 1) {
    return NextResponse.json({ error: "Invalid backup id" }, { status: 400 });
  }

  const result = await cancelBackup(id);
  if (result.ok) {
    return NextResponse.json({ ok: true, message: "Backup cancelled" });
  }
  return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
}
