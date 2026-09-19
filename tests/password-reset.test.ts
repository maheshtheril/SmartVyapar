import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildPasswordResetEmailHtml, sendEmail } from "../src/lib/mail";
import { RESET_TOKEN_EXPIRY_MINUTES, verifyResetToken } from "../src/lib/password-reset";

describe("Password Reset & Account Recovery Suite", () => {
  it("should format a responsive HTML email with correct reset link and recipient name", () => {
    const html = buildPasswordResetEmailHtml({
      userName: "Mahesh Store",
      resetUrl: "https://smartvyapar.vercel.app/reset-password?token=abcdef1234567890abcdef1234567890",
      expiresInMinutes: RESET_TOKEN_EXPIRY_MINUTES,
    });

    assert.ok(html.includes("Mahesh Store"), "Email must contain recipient name");
    assert.ok(html.includes("https://smartvyapar.vercel.app/reset-password?token=abcdef1234567890abcdef1234567890"), "Email must contain reset URL");
    assert.ok(html.includes("15 minutes"), "Email must mention 15-minute expiration");
    assert.ok(html.includes("Reset Password"), "Email must have CTA button text");
  });

  it("should safely send email in simulation mode without failing or requiring API keys", async () => {
    const result = await sendEmail({
      to: "merchant@example.com",
      subject: "Test Reset",
      html: "<p>Hello</p>",
      text: "Hello",
    });

    assert.strictEqual(result.success, true);
    assert.ok(result.messageId, "Must return a message ID");
  });

  it("should reject token verification for empty, null, or short tokens", async () => {
    const emptyResult = await verifyResetToken("");
    assert.strictEqual(emptyResult.valid, false);
    assert.strictEqual(emptyResult.error, "Invalid reset token format.");

    const shortResult = await verifyResetToken("abc-too-short");
    assert.strictEqual(shortResult.valid, false);
    assert.strictEqual(shortResult.error, "Invalid reset token format.");
  });

  it("should reject token verification when token is not found in database", async () => {
    const randomHex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const nonExistentResult = await verifyResetToken(randomHex);
    assert.strictEqual(nonExistentResult.valid, false);
    assert.ok(
      nonExistentResult.error?.includes("invalid or has expired") ||
        nonExistentResult.error?.includes("Unable to verify"),
      "Must reject with invalid or transient error"
    );
  });

  it("should have RESET_TOKEN_EXPIRY_MINUTES set to 15 minutes", () => {
    assert.strictEqual(RESET_TOKEN_EXPIRY_MINUTES, 15);
  });
});
