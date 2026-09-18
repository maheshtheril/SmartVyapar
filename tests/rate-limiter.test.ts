import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { checkRateLimit } from "../src/lib/rate-limiter";

describe("Sliding Window Rate Limiter (checkRateLimit)", () => {
  it("should allow requests up to the specified limit", () => {
    const key = `test-limit-${Date.now()}`;
    const limit = 3;

    const r1 = checkRateLimit(key, limit, 60_000);
    assert.strictEqual(r1.allowed, true);
    assert.strictEqual(r1.remaining, 2);

    const r2 = checkRateLimit(key, limit, 60_000);
    assert.strictEqual(r2.allowed, true);
    assert.strictEqual(r2.remaining, 1);

    const r3 = checkRateLimit(key, limit, 60_000);
    assert.strictEqual(r3.allowed, true);
    assert.strictEqual(r3.remaining, 0);
  });

  it("should reject the (limit + 1)-th request with allowed=false and positive resetInSeconds", () => {
    const key = `test-blocked-${Date.now()}`;
    const limit = 2;

    checkRateLimit(key, limit, 60_000);
    checkRateLimit(key, limit, 60_000);

    const blocked = checkRateLimit(key, limit, 60_000);
    assert.strictEqual(blocked.allowed, false);
    assert.strictEqual(blocked.remaining, 0);
    assert.ok(blocked.resetInSeconds > 0 && blocked.resetInSeconds <= 60);
  });

  it("should maintain isolated rate limits across different keys", () => {
    const keyA = `tenant-a-${Date.now()}`;
    const keyB = `tenant-b-${Date.now()}`;

    // Exhaust tenant A
    checkRateLimit(keyA, 1, 60_000);
    const blockedA = checkRateLimit(keyA, 1, 60_000);
    assert.strictEqual(blockedA.allowed, false);

    // Tenant B must be unaffected
    const allowedB = checkRateLimit(keyB, 1, 60_000);
    assert.strictEqual(allowedB.allowed, true);
    assert.strictEqual(allowedB.remaining, 0);
  });
});
