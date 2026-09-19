import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import os from "os";
import {
  calculateSha256,
  compressData,
  decompressData,
  encryptBuffer,
  decryptBuffer,
  verifyBackupIntegrity,
  pruneBackups,
  type BackupManifest,
} from "../src/lib/backup";

describe("Database Backup & Disaster Recovery Engine", () => {
  const samplePayload = {
    metadata: { version: "1.0", environment: "test" },
    tables: {
      tenants: [{ id: "t-1", businessName: "Test Enterprise" }],
      users: [{ id: "u-1", name: "Admin User", role: "OWNER" }],
      products: [
        { id: "p-1", name: "Copper Cable 1.5mm", currentStock: "100.000" },
        { id: "p-2", name: "Modular Switch 6A", currentStock: "50.000" },
      ],
      invoices: [{ id: "inv-1", invoiceNumber: "INV-2627-0001", totalAmount: "1450.00" }],
    },
  };

  it("should compress and decompress data losslessly using Gzip", () => {
    const compressed = compressData(samplePayload);
    assert.ok(compressed instanceof Buffer, "Compressed result must be a Buffer");
    assert.ok(compressed.length > 0, "Compressed buffer must not be empty");

    const decompressed = decompressData<typeof samplePayload>(compressed);
    assert.deepStrictEqual(decompressed, samplePayload, "Decompressed object must match original payload");
  });

  it("should encrypt and decrypt snapshot archives using AES-256-GCM", () => {
    const secretKey = "SuperSecretDisasterRecoveryKey2026";
    const compressed = compressData(samplePayload);

    const encrypted = encryptBuffer(compressed, secretKey);
    assert.ok(encrypted.length > compressed.length, "Encrypted payload must contain IV and AuthTag overhead");
    assert.notDeepStrictEqual(encrypted, compressed, "Ciphertext must not match plaintext");

    // Decrypt with correct key
    const decrypted = decryptBuffer(encrypted, secretKey);
    assert.deepStrictEqual(decrypted, compressed, "Decrypted buffer must match original compressed buffer");

    const parsed = decompressData<typeof samplePayload>(decrypted);
    assert.deepStrictEqual(parsed, samplePayload);

    // Decrypt with incorrect key must fail
    assert.throws(
      () => decryptBuffer(encrypted, "WrongPassphrase123"),
      /Unsupported state or unable to authenticate data|bad decrypt/i,
      "Decryption with incorrect key must throw authentication error"
    );
  });

  it("should compute accurate SHA-256 checksums and verify integrity", () => {
    const buffer = Buffer.from("SmartVyapar statutory immutable ledger test data");
    const hash = calculateSha256(buffer);
    assert.strictEqual(typeof hash, "string");
    assert.strictEqual(hash.length, 64, "SHA-256 hash must be 64 hex characters");

    const manifest: BackupManifest = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      environment: "test",
      totalRecords: 10,
      tables: { tenants: 1, products: 9 },
      archiveFile: "test_archive.json.gz",
      archiveSha256: hash,
      archiveSizeBytes: buffer.length,
      isEncrypted: false,
    };

    const validResult = verifyBackupIntegrity(buffer, manifest);
    assert.strictEqual(validResult.valid, true, "Untampered buffer must pass integrity check");

    // Tampered buffer
    const tamperedBuffer = Buffer.from("Tampered corrupted data");
    const invalidResult = verifyBackupIntegrity(tamperedBuffer, manifest);
    assert.strictEqual(invalidResult.valid, false, "Tampered buffer must fail integrity check");
    assert.ok(invalidResult.error?.includes("Checksum mismatch"), "Error must report checksum mismatch");
  });

  it("should enforce retention policy by pruning old backups beyond threshold", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sv_backup_test_"));

    try {
      // Create 5 dummy archives with distinct mtimes
      const files: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const filename = `backup_00${i}.json.gz`;
        const filePath = path.join(tempDir, filename);
        fs.writeFileSync(filePath, `dummy content ${i}`);
        // Set artificial mtime
        const mtime = new Date(Date.now() - (6 - i) * 60000);
        fs.utimesSync(filePath, mtime, mtime);
        files.push(filename);
      }

      // Retain max 3
      const { kept, pruned } = pruneBackups(tempDir, 3);
      assert.strictEqual(kept.length, 3, "Must retain exactly 3 backups");
      assert.strictEqual(pruned.length, 2, "Must prune exactly 2 older backups");

      // Verify files on disk
      const remainingFiles = fs.readdirSync(tempDir);
      assert.strictEqual(remainingFiles.length, 3);
      assert.ok(remainingFiles.includes("backup_005.json.gz"), "Newest backup must be kept");
      assert.ok(remainingFiles.includes("backup_004.json.gz"));
      assert.ok(remainingFiles.includes("backup_003.json.gz"));
      assert.strictEqual(remainingFiles.includes("backup_001.json.gz"), false, "Oldest backup must be deleted");
    } finally {
      // Clean up temp dir
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
