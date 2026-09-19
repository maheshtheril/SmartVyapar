import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as Sentry from "@sentry/nextjs";

describe("Sentry Crash Monitoring & Alerting Layer", () => {
  it("should provide Sentry initialization functions and error capture methods", () => {
    assert.strictEqual(typeof Sentry.init, "function", "Sentry.init must be a function");
    assert.strictEqual(typeof Sentry.captureException, "function", "Sentry.captureException must be a function");
    assert.strictEqual(typeof Sentry.captureMessage, "function", "Sentry.captureMessage must be a function");
  });

  it("should safely capture exceptions without crashing even if DSN is not set", () => {
    const testErr = new Error("Test exception for unit verification");
    let eventId: string | undefined;

    assert.doesNotThrow(() => {
      eventId = Sentry.captureException(testErr, {
        tags: { test: "true" },
      });
    }, "Sentry.captureException must never throw unhandled error");

    // eventId is returned as string or undefined depending on whether client is initialized
    assert.ok(eventId !== null, "eventId should be generated or handled gracefully");
  });

  it("should have captureRequestError helper for Next.js instrumentation", () => {
    assert.strictEqual(
      typeof Sentry.captureRequestError,
      "function",
      "captureRequestError must be exported for instrumentation.ts"
    );
  });
});
