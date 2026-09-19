import "dotenv/config";
import fs from "fs";
import path from "path";
import { createDatabaseSnapshot, pruneBackups } from "../src/lib/backup";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=================================================");
  console.log("📦 SmartVyapar Automated Database Backup Utility");
  console.log("=================================================");

  const args = process.argv.slice(2);
  let backupDir = path.resolve(process.cwd(), "backups");
  let retentionCount = 7;
  let encryptionKey = process.env.BACKUP_ENCRYPTION_KEY || "";
  let tenantId: string | undefined = undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dir" && args[i + 1]) {
      backupDir = path.resolve(process.cwd(), args[i + 1]);
      i++;
    } else if (args[i] === "--retention" && args[i + 1]) {
      retentionCount = parseInt(args[i + 1], 10) || 7;
      i++;
    } else if (args[i] === "--key" && args[i + 1]) {
      encryptionKey = args[i + 1];
      i++;
    } else if (args[i] === "--tenant" && args[i + 1]) {
      tenantId = args[i + 1];
      i++;
    }
  }

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  console.log(`\n📁 Target Directory: ${backupDir}`);
  console.log(`🔐 Encryption:       ${encryptionKey ? "Enabled (AES-256-GCM)" : "Disabled"}`);
  console.log(`⏳ Retention Limit:  ${retentionCount} backups`);
  if (tenantId) console.log(`🏢 Tenant Filter:    ${tenantId}`);

  console.log("\n⏳ Fetching and compressing database snapshot from Neon PostgreSQL...");
  const startTime = Date.now();

  try {
    const { manifest, archiveBuffer } = await createDatabaseSnapshot({
      tenantId,
      encryptionKey: encryptionKey || undefined,
      filenamePrefix: tenantId ? `tenant_${tenantId.slice(0, 8)}_backup` : "smartvyapar_db",
    });

    const archivePath = path.join(backupDir, manifest.archiveFile);
    const manifestPath = path.join(backupDir, `${manifest.archiveFile}.manifest.json`);

    fs.writeFileSync(archivePath, archiveBuffer);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    const sizeKb = (manifest.archiveSizeBytes / 1024).toFixed(2);

    console.log("\n✅ Backup Completed Successfully!");
    console.log("-------------------------------------------------");
    console.log(`📦 Archive File:      ${manifest.archiveFile}`);
    console.log(`📊 Total Records:     ${manifest.totalRecords}`);
    console.log(`💾 Compressed Size:   ${sizeKb} KB`);
    console.log(`⏱️  Duration:          ${duration}s`);
    console.log(`🔒 SHA-256 Checksum:  ${manifest.archiveSha256}`);
    console.log("-------------------------------------------------");

    console.log("\n📋 Table Record Breakdown:");
    for (const [table, count] of Object.entries(manifest.tables)) {
      if (count > 0) {
        console.log(`  - ${table.padEnd(24)}: ${count} rows`);
      }
    }

    // Prune old backups
    const { kept, pruned } = pruneBackups(backupDir, retentionCount);
    if (pruned.length > 0) {
      console.log(`\n🧹 Retention Pruning: Removed ${pruned.length} older backup(s):`);
      pruned.forEach((f) => console.log(`  - ${f}`));
    }
    console.log(`💾 Active Backups Retained: ${kept.length}`);

    console.log("\n=================================================");
  } catch (error) {
    console.error("\n❌ Backup Failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
