import { prisma } from "@/lib/prisma";

export interface SendMessageOptions {
  recipientPhone: string;
  message: string;
  templateName?: string;
  components?: any[];
}

export interface DispatchResult {
  success: boolean;
  channel: "WHATSAPP" | "SMS";
  messageId: string;
  provider: "META_CLOUD_API" | "SMS_GATEWAY" | "SIMULATOR";
  recipientPhone: string;
  previewMessage: string;
  timestamp: string;
  error?: string;
}

/**
 * Normalizes an Indian phone number to 10-digit format and 91-prefixed international format.
 */
export function normalizeIndianPhone(input: string): { tenDigit: string; international: string; isValid: boolean } {
  // Remove all non-numeric characters
  let digits = input.replace(/\D/g, "");

  // If starts with 91 and has 12 digits, strip 91
  if (digits.length === 12 && digits.startsWith("91")) {
    digits = digits.slice(2);
  }

  // If starts with 0 and has 11 digits, strip leading 0
  if (digits.length === 11 && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

  // Valid Indian mobile must be 10 digits starting with 6, 7, 8, or 9
  const isValid = /^[6-9]\d{9}$/.test(digits);

  return {
    tenDigit: digits,
    international: `91${digits}`,
    isValid,
  };
}

/**
 * Builds a structured, statutory GST invoice notification text formatted for WhatsApp.
 */
export function buildInvoiceMessage(
  invoice: {
    invoiceNumber: string;
    invoiceDate: Date | string;
    customerName: string;
    customerPhone: string;
    subtotal: number | any;
    totalTax: number | any;
    totalAmount: number | any;
    paidAmount?: number | any;
    dueAmount?: number | any;
    paymentMode?: string;
    items: Array<{
      productName: string;
      unitSold?: string;
      quantity: number | any;
      unitPrice: number | any;
      lineTotal: number | any;
    }>;
  },
  tenant: {
    businessName: string;
    legalName?: string | null;
    gstin?: string | null;
    phone: string;
    upiId?: string | null;
    address?: string | null;
  }
): string {
  const dateStr = new Date(invoice.invoiceDate).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  const grandTotal = Number(invoice.totalAmount).toFixed(2);
  const paid = invoice.paidAmount !== undefined ? Number(invoice.paidAmount).toFixed(2) : grandTotal;
  const due = invoice.dueAmount !== undefined ? Number(invoice.dueAmount).toFixed(2) : "0.00";

  // Build UPI URI if UPI ID is present
  const upiUri = tenant.upiId
    ? `upi://pay?pa=${tenant.upiId}&pn=${encodeURIComponent(
        tenant.businessName
      )}&am=${grandTotal}&cu=INR&tn=Inv-${invoice.invoiceNumber}`
    : "";

  let msg = `🧾 *TAX INVOICE — ${tenant.businessName.toUpperCase()}*\n`;
  if (tenant.gstin) {
    msg += `GSTIN: \`${tenant.gstin}\`\n`;
  }
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `📄 *Bill No:* ${invoice.invoiceNumber}\n`;
  msg += `📅 *Date:* ${dateStr}\n`;
  msg += `👤 *Customer:* ${invoice.customerName}\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `*ITEMS BILLED:*\n`;

  invoice.items.slice(0, 10).forEach((item) => {
    const qty = Number(item.quantity);
    const unit = item.unitSold || "PCS";
    const total = Number(item.lineTotal).toFixed(2);
    msg += `• ${item.productName} (${qty} ${unit}) : ₹${total}\n`;
  });

  if (invoice.items.length > 10) {
    msg += `_...and ${invoice.items.length - 10} more item(s)_\n`;
  }

  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `💰 *Grand Total: ₹${grandTotal}*\n`;
  msg += `💳 *Paid:* ₹${paid} (${invoice.paymentMode || "UPI"})\n`;

  if (Number(due) > 0) {
    msg += `⚠️ *Balance Due: ₹${due}*\n`;
  }

  if (upiUri && Number(due) > 0) {
    msg += `\n📲 *Click to Pay via UPI:*\n${upiUri}\n`;
  }

  msg += `\n🙏 Thank you for doing business with us!\n`;
  if (tenant.phone) {
    msg += `📞 Support: ${tenant.phone}`;
  }

  return msg;
}

/**
 * Builds a customer Khata balance payment reminder text.
 */
export function buildKhataReminderMessage(
  customer: {
    name: string;
    outstandingBalance: number | any;
  },
  tenant: {
    businessName: string;
    phone: string;
    upiId?: string | null;
  }
): string {
  const balance = Number(customer.outstandingBalance).toFixed(2);
  const upiUri = tenant.upiId
    ? `upi://pay?pa=${tenant.upiId}&pn=${encodeURIComponent(
        tenant.businessName
      )}&am=${balance}&cu=INR&tn=Khata-Settlement`
    : "";

  let msg = `🔔 *Payment Reminder — ${tenant.businessName}*\n\n`;
  msg += `Dear ${customer.name},\n`;
  msg += `This is a friendly reminder regarding your outstanding Khata account balance of *₹${balance}*.\n\n`;

  if (upiUri) {
    msg += `📲 *Pay instantly via UPI:*\n${upiUri}\n\n`;
  }

  msg += `Please settle the pending balance at your earliest convenience.\n`;
  msg += `For any queries, please reach out to us at ${tenant.phone}.\n\n`;
  msg += `Thank you!`;

  return msg;
}

/**
 * Dispatches a message via Meta WhatsApp Cloud API (Graph API v20.0)
 * with graceful fallback to Sandbox Simulation.
 */
export async function sendWhatsAppMessage(options: SendMessageOptions): Promise<DispatchResult> {
  const { recipientPhone, message } = options;
  const { international, isValid } = normalizeIndianPhone(recipientPhone);

  if (!isValid) {
    throw new Error(`Invalid Indian phone number: ${recipientPhone}`);
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  // Live Meta WhatsApp Cloud API Mode
  if (token && phoneNumberId) {
    try {
      const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: international,
          type: "text",
          text: {
            preview_url: true,
            body: message,
          },
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error?.message || `WhatsApp API error HTTP ${response.status}`);
      }

      return {
        success: true,
        channel: "WHATSAPP",
        messageId: json.messages?.[0]?.id || `wamid_live_${Date.now()}`,
        provider: "META_CLOUD_API",
        recipientPhone: international,
        previewMessage: message.slice(0, 100) + "...",
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error("Meta WhatsApp Cloud API error:", err.message);
      // If live API throws, record error
      throw new Error(`WhatsApp Dispatch Failed: ${err.message}`);
    }
  }

  // Zero-Setup Sandbox Simulation Mode
  const simulatedId = `wamid_sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  console.log("=================================================");
  console.log("💬 [WhatsApp Cloud Gateway - Simulated Sandbox]");
  console.log(`To: +${international}`);
  console.log(`Message ID: ${simulatedId}`);
  console.log("Content:\n" + message);
  console.log("=================================================");

  return {
    success: true,
    channel: "WHATSAPP",
    messageId: simulatedId,
    provider: "SIMULATOR",
    recipientPhone: international,
    previewMessage: message.slice(0, 100) + "...",
    timestamp: new Date().toISOString(),
  };
}

/**
 * Dispatches an SMS via Fast2SMS / Indian DLT Gateway
 * with graceful fallback to Sandbox Simulation.
 */
export async function sendSmsMessage(options: { recipientPhone: string; message: string }): Promise<DispatchResult> {
  const { recipientPhone, message } = options;
  const { tenDigit, isValid } = normalizeIndianPhone(recipientPhone);

  if (!isValid) {
    throw new Error(`Invalid Indian phone number: ${recipientPhone}`);
  }

  const smsApiKey = process.env.SMS_API_KEY;

  if (smsApiKey) {
    try {
      // Fast2SMS Quick Transactional / DLT Route
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: "POST",
        headers: {
          authorization: smsApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route: "q",
          message,
          language: "english",
          flash: 0,
          numbers: tenDigit,
        }),
      });

      const json = await response.json();
      if (!response.ok || json.return === false) {
        throw new Error(json.message?.[0] || json.message || `SMS Gateway HTTP ${response.status}`);
      }

      return {
        success: true,
        channel: "SMS",
        messageId: json.request_id || `sms_live_${Date.now()}`,
        provider: "SMS_GATEWAY",
        recipientPhone: tenDigit,
        previewMessage: message.slice(0, 100) + "...",
        timestamp: new Date().toISOString(),
      };
    } catch (err: any) {
      console.error("SMS Gateway error:", err.message);
      throw new Error(`SMS Dispatch Failed: ${err.message}`);
    }
  }

  // Zero-Setup Sandbox Simulation Mode
  const simulatedId = `sms_sim_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  console.log("=================================================");
  console.log("📱 [Indian SMS Gateway - Simulated Sandbox]");
  console.log(`To: +91 ${tenDigit}`);
  console.log(`Message ID: ${simulatedId}`);
  console.log("Content:\n" + message);
  console.log("=================================================");

  return {
    success: true,
    channel: "SMS",
    messageId: simulatedId,
    provider: "SIMULATOR",
    recipientPhone: tenDigit,
    previewMessage: message.slice(0, 100) + "...",
    timestamp: new Date().toISOString(),
  };
}

/**
 * High-level notification dispatcher supporting multi-channel sending and auto-formatting.
 */
export async function dispatchCustomerNotification(options: {
  channel: "WHATSAPP" | "SMS" | "BOTH";
  type: "INVOICE" | "KHATA_REMINDER" | "TEST" | "CUSTOM";
  recipientPhone: string;
  tenantId: string;
  invoiceId?: string;
  customerId?: string;
  customMessage?: string;
}): Promise<{ results: DispatchResult[]; summary: string }> {
  const { channel, type, recipientPhone, tenantId, invoiceId, customerId, customMessage } = options;

  // 1. Fetch Tenant
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error("Tenant not found");
  }

  // 2. Generate Content
  let formattedMessage = customMessage || "";

  if (type === "INVOICE" && invoiceId) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { items: true },
    });

    if (!invoice) throw new Error("Invoice not found");

    formattedMessage = buildInvoiceMessage(
      {
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        customerName: invoice.customerName,
        customerPhone: invoice.customerPhone,
        subtotal: invoice.subtotal,
        totalTax: invoice.totalTax,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount,
        dueAmount: invoice.dueAmount,
        paymentMode: invoice.paymentMode,
        items: invoice.items.map((i) => ({
          productName: i.productName,
          unitSold: i.unitSold,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
        })),
      },
      {
        businessName: tenant.businessName,
        legalName: tenant.legalName,
        gstin: tenant.gstin,
        phone: tenant.phone,
        upiId: tenant.upiId,
        address: tenant.address,
      }
    );
  } else if (type === "KHATA_REMINDER" && customerId) {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) throw new Error("Customer not found");

    formattedMessage = buildKhataReminderMessage(
      {
        name: customer.name,
        outstandingBalance: customer.outstandingBalance,
      },
      {
        businessName: tenant.businessName,
        phone: tenant.phone,
        upiId: tenant.upiId,
      }
    );
  } else if (type === "TEST") {
    formattedMessage =
      `✅ *SmartVyapar Cloud Gateway Test*\n\n` +
      `Hello from ${tenant.businessName}!\n` +
      `Your automated communications gateway is successfully configured and active.\n\n` +
      `🕒 Timestamp: ${new Date().toLocaleString("en-IN")}\n` +
      `🏢 Tenant: ${tenant.businessName}`;
  }

  if (!formattedMessage) {
    throw new Error("Message content cannot be empty");
  }

  // 3. Dispatch to requested channels
  const results: DispatchResult[] = [];

  if (channel === "WHATSAPP" || channel === "BOTH") {
    const waResult = await sendWhatsAppMessage({
      recipientPhone,
      message: formattedMessage,
    });
    results.push(waResult);
  }

  if (channel === "SMS" || channel === "BOTH") {
    // For SMS, shorten to plain text if needed
    const plainText = formattedMessage.replace(/[*_`~]/g, "");
    const smsResult = await sendSmsMessage({
      recipientPhone,
      message: plainText,
    });
    results.push(smsResult);
  }

  const providers = results.map((r) => `${r.channel}:${r.provider}`).join(", ");
  return {
    results,
    summary: `Successfully dispatched via ${providers}`,
  };
}
