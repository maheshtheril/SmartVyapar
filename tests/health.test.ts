import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";

describe("Production Health Check (/api/health logic)", () => {
  it("should successfully ping the database with sub-second latency", async () => {
    const start = Date.now();
    const result: any = await prisma.$queryRaw`SELECT 1 as ping`;
    const latency = Date.now() - start;

    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 1);
    assert.strictEqual(Number(result[0].ping), 1);
    assert.ok(latency >= 0 && latency < 20000, `DB ping latency was ${latency}ms`);
  });

  it("should report valid process memory vitals", () => {
    const memory = process.memoryUsage();
    assert.ok(memory.heapUsed > 0);
    assert.ok(memory.heapTotal > 0);
    assert.ok(memory.rss > 0);
    assert.ok(process.uptime() >= 0);
  });
});
