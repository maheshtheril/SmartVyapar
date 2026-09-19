import crypto from "crypto";

export interface CreateOrderParams {
  amountPaise: number;
  currency?: string;
  receipt: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  isSimulated: boolean;
  keyId: string;
}

/**
 * Creates a Razorpay Order or generates a high-fidelity sandbox simulation
 * when API keys are not present in .env
 */
export async function createRazorpayOrder({
  amountPaise,
  currency = "INR",
  receipt,
  notes = {},
}: CreateOrderParams): Promise<RazorpayOrderResult> {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  // 1. Live Razorpay API mode
  if (keyId && keySecret) {
    const authHeader = `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency,
        receipt,
        notes,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[Razorpay] Order creation failed:", errorText);
      throw new Error(`Razorpay order creation failed: ${res.statusText}`);
    }

    const order = await res.json();
    return {
      id: order.id,
      amount: order.amount,
      currency: order.currency,
      isSimulated: false,
      keyId,
    };
  }

  // 2. Zero-Setup Sandbox Simulation Mode
  const simulatedOrderId = `order_sim_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  console.log("=================================================");
  console.log("💳 [Razorpay Sandbox Order Created]");
  console.log(`Order ID: ${simulatedOrderId}`);
  console.log(`Amount: ₹${amountPaise / 100} (${amountPaise} paise)`);
  console.log(`Receipt: ${receipt}`);
  console.log("=================================================");

  return {
    id: simulatedOrderId,
    amount: amountPaise,
    currency,
    isSimulated: true,
    keyId: "rzp_test_simulated_key",
  };
}

/**
 * Verifies Razorpay HMAC SHA-256 signature
 */
export function verifyRazorpayPaymentSignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  // Sandbox test mode check
  if (orderId.startsWith("order_sim_")) {
    return signature === `sim_sig_${orderId}` || signature.startsWith("sim_sig_");
  }

  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) {
    throw new Error("RAZORPAY_KEY_SECRET is not configured on server.");
  }

  const payload = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(payload)
    .digest("hex");

  return expectedSignature === signature;
}
