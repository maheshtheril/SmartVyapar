import { describe, it } from "node:test";
import assert from "node:assert/strict";
import crypto from "crypto";
import { SUBSCRIPTION_PLANS } from "../src/lib/subscription-plans";
import { createRazorpayOrder, verifyRazorpayPaymentSignature } from "../src/lib/razorpay";

describe("SaaS Subscription & Razorpay Engine", () => {
  it("should have correct pricing and limits for Starter Free Tier", () => {
    const freePlan = SUBSCRIPTION_PLANS.FREE;
    assert.strictEqual(freePlan.monthlyPrice, 0);
    assert.strictEqual(freePlan.annualPrice, 0);
    assert.strictEqual(freePlan.invoiceLimitPerMonth, 100, "Free plan capped at 100 invoices/month");
    assert.strictEqual(freePlan.userLimit, 1, "Free plan capped at 1 user seat");
  });

  it("should have correct pricing, paise conversion, and unlimited quotas for SmartVyapar Pro", () => {
    const proPlan = SUBSCRIPTION_PLANS.PRO;
    assert.strictEqual(proPlan.monthlyPrice, 499);
    assert.strictEqual(proPlan.monthlyPaise, 49900);
    assert.strictEqual(proPlan.annualPrice, 4999);
    assert.strictEqual(proPlan.annualPaise, 499900);
    assert.strictEqual(proPlan.invoiceLimitPerMonth, null, "Pro plan has unlimited invoices");
    assert.strictEqual(proPlan.userLimit, null, "Pro plan has unlimited users");
  });

  it("should generate a sandbox simulated Razorpay order when API keys are omitted", async () => {
    const order = await createRazorpayOrder({
      amountPaise: 49900,
      receipt: "rcpt_test_123",
      notes: { tier: "PRO", cycle: "MONTHLY" },
    });

    assert.ok(order.id.startsWith("order_sim_"), "Order ID should start with order_sim_ in test mode");
    assert.strictEqual(order.amount, 49900);
    assert.strictEqual(order.currency, "INR");
    assert.strictEqual(order.isSimulated, true);
    assert.strictEqual(order.keyId, "rzp_test_simulated_key");
  });

  it("should verify simulated sandbox payment signatures correctly", () => {
    const orderId = "order_sim_123456_test";
    const paymentId = "pay_sim_789";
    const validSignature = `sim_sig_${orderId}`;

    const isValid = verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature: validSignature,
    });
    assert.strictEqual(isValid, true, "Simulated signature must verify successfully");

    const isInvalid = verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature: "tampered_signature",
    });
    assert.strictEqual(isInvalid, false, "Tampered simulated signature must fail");
  });

  it("should verify cryptographic HMAC-SHA256 signatures for live gateway transactions", () => {
    const secret = "test_rzp_secret_key_999";
    process.env.RAZORPAY_KEY_SECRET = secret;

    const orderId = "order_live_987654";
    const paymentId = "pay_live_123456";
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    const result = verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature: expectedSignature,
    });
    assert.strictEqual(result, true, "Valid HMAC signature must verify");

    const fakeResult = verifyRazorpayPaymentSignature({
      orderId,
      paymentId,
      signature: "invalid_tampered_signature_123",
    });
    assert.strictEqual(fakeResult, false, "Invalid HMAC signature must be rejected");
  });
});
