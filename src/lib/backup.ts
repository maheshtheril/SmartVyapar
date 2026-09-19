import { prisma } from "@/lib/prisma";
import zlib from "zlib";
import crypto from "crypto";
import fs from "fs";
import path from "path";

export interface BackupManifest {
  version: string;
  timestamp: string;
  environment: string;
  totalRecords: number;
  tables: Record<string, number>;
  archiveFile: string;
  archiveSha256: string;
  archiveSizeBytes: number;
  isEncrypted: boolean;
}

export interface BackupResult {
  manifest: BackupManifest;
  archiveBuffer: Buffer;
}

/**
 * Derives a 32-byte AES key from a passphrase using SHA-256.
 */
function deriveKey(passphrase: string): Buffer {
  return crypto.createHash("sha256").update(passphrase).digest();
}

/**
 * Calculates SHA-256 checksum of a buffer.
 */
export function calculateSha256(buffer: Buffer): string {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

/**
 * Compresses any JS object/data into a Gzip Buffer.
 */
export function compressData(data: unknown): Buffer {
  const jsonStr = JSON.stringify(data);
  return zlib.gzipSync(Buffer.from(jsonStr, "utf8"), { level: 9 });
}

/**
 * Decompresses a Gzip buffer back to a JS object.
 */
export function decompressData<T = unknown>(buffer: zlib.InputType): T {
  const decompressed = zlib.gunzipSync(buffer);
  return JSON.parse(decompressed.toString("utf8")) as T;
}

/**
 * Encrypts a buffer using AES-256-GCM.
 * Output format: [16-byte IV][16-byte AuthTag][EncryptedPayload]
 */
export function encryptBuffer(buffer: Buffer, passphrase: string): Buffer {
  const key = deriveKey(passphrase);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([iv, authTag, encrypted]);
}

/**
 * Decrypts an AES-256-GCM buffer created by encryptBuffer.
 */
export function decryptBuffer(buffer: Buffer, passphrase: string): Buffer {
  if (buffer.length < 32) {
    throw new Error("Invalid encrypted buffer: too short to contain IV and AuthTag");
  }

  const key = deriveKey(passphrase);
  const iv = buffer.subarray(0, 16);
  const authTag = buffer.subarray(16, 32);
  const ciphertext = buffer.subarray(32);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Queries all PostgreSQL tables and builds a serializable multi-tenant snapshot.
 */
export async function exportDatabaseData(filterTenantId?: string): Promise<{
  data: Record<string, unknown[]>;
  recordCounts: Record<string, number>;
  totalRecords: number;
}> {
  const tenantWhere = filterTenantId ? { tenantId: filterTenantId } : undefined;
  const directTenantWhere = filterTenantId ? { id: filterTenantId } : undefined;

  const [
    tenants,
    users,
    products,
    recipeItems,
    stockLogs,
    customers,
    invoices,
    invoiceItems,
    purchaseBills,
    purchaseBillItems,
    accounts,
    batches,
    restaurantTables,
    kitchenOrderTickets,
    kotItems,
    invoiceSequences,
    creditNotes,
    creditNoteItems,
    auditLogs,
    printTemplates,
    passwordResetTokens,
    subscriptionPayments,
  ] = await Promise.all([
    prisma.tenant.findMany({ where: directTenantWhere }),
    prisma.user.findMany({ where: tenantWhere }),
    prisma.product.findMany({ where: tenantWhere }),
    prisma.recipeItem.findMany({ where: tenantWhere }),
    prisma.stockLog.findMany({ where: tenantWhere }),
    prisma.customer.findMany({ where: tenantWhere }),
    prisma.invoice.findMany({ where: tenantWhere }),
    filterTenantId
      ? prisma.invoiceItem.findMany({
          where: { invoice: { tenantId: filterTenantId } },
        })
      : prisma.invoiceItem.findMany(),
    prisma.purchaseBill.findMany({ where: tenantWhere }),
    filterTenantId
      ? prisma.purchaseBillItem.findMany({
          where: { purchaseBill: { tenantId: filterTenantId } },
        })
      : prisma.purchaseBillItem.findMany(),
    prisma.account.findMany({ where: tenantWhere }),
    prisma.batch.findMany({ where: tenantWhere }),
    prisma.restaurantTable.findMany({ where: tenantWhere }),
    prisma.kitchenOrderTicket.findMany({ where: tenantWhere }),
    filterTenantId
      ? prisma.kotItem.findMany({
          where: { kot: { tenantId: filterTenantId } },
        })
      : prisma.kotItem.findMany(),
    prisma.invoiceSequence.findMany({ where: tenantWhere }),
    prisma.creditNote.findMany({ where: tenantWhere }),
    filterTenantId
      ? prisma.creditNoteItem.findMany({
          where: { creditNote: { tenantId: filterTenantId } },
        })
      : prisma.creditNoteItem.findMany(),
    prisma.auditLog.findMany({ where: tenantWhere }),
    prisma.printTemplate.findMany({ where: tenantWhere }),
    filterTenantId
      ? prisma.passwordResetToken.findMany({
          where: { user: { tenantId: filterTenantId } },
        })
      : prisma.passwordResetToken.findMany(),
    prisma.subscriptionPayment.findMany({ where: tenantWhere }),
  ]);

  const data: Record<string, unknown[]> = {
    tenants,
    users,
    products,
    recipeItems,
    stockLogs,
    customers,
    invoices,
    invoiceItems,
    purchaseBills,
    purchaseBillItems,
    accounts,
    batches,
    restaurantTables,
    kitchenOrderTickets,
    kotItems,
    invoiceSequences,
    creditNotes,
    creditNoteItems,
    auditLogs,
    printTemplates,
    passwordResetTokens,
    subscriptionPayments,
  };

  const recordCounts: Record<string, number> = {};
  let totalRecords = 0;

  for (const [table, rows] of Object.entries(data)) {
    recordCounts[table] = rows.length;
    totalRecords += rows.length;
  }

  return { data, recordCounts, totalRecords };
}

/**
 * Creates a complete database snapshot, compresses it, optionally encrypts it,
 * and compiles the SHA-256 checksum manifest.
 */
export async function createDatabaseSnapshot(options: {
  tenantId?: string;
  encryptionKey?: string;
  filenamePrefix?: string;
}): Promise<BackupResult> {
  const { data, recordCounts, totalRecords } = await exportDatabaseData(options.tenantId);

  const timestamp = new Date().toISOString();
  const timestampFile = timestamp.replace(/[:.]/g, "-");
  const prefix = options.filenamePrefix || "smartvyapar_backup";
  const ext = options.encryptionKey ? "json.gz.enc" : "json.gz";
  const archiveFilename = `${prefix}_${timestampFile}.${ext}`;

  // 1. Compress
  let payloadBuffer = compressData({
    metadata: {
      exportedAt: timestamp,
      generator: "SmartVyapar Disaster Recovery v1.0",
      totalRecords,
      tables: recordCounts,
    },
    tables: data,
  });

  // 2. Encrypt if key provided
  const isEncrypted = Boolean(options.encryptionKey);
  if (options.encryptionKey) {
    payloadBuffer = encryptBuffer(payloadBuffer, options.encryptionKey);
  }

  // 3. Hash
  const archiveSha256 = calculateSha256(payloadBuffer);

  const manifest: BackupManifest = {
    version: "1.0",
    timestamp,
    environment: process.env.NODE_ENV || "production",
    totalRecords,
    tables: recordCounts,
    archiveFile: archiveFilename,
    archiveSha256,
    archiveSizeBytes: payloadBuffer.length,
    isEncrypted,
  };

  return {
    manifest,
    archiveBuffer: payloadBuffer,
  };
}

/**
 * Verifies backup file integrity against a manifest.
 */
export function verifyBackupIntegrity(
  archiveBuffer: Buffer,
  manifest: BackupManifest
): { valid: boolean; calculatedSha256: string; error?: string } {
  const calculatedSha256 = calculateSha256(archiveBuffer);
  if (calculatedSha256 !== manifest.archiveSha256) {
    return {
      valid: false,
      calculatedSha256,
      error: `Checksum mismatch! Expected ${manifest.archiveSha256} but got ${calculatedSha256}`,
    };
  }
  if (archiveBuffer.length !== manifest.archiveSizeBytes) {
    return {
      valid: false,
      calculatedSha256,
      error: `Size mismatch! Expected ${manifest.archiveSizeBytes} bytes but got ${archiveBuffer.length} bytes`,
    };
  }
  return { valid: true, calculatedSha256 };
}

/**
 * Prunes older backups in a directory, keeping the latest N backups.
 */
export function pruneBackups(
  backupDir: string,
  maxKeep = 7
): { kept: string[]; pruned: string[] } {
  if (!fs.existsSync(backupDir)) {
    return { kept: [], pruned: [] };
  }

  const files = fs.readdirSync(backupDir);
  // Find all archive files
  const archives = files
    .filter((f) => f.endsWith(".json.gz") || f.endsWith(".json.gz.enc") || f.endsWith(".dump"))
    .map((filename) => {
      const fullPath = path.join(backupDir, filename);
      const stat = fs.statSync(fullPath);
      return { filename, fullPath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs); // Newest first

  const kept: string[] = [];
  const pruned: string[] = [];

  archives.forEach((item, index) => {
    if (index < maxKeep) {
      kept.push(item.filename);
    } else {
      // Prune archive and any matching manifest
      try {
        fs.unlinkSync(item.fullPath);
        const manifestPath = path.join(backupDir, `${item.filename}.manifest.json`);
        if (fs.existsSync(manifestPath)) {
          fs.unlinkSync(manifestPath);
        }
        pruned.push(item.filename);
      } catch {
        // Ignore unlink error
      }
    }
  });

  return { kept, pruned };
}
