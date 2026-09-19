import { prisma } from "@/lib/prisma";
import { normalizeIndianPhone, sendWhatsAppMessage } from "@/lib/notifications";
import { AuditAction } from "@prisma/client";
import { recordAuditLog } from "@/lib/audit";

export interface BotCommandResult {
  intent: "GREETING" | "BALANCE" | "LATEST_BILL" | "PAYMENT_LINK" | "UNKNOWN";
  replyText: string;
  customerFound: boolean;
  customerName?: string;
  businessName?: string;
  dispatched: boolean;
  messageId?: string;
}

/**
 * Extracts sender mobile number, incoming text, and message ID from standard Meta WhatsApp Webhook payload.
 */
export function parseIncomingMetaMessage(body: any): {
  senderPhone?: string;
  text?: string;
  messageId?: string;
  timestamp?: string;
} | null {
  try {
    const entry = body?.entry?.[0];
    const change = entry?.changes?.[0]?.value;
    const message = change?.messages?.[0];

    if (!message) return null;

    const senderPhone = message.from; // e.g. "919876543210"
    const messageId = message.id;
    const timestamp = message.timestamp;
    let text = "";

    if (message.type === "text") {
      text = message.text?.body || "";
    } else if (message.type === "button") {
      text = message.button?.text || message.button?.payload || "";
    } else if (message.type === "interactive") {
      text =
        message.interactive?.button_reply?.title ||
        message.interactive?.list_reply?.title ||
        "";
    }

    return {
      senderPhone,
      text: text.trim(),
      messageId,
      timestamp,
    };
  } catch (err) {
    console.error("Error parsing Meta message:", err);
    return null;
  }
}

/**
 * Generates automated reply text based on customer command keywords.
 */
export async function processCustomerCommand(
  rawPhone: string,
  rawMessage: string,
  dryRun: boolean = false
): Promise<BotCommandResult> {
  const { tenDigit } = normalizeIndianPhone(rawPhone);
  const command = rawMessage.trim().toUpperCase();

  // Find customer in database by phone number (skip when dryRun is true)
  let customer: any = null;
  if (!dryRun) {
    try {
      customer = await prisma.customer.findFirst({
        where: {
          phone: {
            contains: tenDigit,
          },
        },
        include: {
          tenant: true,
          invoices: {
            orderBy: { invoiceDate: "desc" },
            take: 3,
          },
        },
      });
    } catch (dbErr) {
      console.warn("[WhatsApp Bot] Database lookup bypassed/failed:", dbErr);
    }
  }

  const businessName = customer?.tenant?.businessName || "SmartVyapar Merchant";
  const upiId = customer?.tenant?.upiId || "merchant@upi";
  const customerName = customer?.name || "Valued Customer";
  const outstandingBalance = Number(customer?.outstandingBalance || 0);

  let intent: BotCommandResult["intent"] = "UNKNOWN";
  let replyText = "";

  if (/^(HI|HELLO|HEY|START|HELP|MENU|OPTION|NAMASTE|VANAKKAM)$/i.test(command)) {
    intent = "GREETING";
    replyText =
      `🙏 *Namaste ${customerName}! Welcome to ${businessName}*\n\n` +
      `You can reply with any of the following commands:\n\n` +
      `🧾 *BILL* - View your latest invoice details\n` +
      `💰 *BALANCE* - Check your outstanding Khata balance\n` +
      `💳 *PAY* - Get instant NPCI UPI payment link\n` +
      `📋 *HELP* - View this command menu again\n\n` +
      `_Powered by SmartVyapar 24x7 Automated Assistant_`;
  } else if (/^(BALANCE|DUE|DUES|KHATA|HISAB|OUTSTANDING)$/i.test(command)) {
    intent = "BALANCE";
    if (!customer) {
      replyText =
        `ℹ️ *Khata Inquiry - ${businessName}*\n\n` +
        `No customer record was found for mobile number *+91 ${tenDigit}*.\n\n` +
        `If you are an existing customer, please check with our store staff.`;
    } else if (outstandingBalance <= 0) {
      replyText =
        `✅ *Khata Account Statement - ${businessName}*\n\n` +
        `Dear *${customerName}*,\n` +
        `Your account is fully settled! You currently have *₹0.00* outstanding dues.\n\n` +
        `Thank you for your prompt payments! 🙏`;
    } else {
      const upiLink = `upi://pay?pa=${encodeURIComponent(
        upiId
      )}&pn=${encodeURIComponent(businessName)}&am=${outstandingBalance.toFixed(
        2
      )}&cu=INR&tn=${encodeURIComponent(`Khata Settlement ${customerName}`)}`;

      replyText =
        `📊 *Khata Balance Alert - ${businessName}*\n\n` +
        `Dear *${customerName}*,\n` +
        `Your current outstanding ledger balance is *₹${outstandingBalance.toLocaleString(
          "en-IN",
          { minimumFractionDigits: 2 }
        )}*.\n\n` +
        `📲 *Instant UPI Payment Link:*\n${upiLink}\n\n` +
        `Reply *BILL* to view individual invoice details.`;
    }
  } else if (/^(BILL|INVOICE|REC|RECEIPT|LAST BILL|LATEST)$/i.test(command)) {
    intent = "LATEST_BILL";
    const latestInvoice = customer?.invoices?.[0];

    if (!latestInvoice) {
      replyText =
        `ℹ️ No recent invoices found for your number at *${businessName}*.\n\n` +
        `Reply *BALANCE* to check your overall ledger status.`;
    } else {
      const billDate = new Date(latestInvoice.invoiceDate).toLocaleDateString("en-IN");
      const total = Number(latestInvoice.totalAmount).toFixed(2);
      const due = Number(latestInvoice.dueAmount).toFixed(2);
      const status = latestInvoice.paymentStatus;

      let billMsg =
        `🧾 *Latest Bill #${latestInvoice.invoiceNumber}*\n` +
        `🏪 *${businessName}*\n` +
        `📅 Date: ${billDate}\n` +
        `💵 Total Amount: *₹${total}*\n` +
        `🔖 Payment Status: *${status}*\n`;

      if (Number(due) > 0) {
        billMsg += `⚠️ Balance Due: *₹${due}*\n\n`;
        billMsg += `📲 *Pay via UPI:* ${latestInvoice.upiUri || `upi://pay?pa=${upiId}&am=${due}&cu=INR`}\n\n`;
      } else {
        billMsg += `\n`;
      }

      billMsg += `Thank you for shopping with us! 🙏`;
      replyText = billMsg;
    }
  } else if (/^(PAY|PAYMENT|QR|UPI|GPay|PHONEPE)$/i.test(command)) {
    intent = "PAYMENT_LINK";
    const amountToPay = outstandingBalance > 0 ? outstandingBalance : 0;
    const upiLink = `upi://pay?pa=${encodeURIComponent(
      upiId
    )}&pn=${encodeURIComponent(businessName)}${
      amountToPay > 0 ? `&am=${amountToPay.toFixed(2)}` : ""
    }&cu=INR&tn=${encodeURIComponent(`Payment to ${businessName}`)}`;

    replyText =
      `💳 *Instant UPI Payment - ${businessName}*\n\n` +
      `Merchant VPA: \`${upiId}\`\n` +
      (amountToPay > 0
        ? `Pending Due: *₹${amountToPay.toFixed(2)}*\n\n`
        : `\n`) +
      `🔗 *Click to Open in GPay / PhonePe / Paytm:*\n${upiLink}\n\n` +
      `After payment, confirmation will be recorded automatically in your account.`;
  } else {
    intent = "UNKNOWN";
    replyText =
      `❓ *Sorry, I didn't recognize that request.*\n\n` +
      `Please reply with one of these keywords:\n` +
      `• *BILL* - View latest bill\n` +
      `• *BALANCE* - Check outstanding Khata dues\n` +
      `• *PAY* - Get UPI link\n` +
      `• *HELP* - Show full menu\n\n` +
      `_${businessName} Automated WhatsApp Support_`;
  }

  // Dispatch reply via WhatsApp (Live API or Sandbox)
  let dispatched = false;
  let messageId: string | undefined;

  if (!dryRun) {
    try {
      const result = await sendWhatsAppMessage({
        recipientPhone: tenDigit,
        message: replyText,
      });
      dispatched = result.success;
      messageId = result.messageId;

      // Statutory MCA Audit Trail
      if (customer?.tenantId) {
        await recordAuditLog({
          tenantId: customer.tenantId,
          action: AuditAction.STATUS_CHANGE,
          entityType: "WHATSAPP_BOT",
          entityId: tenDigit,
          details: {
            incomingText: rawMessage,
            intent,
            customerName,
            replyLength: replyText.length,
            messageId,
          },
        });
      }
    } catch (err: any) {
      console.error("Bot reply dispatch failed:", err.message);
    }
  }

  return {
    intent,
    replyText,
    customerFound: Boolean(customer),
    customerName,
    businessName,
    dispatched,
    messageId,
  };
}
