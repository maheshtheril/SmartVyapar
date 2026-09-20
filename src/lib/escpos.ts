/**
 * Silent Thermal ESC/POS Hardware Driver
 * Implements EPSON Standard ESC/POS Command Generation, WebSerial, and WebUSB direct hardware bridges.
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

  // Underline
  UNDERLINE_ON: new Uint8Array([ESC, 0x2d, 1]),
  UNDERLINE_OFF: new Uint8Array([ESC, 0x2d, 0]),

  // Font Size Modes
  TEXT_NORMAL: new Uint8Array([ESC, 0x21, 0]),
  TEXT_DOUBLE_HEIGHT: new Uint8Array([ESC, 0x21, 0x10]),
  TEXT_DOUBLE_WIDTH: new Uint8Array([ESC, 0x21, 0x20]),
  TEXT_LARGE: new Uint8Array([ESC, 0x21, 0x30]),

  // Line Feed & Paper Cut
  FEED_3_LINES: new Uint8Array([ESC, 0x64, 3]),
  FEED_5_LINES: new Uint8Array([ESC, 0x64, 5]),
  PAPER_CUT_PARTIAL: new Uint8Array([GS, 0x56, 66, 0]), // Cut paper feed
  PAPER_CUT_FULL: new Uint8Array([GS, 0x56, 65, 0]),

  // Cash Drawer Kick (Standard Epson RJ11 Pin 2 Pulse)
  DRAWER_KICK: new Uint8Array([ESC, 0x70, 0, 25, 250]),
  DRAWER_KICK_PIN5: new Uint8Array([ESC, 0x70, 1, 25, 250]),
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
  includeBarcode?: boolean;
  kickDrawer?: boolean;
  loyaltyRedeemed?: number;
  loyaltyEarned?: number;
}

export interface EscposZReportData {
  businessName: string;
  businessGstin?: string;
  businessAddress?: string;
  businessPhone?: string;
  shiftNumber: string;
  openedAt: string;
  closedAt: string;
  openedByName: string;
  closedByName?: string;
  billCount: number;
  openingFloat: number;
  sales: {
    cash: number;
    upi: number;
    card: number;
    credit: number;
    gross: number;
  };
  payouts: {
    total: number;
    items?: Array<{ reason: string; amount: number }>;
  };
  expectedCash: number;
  actualCash: number;
  variance: number;
  denominations?: Record<string, number>;
  paperWidth?: "58mm" | "80mm";
}

export interface HardwarePrinterConfig {
  type: "NONE" | "SERIAL" | "USB";
  baudRate?: number;
  autoPrintOnSave?: boolean;
  kickDrawerOnPrint?: boolean;
  paperWidth?: "58mm" | "80mm";
}

const STORAGE_KEY = "sv_hardware_printer_config";

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
 * Generates Code-128 scannable barcode ESC/POS command stream
 */
export function generateEscposBarcode(code: string): Uint8Array {
  const cleaned = code.replace(/[^a-zA-Z0-9_-]/g, "");
  const codeBytes = encodeText(cleaned);

  // Set Barcode Height (50 dots)
  const setHeight = new Uint8Array([GS, 0x68, 50]);
  // Set Barcode Width (2 dots)
  const setWidth = new Uint8Array([GS, 0x77, 2]);
  // Set HRI characters position below barcode
  const setHri = new Uint8Array([GS, 0x48, 2]);

  // Code 128 command: GS k 73 [len] [data]
  const printCmd = new Uint8Array(4 + codeBytes.length);
  printCmd[0] = GS;
  printCmd[1] = 0x6b;
  printCmd[2] = 73; // Code 128
  printCmd[3] = codeBytes.length;
  printCmd.set(codeBytes, 4);

  return concatByteArrays([
    COMMANDS.ALIGN_CENTER,
    setHeight,
    setWidth,
    setHri,
    printCmd,
    encodeText("\n"),
    COMMANDS.ALIGN_LEFT,
  ]);
}

/**
 * Generates an ESC/POS binary stream for thermal receipt printers
 */
export function buildEscposReceipt(data: EscposReceiptData): Uint8Array {
  const maxChars = data.paperWidth === "80mm" ? 48 : 32;
  const divider = "-".repeat(maxChars) + "\n";
  const doubleDivider = "=".repeat(maxChars) + "\n";

  const chunks: Uint8Array[] = [];

  // Optional: Kick cash drawer first before printing
  if (data.kickDrawer) {
    chunks.push(COMMANDS.DRAWER_KICK);
  }

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
  if (data.customerPhone) {
    chunks.push(encodeText(formatTwoColumnRow("Phone:", data.customerPhone, maxChars)));
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

  if (data.loyaltyRedeemed && data.loyaltyRedeemed > 0) {
    chunks.push(encodeText(formatTwoColumnRow("Loyalty Discount:", `-₹${data.loyaltyRedeemed.toFixed(2)}`, maxChars)));
  }

  chunks.push(COMMANDS.BOLD_ON);
  chunks.push(COMMANDS.TEXT_DOUBLE_HEIGHT);
  chunks.push(encodeText(formatTwoColumnRow("TOTAL PAYABLE:", `₹${data.totalAmount.toFixed(2)}`, maxChars)));
  chunks.push(COMMANDS.TEXT_NORMAL);
  chunks.push(COMMANDS.BOLD_OFF);
  chunks.push(encodeText(divider));

  if (data.paymentMethod) {
    chunks.push(encodeText(formatTwoColumnRow("Payment Mode:", data.paymentMethod, maxChars)));
  }

  if (data.loyaltyEarned && data.loyaltyEarned > 0) {
    chunks.push(encodeText(formatTwoColumnRow("Reward Pts Earned:", `+${data.loyaltyEarned} pts`, maxChars)));
  }

  // 7. Scannable Barcode (Code-128)
  if (data.includeBarcode !== false && data.invoiceNumber) {
    chunks.push(encodeText("\n"));
    chunks.push(generateEscposBarcode(data.invoiceNumber));
  }

  // 8. Footer
  chunks.push(COMMANDS.ALIGN_CENTER);
  chunks.push(encodeText(`\n${data.footerMessage || "Thank you for shopping with us!"}\n`));
  chunks.push(encodeText("SmartVyapar POS • World Standard\n"));

  // 9. Feed and Paper Cut
  chunks.push(COMMANDS.FEED_3_LINES);
  chunks.push(COMMANDS.PAPER_CUT_PARTIAL);

  return concatByteArrays(chunks);
}

/**
 * Generates an ESC/POS binary stream for End-of-Day Z-Report
 */
export function buildEscposZReport(data: EscposZReportData): Uint8Array {
  const maxChars = data.paperWidth === "80mm" ? 48 : 32;
  const divider = "-".repeat(maxChars) + "\n";
  const doubleDivider = "=".repeat(maxChars) + "\n";

  const chunks: Uint8Array[] = [];

  chunks.push(COMMANDS.INIT);
  chunks.push(COMMANDS.ALIGN_CENTER);
  chunks.push(COMMANDS.BOLD_ON);
  chunks.push(COMMANDS.TEXT_DOUBLE_HEIGHT);
  chunks.push(encodeText(`${data.businessName.toUpperCase()}\n`));
  chunks.push(COMMANDS.TEXT_NORMAL);
  chunks.push(encodeText("*** END-OF-DAY Z-REPORT ***\n"));
  chunks.push(COMMANDS.BOLD_OFF);
  if (data.businessGstin) chunks.push(encodeText(`GSTIN: ${data.businessGstin}\n`));
  chunks.push(encodeText(divider));

  chunks.push(COMMANDS.ALIGN_LEFT);
  chunks.push(encodeText(formatTwoColumnRow("Shift #:", data.shiftNumber, maxChars)));
  chunks.push(encodeText(formatTwoColumnRow("Opened:", data.openedAt, maxChars)));
  chunks.push(encodeText(formatTwoColumnRow("Closed:", data.closedAt, maxChars)));
  chunks.push(encodeText(formatTwoColumnRow("Cashier:", data.openedByName, maxChars)));
  chunks.push(encodeText(formatTwoColumnRow("Bills Billed:", String(data.billCount), maxChars)));
  chunks.push(encodeText(divider));

  // Sales Summary
  chunks.push(COMMANDS.BOLD_ON);
  chunks.push(encodeText("SALES SUMMARY\n"));
  chunks.push(COMMANDS.BOLD_OFF);
  chunks.push(encodeText(formatTwoColumnRow("Cash Sales:", `₹${data.sales.cash.toFixed(2)}`, maxChars)));
  chunks.push(encodeText(formatTwoColumnRow("UPI Sales:", `₹${data.sales.upi.toFixed(2)}`, maxChars)));
  chunks.push(encodeText(formatTwoColumnRow("Card Sales:", `₹${data.sales.card.toFixed(2)}`, maxChars)));
  if (data.sales.credit > 0) {
    chunks.push(encodeText(formatTwoColumnRow("Credit / Udhar:", `₹${data.sales.credit.toFixed(2)}`, maxChars)));
  }
  chunks.push(COMMANDS.BOLD_ON);
  chunks.push(encodeText(formatTwoColumnRow("GROSS SALES:", `₹${data.sales.gross.toFixed(2)}`, maxChars)));
  chunks.push(COMMANDS.BOLD_OFF);
  chunks.push(encodeText(divider));

  // Cash Drawer Reconciliation
  chunks.push(COMMANDS.BOLD_ON);
  chunks.push(encodeText("CASH DRAWER RECONCILIATION\n"));
  chunks.push(COMMANDS.BOLD_OFF);
  chunks.push(encodeText(formatTwoColumnRow("Opening Float:", `₹${data.openingFloat.toFixed(2)}`, maxChars)));
  chunks.push(encodeText(formatTwoColumnRow("(+) Cash Sales:", `₹${data.sales.cash.toFixed(2)}`, maxChars)));
  chunks.push(encodeText(formatTwoColumnRow("(-) Petty Payouts:", `-₹${data.payouts.total.toFixed(2)}`, maxChars)));
  chunks.push(encodeText(doubleDivider));
  chunks.push(encodeText(formatTwoColumnRow("Expected in Till:", `₹${data.expectedCash.toFixed(2)}`, maxChars)));
  chunks.push(COMMANDS.BOLD_ON);
  chunks.push(encodeText(formatTwoColumnRow("Actual Counted:", `₹${data.actualCash.toFixed(2)}`, maxChars)));

  const varLabel =
    Math.abs(data.variance) < 0.01
      ? "VARIANCE: BALANCED"
      : data.variance > 0
      ? `VARIANCE: +₹${data.variance.toFixed(2)} (EXCESS)`
      : `VARIANCE: -₹${Math.abs(data.variance).toFixed(2)} (SHORTAGE)`;

  chunks.push(encodeText(formatTwoColumnRow("AUDIT STATUS:", varLabel, maxChars)));
  chunks.push(COMMANDS.BOLD_OFF);
  chunks.push(encodeText(divider));

  // Signatures
  chunks.push(encodeText("\n\n"));
  chunks.push(encodeText(formatTwoColumnRow("Cashier Sig.", "Manager Sig.", maxChars)));
  chunks.push(COMMANDS.FEED_5_LINES);
  chunks.push(COMMANDS.PAPER_CUT_PARTIAL);

  return concatByteArrays(chunks);
}

/**
 * Check browser support
 */
export function isWebSerialSupported(): boolean {
  return typeof navigator !== "undefined" && "serial" in navigator;
}

export function isWebUsbSupported(): boolean {
  return typeof navigator !== "undefined" && "usb" in navigator;
}

/**
 * Hardware configuration persistence
 */
export function getHardwarePrinterConfig(): HardwarePrinterConfig {
  if (typeof window === "undefined") return { type: "NONE" };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { type: "NONE", autoPrintOnSave: false, kickDrawerOnPrint: false, paperWidth: "80mm" };
}

export function saveHardwarePrinterConfig(config: Partial<HardwarePrinterConfig>): HardwarePrinterConfig {
  const current = getHardwarePrinterConfig();
  const merged = { ...current, ...config };
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  }
  return merged;
}

export function clearHardwarePrinterConfig(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * WebSerial API direct hardware thermal printer driver
 */
export async function printDirectWebSerial(bytes: Uint8Array): Promise<{ success: boolean; error?: string }> {
  if (!isWebSerialSupported()) {
    return { success: false, error: "WebSerial API is not supported in this browser. Please use Chrome, Edge, or Brave." };
  }

  try {
    const serial = (navigator as any).serial;
    const ports = await serial.getPorts();
    let port = ports.length > 0 ? ports[0] : null;

    if (!port) {
      port = await serial.requestPort();
    }

    const config = getHardwarePrinterConfig();
    await port.open({ baudRate: config.baudRate || 9600 });
    const writer = port.writable.getWriter();
    await writer.write(bytes);
    writer.releaseLock();
    await port.close();

    saveHardwarePrinterConfig({ type: "SERIAL" });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to print via Serial/COM Port" };
  }
}

/**
 * WebUSB API direct hardware thermal printer driver
 */
export async function printDirectWebUSB(bytes: Uint8Array): Promise<{ success: boolean; error?: string }> {
  if (!isWebUsbSupported()) {
    return { success: false, error: "WebUSB API is not supported in this browser. Please use Chrome, Edge, or Brave." };
  }

  try {
    const usb = (navigator as any).usb;
    const devices = await usb.getDevices();
    let device = devices.length > 0 ? devices[0] : null;

    if (!device) {
      device = await usb.requestDevice({
        filters: [
          { classCode: 0x07 }, // USB Printer Class
        ],
      });
    }

    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    // Find printer interface & bulk OUT endpoint
    const iface = device.configuration.interfaces.find((i: any) =>
      i.alternates.some((alt: any) => alt.interfaceClass === 7 || alt.endpoints.some((ep: any) => ep.direction === "out"))
    ) || device.configuration.interfaces[0];

    const interfaceNumber = iface.interfaceNumber;
    await device.claimInterface(interfaceNumber);

    const alternate = iface.alternates[0];
    const outEndpoint = alternate.endpoints.find((ep: any) => ep.direction === "out") || alternate.endpoints[0];

    await device.transferOut(outEndpoint.endpointNumber, bytes);
    await device.releaseInterface(interfaceNumber);
    await device.close();

    saveHardwarePrinterConfig({ type: "USB" });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to print via USB" };
  }
}

/**
 * Unified Hardware Driver: Prints to whatever hardware printer is configured
 */
export async function printDirectHardware(bytes: Uint8Array): Promise<{ success: boolean; error?: string }> {
  const config = getHardwarePrinterConfig();

  if (config.type === "USB") {
    const res = await printDirectWebUSB(bytes);
    if (res.success) return res;
  }

  if (config.type === "SERIAL") {
    const res = await printDirectWebSerial(bytes);
    if (res.success) return res;
  }

  // If not explicitly set or failed, try USB then Serial
  if (isWebUsbSupported()) {
    const usbRes = await printDirectWebUSB(bytes);
    if (usbRes.success) return usbRes;
  }

  if (isWebSerialSupported()) {
    return await printDirectWebSerial(bytes);
  }

  return { success: false, error: "No hardware printer interface available." };
}

/**
 * Triggers cash drawer kick solenoid directly via hardware printer
 */
export async function kickCashDrawer(): Promise<{ success: boolean; error?: string }> {
  return await printDirectHardware(COMMANDS.DRAWER_KICK);
}

/**
 * Prints a test slip verifying alignment and cutter
 */
export async function printHardwareTestSlip(businessName: string = "SMARTVYAPAR STORE"): Promise<{ success: boolean; error?: string }> {
  const chunks = [
    COMMANDS.INIT,
    COMMANDS.ALIGN_CENTER,
    COMMANDS.BOLD_ON,
    COMMANDS.TEXT_DOUBLE_HEIGHT,
    encodeText(`${businessName.toUpperCase()}\n`),
    COMMANDS.TEXT_NORMAL,
    COMMANDS.BOLD_OFF,
    encodeText("--------------------------------\n"),
    encodeText("DIRECT HARDWARE ESC/POS TEST OK\n"),
    encodeText(`Time: ${new Date().toLocaleTimeString("en-IN")}\n`),
    encodeText("Autocutter: CHECKED\n"),
    encodeText("Cash Drawer Kick: READY\n"),
    encodeText("--------------------------------\n"),
    COMMANDS.FEED_3_LINES,
    COMMANDS.PAPER_CUT_PARTIAL,
  ];

  return await printDirectHardware(concatByteArrays(chunks));
}
