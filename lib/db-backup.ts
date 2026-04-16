/**
 * DB backup: mysqldump --all-databases, gzip, upload to Bunny CDN.
 * --routines/--triggers omitted to avoid INFORMATION_SCHEMA.LIBRARIES errors on MariaDB/some MySQL.
 * Password via MYSQL_PWD only to avoid "password on command line" warning.
 */
import { spawn } from "child_process";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";
import { Writable } from "stream";
import { uploadFile } from "./bunny";
import { prisma } from "@/lib/prisma";
import type { DbBackupStatus } from "@prisma/client";

const MAX_BACKUP_BYTES = 4 * 1024 * 1024 * 1024; // 4 GB

const activeBackups = new Map<number, { kill: () => void }>();

export type DbBackupResult =
  | { ok: true; id: number; path: string; sizeBytes: number }
  | { ok: false; error: string };

function parseDatabaseUrl(url: string): { host: string; port: number; user: string; password: string; database: string } | null {
  try {
    const u = new URL(url);
    if (u.protocol !== "mysql:") return null;
    const host = u.hostname || "localhost";
    const port = u.port ? parseInt(u.port, 10) : 3306;
    const user = u.username || "root";
    const password = u.password ? decodeURIComponent(u.password) : "";
    const database = (u.pathname || "").replace(/^\/+/, "") || "mysql";
    return { host, port, user, password, database };
  } catch {
    return null;
  }
}

/**
 * Run mysqldump --all-databases (no routines/triggers to avoid LIBRARIES error), gzip, upload to Bunny.
 * If existingRecordId is set, use that RUNNING record (for background API runs).
 */
export async function runFullDbBackup(opts?: { existingRecordId: number }): Promise<DbBackupResult> {
  const url = process.env.DATABASE_URL;
  if (!url) return { ok: false, error: "DATABASE_URL not set" };

  const parsed = parseDatabaseUrl(url);
  if (!parsed) return { ok: false, error: "Invalid DATABASE_URL" };

  const now = new Date();
  const dateStr = now.toISOString().slice(0, 19).replace(/[-:T]/g, "-").replace("--", "-");
  const filename = `all-databases-${dateStr}.sql.gz`;
  const bunnyPath = `db-backups/${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}/${filename}`;

  let record: { id: number }; let pathToUse: string;
  if (opts?.existingRecordId) {
    const existing = await prisma.dbBackup.findUnique({
      where: { id: opts.existingRecordId },
      select: { id: true, bunnyStoragePath: true, status: true },
    });
    if (!existing || existing.status !== "RUNNING") {
      return { ok: false, error: "Backup record not found or not RUNNING" };
    }
    record = { id: existing.id };
    pathToUse = existing.bunnyStoragePath;
  } else {
    const created = await prisma.dbBackup.create({
      data: { filename, bunnyStoragePath: bunnyPath, sizeBytes: 0, status: "RUNNING" },
    });
    record = { id: created.id };
    pathToUse = bunnyPath;
  }

  try {
    const chunks: Buffer[] = [];
    let totalSize = 0;

    const mysqldump = spawn("mysqldump", [
      `--host=${parsed.host}`,
      `--port=${String(parsed.port)}`,
      `--user=${parsed.user}`,
      "--single-transaction",
      "--all-databases",
    ], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, MYSQL_PWD: parsed.password },
    });

    activeBackups.set(record.id, { kill: () => mysqldump.kill("SIGTERM") });

    let stderr = "";
    mysqldump.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });

    const exitPromise = new Promise<number | null>((resolve) => {
      mysqldump.on("close", (code) => resolve(code));
      mysqldump.on("error", () => resolve(-1));
    });

    const collectStream = new Writable({
      write(chunk: Buffer, _enc, cb) {
        totalSize += chunk.length;
        if (totalSize > MAX_BACKUP_BYTES) {
          mysqldump.kill("SIGKILL");
          cb(new Error(`Backup size exceeds limit (${MAX_BACKUP_BYTES / 1024 / 1024} MB)`));
          return;
        }
        chunks.push(chunk);
        cb();
      },
    });

    await pipeline(mysqldump.stdout!, createGzip(), collectStream);

    const exitCode = await exitPromise;
    if (exitCode !== 0) {
      throw new Error(stderr || `mysqldump exited with code ${exitCode}`);
    }

    const buffer = Buffer.concat(chunks);
    const uploadResult = await uploadFile(pathToUse, buffer, "application/gzip");
    if (!uploadResult.ok) {
      throw new Error(uploadResult.error);
    }

    await prisma.dbBackup.update({
      where: { id: record.id },
      data: {
        sizeBytes: buffer.length,
        status: "COMPLETED" as DbBackupStatus,
        completedAt: new Date(),
      },
    });

    activeBackups.delete(record.id);
    return { ok: true, id: record.id, path: pathToUse, sizeBytes: buffer.length };
  } catch (e) {
    activeBackups.delete(record.id);
    const message = e instanceof Error ? e.message : String(e);
    await prisma.dbBackup.updateMany({
      where: { id: record.id, status: "RUNNING" },
      data: {
        sizeBytes: 0,
        status: "FAILED" as DbBackupStatus,
        errorMessage: message.slice(0, 2000),
        completedAt: new Date(),
      },
    });
    return { ok: false, error: message };
  }
}

/** Cancel a running backup by record id. Returns true if cancelled, false if not found or not running. */
export async function cancelBackup(recordId: number): Promise<{ ok: true } | { ok: false; error: string }> {
  const entry = activeBackups.get(recordId);
  if (!entry) {
    const record = await prisma.dbBackup.findUnique({
      where: { id: recordId },
      select: { status: true },
    });
    if (record?.status === "RUNNING") {
      await prisma.dbBackup.update({
        where: { id: recordId },
        data: {
          status: "FAILED" as DbBackupStatus,
          errorMessage: "Cancelled by user (process not found)",
          completedAt: new Date(),
        },
      });
      return { ok: true };
    }
    return { ok: false, error: "Backup not found or not running" };
  }
  entry.kill();
  activeBackups.delete(recordId);
  await prisma.dbBackup.update({
    where: { id: recordId },
    data: {
      status: "FAILED" as DbBackupStatus,
      errorMessage: "Cancelled by user",
      completedAt: new Date(),
    },
  });
  return { ok: true };
}

/** Create a RUNNING backup record for background run. */
export async function createBackupRecord(): Promise<{ id: number } | { error: string }> {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 19).replace(/[-:T]/g, "-").replace("--", "-");
  const filename = `all-databases-${dateStr}.sql.gz`;
  const bunnyPath = `db-backups/${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}/${filename}`;
  try {
    const record = await prisma.dbBackup.create({
      data: { filename, bunnyStoragePath: bunnyPath, sizeBytes: 0, status: "RUNNING" },
    });
    return { id: record.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return { error: message };
  }
}
