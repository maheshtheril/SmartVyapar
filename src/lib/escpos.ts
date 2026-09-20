/**
 * Silent Thermal ESC/POS Hardware Driver
 * Implements EPSON Standard ESC/POS Command Generation and WebSerial / WebUSB direct hardware bridges.
 * Eliminates browser print popups for high-throughput retail checkout counters.
 */

export const ESC = 0x1b;
export const GS = 0x1d;

export const COMMANDS = {
  // Hardware Initialization
  INIT: new Uint8Array([ESC, 0x40]),

  // Text Alignment
  ALIGN_LEFT: new Uint8Array([ESC, 0x61, 0]),
  ALIGN_CENTER: new Uint8Array([ESC, 0x61, 1]),
  ALIGN_RIGHT: new Uint8Array([ESC, 0x61, 2]),

  // Emphasis / Bold
  BOLD_ON: new Uint8Array([ESC, 0x45, 1]),
  BOLD_OFF: new Uint8Array([ESC, 0x45, 0]),

  // Font Size Modes
  TEXT_NORMAL: new Uint8Array([ESC, 0x21, 0]),
  TEXT_DOUBLE_HEIGHT: new Uint8Array([ESC, 0x21, 0x10]),
  TEXT_DOUBLE_WIDTH: new Uint8Array([ESC, 0x21, 0x20]),
  TEXT_LARGE: new Uint8Array([ESC, 0x21, 0x30]),

  // Line Feed & Paper Cut
  FEED_3_LINES: new Uint8Array([ESC, 0x64, 3]),
  PAPER_CUT_PARTIAL: new Uint8Array([GS, 0x56, 66, 0]), // Cut paper feed
  PAPER_CUT_FULL: new Uint8Array([GS, 0x56, 65, 0]),

  // Cash Drawer Kick
  DRAWER_KICK: new Uint8Array([ESC, 0x70, 0, 25, 250]),
};

export interface EscposReceiptData {
  businessName: string;
  businessGstin?: string;
  businessAddress?: string;
  businessPhone?: string;
  invoiceNumber: string;
  invoiceDate: string;
  customerName?: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod?: string;
  footerMessage?: string;
  paperWidth?: "58mm" | "80mm";
}

/**
 * Encodes text string to ASCII / UTF-8 Uint8Array byte sequence
 */
export function encodeText(text: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(text);
}

/**
 * Combines multiple Uint8Arrays into a single contiguous byte buffer
 */
export function concatByteArrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((acc, curr) => acc + curr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

/**
 * Formats a key-value row with dots/spaces padding for fixed thermal paper width
 */
export function formatTwoColumnRow(left: string, right: string, maxChars: number = 32): string {
  const available = maxChars - left.length - right.length;
  if (available <= 0) {
    return `${left} ${right}\n`;
  }
  return `${left}${" ".repeat(available)}${right}\n`;
}

/**
 * Generates an ESC/POS binary stream for thermal receipt printers
 */
export function buildEscposReceipt(data: EscposReceiptData): Uint8Array {
  const maxChars = data.paperWidth === "80mm" ? 48 : 32;
  const divider = "-".repeat(maxChars) + "\n";
  const doubleDivider = "=".repeat(maxChars) + "\n";

  const chunks: Uint8Array[] = [];

  // 1. Initialize printer
  chunks.push(COMMANDS.INIT);

  // 2. Business Header (Centered & Bold)
  chunks.push(COMMANDS.ALIGN_CENTER);
  chunks.push(COMMANDS.BOLD_ON);
  chunks.push(COMMANDS.TEXT_DOUBLE_HEIGHT);
  chunks.push(encodeText(`${data.businessName.toUpperCase()}\n`));
  chunks.push(COMMANDS.TEXT_NORMAL);
  chunks.push(COMMANDS.BOLD_OFF);

  if (data.businessAddress) {
    chunks.push(encodeText(`${data.businessAddress}\n`));
  }
  if (data.businessGstin) {
    chunks.push(encodeText(`GSTIN: ${data.businessGstin}\n`));
  }
  if (data.businessPhone) {
    chunks.push(encodeText(`Ph: ${data.businessPhone}\n`));
  }

  chunks.push(encodeText(divider));

  // 3. Invoice Metadata (Left Aligned)
  chunks.push(COMMANDS.ALIGN_LEFT);
  chunks.push(encodeText(formatTwoColumnRow("Bill No:", data.invoiceNumber, maxChars)));
  chunks.push(encodeText(formatTwoColumnRow("Date:", data.invoiceDate, maxChars)));
  if (data.customerName) {
    chunks.push(encodeText(formatTwoColumnRow("Cust:", data.customerName, maxChars)));
  }
  chunks.push(encodeText(divider));

  // 4. Line Items Table Header
  chunks.push(COMMANDS.BOLD_ON);
  const headerLeft = "Item x Qty";
  const headerRight = "Total";
  chunks.push(encodeText(formatTwoColumnRow(headerLeft, headerRight, maxChars)));
  chunks.push(COMMANDS.BOLD_OFF);
  chunks.push(encodeText(divider));

  // 5. Line Items
  for (const item of data.items) {
    const leftText = `${item.name.substring(0, maxChars - 14)} x${item.quantity}`;
    const rightText = `₹${item.total.toFixed(2)}`;
    chunks.push(encodeText(formatTwoColumnRow(leftText, rightText, maxChars)));
  }
  chunks.push(encodeText(doubleDivider));

  // 6. Totals
  chunks.push(encodeText(formatTwoColumnRow("Subtotal:", `₹${data.subtotal.toFixed(2)}`, maxChars)));
  chunks.push(encodeText(formatTwoColumnRow("Tax (GST):", `₹${data.taxAmount.toFixed(2)}`, maxChars)));
  chunks.push(COMMANDS.BOLD_ON);
  chunks.push(COMMANDS.TEXT_DOUBLE_HEIGHT);
  chunks.push(encodeText(formatTwoColumnRow("TOTAL PAYABLE:", `₹${data.totalAmount.toFixed(2)}`, maxChars)));
  chunks.push(COMMANDS.TEXT_NORMAL);
  chunks.push(COMMANDS.BOLD_OFF);
  chunks.push(encodeText(divider));

  if (data.paymentMethod) {
    chunks.push(encodeText(formatTwoColumnRow("Payment Mode:", data.paymentMethod, maxChars)));
  }

  // 7. Footer
  chunks.push(COMMANDS.ALIGN_CENTER);
  chunks.push(encodeText(`\n${data.footerMessage || "Thank you for shopping with us!"}\n`));
  chunks.push(encodeText("SmartVyapar ERP • World Standard\n"));

  // 8. Feed and Paper Cut
  chunks.push(COMMANDS.FEED_3_LINES);
  chunks.push(COMMANDS.PAPER_CUT_PARTIAL);

  return concatByteArrays(chunks);
}

/**
 * WebSerial API direct hardware thermal printer driver
 */
export async function printDirectWebSerial(bytes: Uint8Array): Promise<{ success: boolean; error?: string }> {
  if (typeof navigator === "undefined" || !("serial" in navigator)) {
    return { success: false, error: "WebSerial API is not supported in this browser. Please use Chrome/Edge." };
  }

  try {
    const port = await (navigator as any).serial.requestPort();
    await port.open({ baudRate: 9600 });
    const writer = port.writable.getWriter();
    await writer.write(bytes);
    writer.releaseLock();
    await port.close();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to print via Serial Port" };
  }
}
