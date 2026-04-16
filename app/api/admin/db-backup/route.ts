import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { runFullDbBackup, createBackupRecord } from "@/lib/db-backup";

export const maxDuration = 300;

/**
 * POST: Trigger full DB backup (all databases → gzip → Bunny CDN).
 * Allowed: Super Admin session, or cron with X-Backup-Secret = BACKUP_CRON_SECRET.
 */
export async function POST(req: Request) {
  const cronSecret = req.headers.get("X-Backup-Secret");
  const backupCronSecret = process.env.BACKUP_CRON_SECRET;

  const allowedByCron = Boolean(backupCronSecret && cronSecret === backupCronSecret);
  if (!allowedByCron) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const recordResult = await createBackupRecord();
  if ("error" in recordResult) {
    return NextResponse.json({ ok: false, error: recordResult.error }, { status: 500 });
  }

  runFullDbBackup({ existingRecordId: recordResult.id }).catch(() => {});

  return NextResponse.json(
    { ok: true, id: recordResult.id, message: "Backup started. Refresh the list to see status." },
    { status: 202 }
  );
}
