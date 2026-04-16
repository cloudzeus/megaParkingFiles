/**
 * Run full DB backup once (mysqldump → gzip → Bunny). Loads .env from cwd.
 * Usage: pnpm run db:backup   or   node --env-file=.env node_modules/.bin/tsx scripts/run-db-backup.ts
 */
import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const v = m[2].trim();
      process.env[m[1].trim()] = v.replace(/^["']|["']$/g, "");
    }
  }
}

loadEnv();

async function main() {
  const { runFullDbBackup } = await import("../lib/db-backup");
  console.log("Starting full DB backup (all databases)…");
  const result = await runFullDbBackup();
  if (result.ok) {
    console.log("Backup completed:", result.path, `(${Math.round(result.sizeBytes / 1024)} KB)`);
    process.exit(0);
  } else {
    console.error("Backup failed:", result.error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
