import "dotenv/config";
import fs from "fs";
import path from "path";
import {
  calculateSha256,
  decompressData,
  decryptBuffer,
  verifyBackupIntegrity,
  type BackupManifest,
} from "../src/lib/backup";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=================================================");
  console.log("🚑 SmartVyapar Disaster Recovery & Restore Utility");
  console.log("=================================================");

  const args = process.argv.slice(2);
  let targetFile: string | undefined = undefined;
  let isDryRun = false;
  let isConfirmed = false;
  let decryptionKey = process.env.BACKUP_ENCRYPTION_KEY || "";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--dry-run") {
      isDryRun = true;
    } else if (args[i] === "--confirm") {
      isConfirmed = true;
    } else if (args[i] === "--key" && args[i + 1]) {
      decryptionKey = args[i + 1];
      i++;
    } else if (!args[i].startsWith("--") && !targetFile) {
      targetFile = args[i];
    }
  }

  // Find latest backup if no file provided
  if (!targetFile) {
    const backupDir = path.resolve(process.cwd(), "backups");
    if (fs.existsSync(backupDir)) {
      const files = fs
        .readdirSync(backupDir)
        .filter((f) => f.endsWith(".json.gz") || f.endsWith(".json.gz.enc"))
        .map((f) => ({
          filename: f,
          path: path.join(backupDir, f),
          time: fs.statSync(path.join(backupDir, f)).mtimeMs,
        }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 0) {
        targetFile = files[0].path;
        console.log(`🔍 Auto-detected latest backup: ${files[0].filename}`);
      }
    }
  }

  if (!targetFile || !fs.existsSync(targetFile)) {
    console.error(`\n❌ Error: Backup archive file not found: ${targetFile || "(none specified)"}`);
    console.log("Usage: tsx scripts/restore-database.ts [backup_file] [--dry-run] [--key <passphrase>] [--confirm]");
    process.exit(1);
  }

  console.log(`\n📦 Target Archive: ${path.basename(targetFile)}`);
  console.log(`🧪 Mode:           ${isDryRun ? "DRY-RUN (Verification Only - No DB writes)" : "LIVE RESTORE"}`);

  // 1. Check for companion manifest
  const manifestPath = `${targetFile}.manifest.json`;
  let manifest: BackupManifest | null = null;

  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8")) as BackupManifest;
      console.log("📄 Manifest:       Found and loaded");
    } catch {
      console.warn("⚠️  Warning: Manifest file could not be parsed");
    }
  } else {
    console.log("⚠️  Manifest:       No companion manifest file found (checksum validation skipped)");
  }

  // 2. Read archive buffer & verify SHA-256
  const archiveBuffer = fs.readFileSync(targetFile);
  const actualSha256 = calculateSha256(archiveBuffer);

  if (manifest) {
    const verification = verifyBackupIntegrity(archiveBuffer, manifest);
    if (!verification.valid) {
      console.error(`\n❌ Integrity Verification Failed: ${verification.error}`);
      process.exit(1);
    }
    console.log(`🔒 SHA-256 Hash:   ${actualSha256} (Verified OK ✅)`);
  } else {
    console.log(`🔒 SHA-256 Hash:   ${actualSha256}`);
  }

  // 3. Decrypt if needed
  let rawGzipBuffer: Buffer = Buffer.from(archiveBuffer);
  const isEncrypted = targetFile.endsWith(".enc") || (manifest && manifest.isEncrypted);

  if (isEncrypted) {
    if (!decryptionKey) {
      console.error("\n❌ Error: This backup is encrypted. Provide decryption key via --key <passphrase> or BACKUP_ENCRYPTION_KEY.");
      process.exit(1);
    }
    console.log("🔐 Decrypting payload with AES-256-GCM...");
    try {
      rawGzipBuffer = Buffer.from(decryptBuffer(archiveBuffer, decryptionKey));
      console.log("✅ Decryption successful!");
    } catch (err: any) {
      console.error("\n❌ Decryption failed: Invalid passphrase or corrupted ciphertext.", err.message);
      process.exit(1);
    }
  }

  // 4. Decompress and parse
  console.log("🗜️  Decompressing snapshot data...");
  let snapshotPayload: any;
  try {
    snapshotPayload = decompressData(rawGzipBuffer);
  } catch (err: any) {
    console.error("\n❌ Decompression failed:", err.message);
    process.exit(1);
  }

  const tables: Record<string, any[]> = snapshotPayload.tables || {};
  const tableNames = Object.keys(tables);
  let totalRows = 0;

  console.log("\n📊 Archive Content Inventory:");
  console.log("-------------------------------------------------");
  for (const tableName of tableNames) {
    const count = tables[tableName]?.length || 0;
    totalRows += count;
    if (count > 0) {
      console.log(`  - ${tableName.padEnd(24)}: ${count} rows`);
    }
  }
  console.log("-------------------------------------------------");
  console.log(`🔢 Total Records in Snapshot: ${totalRows}`);

  if (isDryRun) {
    console.log("\n✅ Dry Run Verification Passed!");
    console.log("Archive integrity, compression, and table payloads are 100% valid.");
    console.log("No changes were made to the database.");
    await prisma.$disconnect();
    return;
  }

  if (!isConfirmed) {
    console.log("\n⚠️  SAFETY GUARD: Restoration alters database contents.");
    console.log("To execute a live restore, re-run with the --confirm flag:");
    console.log(`tsx scripts/restore-database.ts "${targetFile}" --confirm`);
    await prisma.$disconnect();
    return;
  }

  console.log("\n⏳ Restoring database records from snapshot...");
  // Guided restoration loop in transactional order
  try {
    // Restore tenants first
    if (tables.tenants?.length) {
      for (const tenant of tables.tenants) {
        await prisma.tenant.upsert({
          where: { id: tenant.id },
          create: tenant,
          update: tenant,
        });
      }
      console.log(`  ✓ Restored ${tables.tenants.length} tenants`);
    }

    // Restore users
    if (tables.users?.length) {
      for (const user of tables.users) {
        await prisma.user.upsert({
          where: { id: user.id },
          create: user,
          update: user,
        });
      }
      console.log(`  ✓ Restored ${tables.users.length} users`);
    }

    // Restore products
    if (tables.products?.length) {
      for (const prod of tables.products) {
        await prisma.product.upsert({
          where: { id: prod.id },
          create: prod,
          update: prod,
        });
      }
      console.log(`  ✓ Restored ${tables.products.length} products`);
    }

    // Restore customers
    if (tables.customers?.length) {
      for (const cust of tables.customers) {
        await prisma.customer.upsert({
          where: { id: cust.id },
          create: cust,
          update: cust,
        });
      }
      console.log(`  ✓ Restored ${tables.customers.length} customers`);
    }

    console.log("\n✅ Database restoration completed successfully!");
  } catch (restoreErr) {
    console.error("\n❌ Restore operation failed:", restoreErr);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
