import "dotenv/config";
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

async function run() {
  const rawUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!rawUrl) {
    console.error("No DATABASE_URL or DIRECT_URL found in .env");
    process.exit(1);
  }

  // Parse and remove pgbouncer query param for pg_dump compatibility
  const parsed = new URL(rawUrl);
  parsed.searchParams.delete("pgbouncer");
  // Ensure we don't connect to pooler host if DIRECT_URL wasn't used
  if (parsed.hostname.includes("-pooler")) {
    parsed.hostname = parsed.hostname.replace("-pooler", "");
  }
  const cleanUrl = parsed.toString();

  const backupsDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const sqlFile = path.resolve(backupsDir, "smartvyapar_backup_2026-10-16.sql");
  console.log("Running pg_dump on direct Neon PostgreSQL connection...");
  console.log("Output file:", sqlFile);

  try {
    execSync(`pg_dump "${cleanUrl}" -F p --no-owner --no-acl -f "${sqlFile}"`, { stdio: "inherit" });
    const stats = fs.statSync(sqlFile);
    console.log(`\n✅ Raw SQL Backup (.sql) created successfully!`);
    console.log(`File: ${sqlFile}`);
    console.log(`Size: ${(stats.size / 1024).toFixed(2)} KB (${stats.size} bytes)`);
  } catch (err) {
    console.error("pg_dump failed:", err);
    process.exit(1);
  }
}

run();
