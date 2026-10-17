import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";

async function generatePdf() {
  const pdfDoc = await PDFDocument.create();

  // Load standard fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Color Palette
  const primaryDark = rgb(0.08, 0.12, 0.22); // #141f38
  const accentBlue = rgb(0.12, 0.42, 0.88);  // #1f6be0
  const accentPurple = rgb(0.42, 0.22, 0.82); // #6b38d1
  const headerBg = rgb(0.93, 0.95, 0.98);
  const textDark = rgb(0.12, 0.15, 0.2);
  const textMuted = rgb(0.42, 0.46, 0.54);
  const borderLight = rgb(0.82, 0.86, 0.92);
  const rowEvenBg = rgb(0.98, 0.99, 1.0);
  const rowOddBg = rgb(1.0, 1.0, 1.0);
  const pwdGreen = rgb(0.08, 0.52, 0.22);
  const highlightBoxBg = rgb(0.93, 0.98, 0.95);
  const highlightBoxBorder = rgb(0.2, 0.68, 0.38);
  const cardBg = rgb(0.98, 0.99, 1.0);
  const cardBorder = rgb(0.85, 0.89, 0.95);

  // =========================================================================
  // PAGE 1: CREDENTIALS DIRECTORY (Landscape A4: 841.89 x 595.28)
  // =========================================================================
  const page1 = pdfDoc.addPage([841.89, 595.28]);
  const { width: p1Width, height: p1Height } = page1.getSize();

  let y = p1Height - 32;

  // Title & Subtitle
  page1.drawText("ZionaPOS Cloud ERP -- Multi-Industry Demo Environments", {
    x: 35,
    y,
    size: 18,
    font: fontBold,
    color: primaryDark,
  });

  y -= 15;
  page1.drawText("Master Test Tenant Credentials & Complete Feature Directory (9 Production Verticals Ready-to-Test)", {
    x: 35,
    y,
    size: 9.5,
    font: fontRegular,
    color: textMuted,
  });

  y -= 26;

  // Master Password & Portal Access Banner
  page1.drawRectangle({
    x: 35,
    y: y - 24,
    width: p1Width - 70,
    height: 36,
    color: highlightBoxBg,
    borderColor: highlightBoxBorder,
    borderWidth: 1.2,
  });

  page1.drawText("DEFAULT MASTER PASSWORD FOR ALL 9 ACCOUNTS:", {
    x: 48,
    y: y - 12,
    size: 9,
    font: fontBold,
    color: rgb(0.08, 0.45, 0.2),
  });

  page1.drawText("ZionaPOS@2026", {
    x: 325,
    y: y - 13,
    size: 12,
    font: fontBold,
    color: pwdGreen,
  });

  page1.drawText("(Super-Admin / OWNER Role with unlimited quotas & all features enabled)", {
    x: 435,
    y: y - 12,
    size: 8,
    font: fontOblique,
    color: textMuted,
  });

  page1.drawText("Live Production URL: https://www.zionapos.store/login  |  Local Dev: http://localhost:3005/login", {
    x: 48,
    y: y - 22,
    size: 8,
    font: fontBold,
    color: accentBlue,
  });

  y -= 40;

  // Table Configuration
  const colWidths = [18, 110, 125, 115, 125, 85, 193];
  const headers = [
    "#",
    "Industry Vertical",
    "Store / Tenant Name",
    "Slug & Public Link",
    "Login Email",
    "Password",
    "Key Industry Features & Capabilities",
  ];
  const tableX = 35;
  const headerHeight = 22;
  const rowHeight = 35;

  // Draw Header Row
  page1.drawRectangle({
    x: tableX,
    y: y - headerHeight,
    width: p1Width - 70,
    height: headerHeight,
    color: headerBg,
    borderColor: borderLight,
    borderWidth: 1,
  });

  let curX = tableX;
  for (let i = 0; i < headers.length; i++) {
    page1.drawText(headers[i], {
      x: curX + 4,
      y: y - 15,
      size: 8,
      font: fontBold,
      color: primaryDark,
    });
    curX += colWidths[i];
    if (i < headers.length - 1) {
      page1.drawLine({
        start: { x: curX, y },
        end: { x: curX, y: y - headerHeight },
        color: borderLight,
        thickness: 1,
      });
    }
  }

  y -= headerHeight;

  // 9 Accounts Data
  const accounts = [
    {
      num: "1",
      industry: "Retail & Supermarket",
      tenant: "SmartBazaar Retail Mart",
      slug: "demo-retail",
      publicUrl: "zionapos.store/login",
      email: "retail.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "AI Purchase Bill OCR Scan, Scale EAN-13 barcodes, Dual Pole Display, Shift Cash Float.",
    },
    {
      num: "2",
      industry: "Restaurant & Cafe",
      tenant: "The Spice Route Kitchen",
      slug: "demo-restaurant",
      publicUrl: "zionapos.store/order/demo-restaurant",
      email: "restaurant.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Contactless QR Table Ordering, Kitchen KOT Routing, Recipe BOM Depletion, Bill Split.",
    },
    {
      num: "3",
      industry: "Automobile & Garage",
      tenant: "Apex Pro Motors Workshop",
      slug: "demo-garage",
      publicUrl: "zionapos.store/garage",
      email: "garage.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Vehicle Reg. Master, Digital Job Cards, Hybrid SAC 9987 Labour + HSN 8708 Spares, Gate Pass.",
    },
    {
      num: "4",
      industry: "Wholesale & FMCG",
      tenant: "Horizon FMCG Distributors",
      slug: "demo-distribution",
      publicUrl: "zionapos.store/inventory/transfers",
      email: "distribution.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "AI Bill Inwarding, Multi-Depot Transfers, Dual Units (PCS/BOX), Tiered Wholesale Pricing.",
    },
    {
      num: "5",
      industry: "Pharmacy & Healthcare",
      tenant: "CarePlus Healthcare Pharmacy",
      slug: "demo-pharma",
      publicUrl: "zionapos.store/pharmacy/register",
      email: "pharma.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Batch Near-Expiry Alerts (30/60/90d), Schedule H/H1 Register, Doctor Master, 20B/21B.",
    },
    {
      num: "6",
      industry: "Professional Services",
      tenant: "Nexora Tech & Consulting",
      slug: "demo-services",
      publicUrl: "zionapos.store/customers/aging",
      email: "services.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "SAC 9983 Cloud Consulting, AMC Retainer Contracts, Khata Ledger, Inter-State IGST.",
    },
    {
      num: "7",
      industry: "Textiles & Apparel",
      tenant: "Vogue & Velvet Apparel",
      slug: "demo-apparel",
      publicUrl: "zionapos.store/inventory/variants",
      email: "apparel.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "2D Size-Color Matrix, Parent-Child Barcode Labels, Fabric Meter Cut Deductions, 12% GST.",
    },
    {
      num: "8",
      industry: "Electronics & Mobiles",
      tenant: "ElectroPulse Digital Mart",
      slug: "demo-electronics",
      publicUrl: "zionapos.store/inventory",
      email: "electronics.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Dual 15-Digit IMEI/Serial Tracking, Instant Warranty Lookup, Brand EMI Schemes, Trade-In.",
    },
    {
      num: "9",
      industry: "Salon, Spa & Wellness",
      tenant: "Aura Luxury Salon & Spa",
      slug: "demo-salon",
      publicUrl: "zionapos.store/book/demo-salon",
      email: "salon.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Zero-Wait Customer Booking, Smartphone PWA 1-Tap Re-Book, Tabletop Standee QR, Commissions.",
    },
  ];

  for (let r = 0; r < accounts.length; r++) {
    const row = accounts[r];
    const isEven = r % 2 === 0;

    page1.drawRectangle({
      x: tableX,
      y: y - rowHeight,
      width: p1Width - 70,
      height: rowHeight,
      color: isEven ? rowEvenBg : rowOddBg,
      borderColor: borderLight,
      borderWidth: 1,
    });

    let cellX = tableX;

    // 0: #
    page1.drawText(row.num, {
      x: cellX + 5,
      y: y - 21,
      size: 8,
      font: fontBold,
      color: primaryDark,
    });
    cellX += colWidths[0];

    // 1: Industry
    page1.drawText(row.industry, {
      x: cellX + 4,
      y: y - 21,
      size: 7.5,
      font: fontBold,
      color: accentBlue,
    });
    cellX += colWidths[1];

    // 2: Tenant Name
    page1.drawText(row.tenant, {
      x: cellX + 4,
      y: y - 21,
      size: 7.5,
      font: fontBold,
      color: textDark,
    });
    cellX += colWidths[2];

    // 3: Slug & Public Link
    page1.drawText(row.slug, {
      x: cellX + 4,
      y: y - 15,
      size: 7,
      font: fontBold,
      color: primaryDark,
    });
    page1.drawText(row.publicUrl, {
      x: cellX + 4,
      y: y - 26,
      size: 6,
      font: fontRegular,
      color: accentPurple,
    });
    cellX += colWidths[3];

    // 4: Email
    page1.drawText(row.email, {
      x: cellX + 4,
      y: y - 21,
      size: 7,
      font: fontBold,
      color: primaryDark,
    });
    cellX += colWidths[4];

    // 5: Password
    page1.drawText(row.password, {
      x: cellX + 4,
      y: y - 21,
      size: 7.5,
      font: fontBold,
      color: pwdGreen,
    });
    cellX += colWidths[5];

    // 6: Features (wrap text into 2 lines)
    const words = row.features.split(" ");
    let line1 = "";
    let line2 = "";
    for (const w of words) {
      if ((line1 + " " + w).length < 48) {
        line1 += (line1 ? " " : "") + w;
      } else {
        line2 += (line2 ? " " : "") + w;
      }
    }

    page1.drawText(line1, {
      x: cellX + 4,
      y: y - 14,
      size: 6.5,
      font: fontRegular,
      color: textDark,
    });
    if (line2) {
      page1.drawText(line2, {
        x: cellX + 4,
        y: y - 25,
        size: 6.5,
        font: fontRegular,
        color: textMuted,
      });
    }

    // Vertical column grid lines
    let lineX = tableX;
    for (let c = 0; c < colWidths.length - 1; c++) {
      lineX += colWidths[c];
      page1.drawLine({
        start: { x: lineX, y },
        end: { x: lineX, y: y - rowHeight },
        color: borderLight,
        thickness: 0.8,
      });
    }

    y -= rowHeight;
  }

  // Footer notes on Page 1
  y -= 14;
  page1.drawText("Platform Security Architecture: Fully isolated multi-tenant database. Catalog items, taxes, customers, and reports are strictly partitioned.", {
    x: 35,
    y,
    size: 7.5,
    font: fontRegular,
    color: textMuted,
  });
  y -= 11;
  page1.drawText("Dynamic Zero-Wait Customer Booking Engine: Salon customers book via https://www.zionapos.store/book/demo-salon (No login required).", {
    x: 35,
    y,
    size: 7.5,
    font: fontBold,
    color: accentBlue,
  });

  // =========================================================================
  // PAGE 2: VERTICALS 1 TO 3 IN-DEPTH TESTING GUIDE (Portrait A4: 595.28 x 841.89)
  // =========================================================================
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  const { width: p2Width, height: p2Height } = page2.getSize();

  let y2 = p2Height - 38;

  page2.drawText("Industry Feature Guide -- Part 1: Verticals 1 to 3", {
    x: 40,
    y: y2,
    size: 16,
    font: fontBold,
    color: primaryDark,
  });
  y2 -= 15;
  page2.drawText("Retail Supermarket, F&B Restaurant, and Automobile Garage & Workshop", {
    x: 40,
    y: y2,
    size: 9.5,
    font: fontRegular,
    color: textMuted,
  });
  y2 -= 20;

  const part1Sections = [
    {
      title: "1. Retail & Supermarket POS (retail.demo@zionapos.com)",
      tag: "High-Speed Retail * Barcode Automation * Cash Float * AI Scan",
      features: [
        "[AI SCAN] Gemini AI Purchase Bill OCR: Photo/upload paper supplier bills to auto-extract items, rates, taxes & batches.",
        "[BARCODE] High-Speed POS Checkout: Scan standard EAN-13 barcodes (e.g. '890103000001' Basmati Rice) with sub-second response.",
        "[SCALE] Weighing Scale EAN-13 Decoding: Auto-parses price/weight embedded 13-digit barcodes for fresh produce & meat.",
        "[DISPLAY] Dual Customer Pole Display: Live websocket streaming of line items & total to customer screen (/display).",
        "[FLOAT] Shift Cash Drawer Float: Track shift opening cash, cash tender, refunds, and closing reconciliation (/billing/shifts).",
      ],
    },
    {
      title: "2. Restaurant & Cafe F&B (restaurant.demo@zionapos.com)",
      tag: "Contactless QR * Table Matrix * Kitchen KOT * Recipe BOM Depletion",
      features: [
        "[QR ORDER] Contactless Table Ordering: Guests scan table QR (zionapos.store/order/demo-restaurant/1) to place orders.",
        "[FLOOR] Visual Table Matrix: Real-time visual floor status across Main Dining Hall, AC Family Room, and Rooftop Lounge.",
        "[KOT] Kitchen Order Ticket Routing: Real-time order routing to kitchen stations with special preparation notes.",
        "[BOM] Recipe BOM Auto-Depletion: Ordering Biryani automatically depletes raw chicken & basmati rice from kitchen stock.",
        "[SETTLE] Bill Splitting & UPI Settle: Split bills evenly or by item; settle via dynamic UPI QR code on 80mm thermal slip.",
      ],
    },
    {
      title: "3. Automobile Workshop & Garage (garage.demo@zionapos.com)",
      tag: "Vehicle Registry * Digital Job Cards * Hybrid Labour/Spares * Gate Pass",
      features: [
        "[VEHICLE] Vehicle Master Registry: Search by license plate (e.g. 'KL-07-CB-5544'), chassis number, mileage & fuel level.",
        "[JOB CARD] Digital Multi-Stage Job Cards: Track service stages (Inspection -> In Progress -> Quality Check -> Ready).",
        "[HYBRID] Hybrid GST Billing: Seamlessly combines SAC 9987 Labour Services (18%) + OEM Spare Parts HSN 8708 (28%).",
        "[HISTORY] Vehicle Service History: Instant timeline view of previous visits, technician notes, and recommended jobs.",
        "[GATE PASS] Gate Pass & Tax Invoice: Generate delivery gate passes with vehicle odometer and authorized signature.",
      ],
    },
  ];

  for (const s of part1Sections) {
    page2.drawRectangle({
      x: 38,
      y: y2 - 210,
      width: p2Width - 76,
      height: 205,
      color: cardBg,
      borderColor: cardBorder,
      borderWidth: 1,
    });

    page2.drawText(s.title, {
      x: 50,
      y: y2 - 20,
      size: 11,
      font: fontBold,
      color: primaryDark,
    });

    page2.drawText(s.tag, {
      x: 50,
      y: y2 - 34,
      size: 7.5,
      font: fontBold,
      color: accentBlue,
    });

    let itemY = y2 - 54;
    for (const feat of s.features) {
      const words = feat.split(" ");
      let l1 = "";
      let l2 = "";
      for (const w of words) {
        if ((l1 + " " + w).length < 88) {
          l1 += (l1 ? " " : "") + w;
        } else {
          l2 += (l2 ? " " : "") + w;
        }
      }

      page2.drawText(l1, {
        x: 52,
        y: itemY,
        size: 7.5,
        font: fontRegular,
        color: textDark,
      });
      itemY -= 11;
      if (l2) {
        page2.drawText(l2, {
          x: 65,
          y: itemY,
          size: 7.5,
          font: fontRegular,
          color: textDark,
        });
        itemY -= 12;
      } else {
        itemY -= 3;
      }
    }

    y2 -= 225;
  }

  page2.drawText("ZionaPOS Cloud ERP -- Multi-Tenant Multi-Industry Platform | Page 2 of 5", {
    x: 40,
    y: 25,
    size: 7.5,
    font: fontOblique,
    color: textMuted,
  });

  // =========================================================================
  // PAGE 3: VERTICALS 4 TO 6 IN-DEPTH TESTING GUIDE (Portrait A4: 595.28 x 841.89)
  // =========================================================================
  const page3 = pdfDoc.addPage([595.28, 841.89]);
  const { width: p3Width, height: p3Height } = page3.getSize();

  let y3 = p3Height - 38;

  page3.drawText("Industry Feature Guide -- Part 2: Verticals 4 to 6", {
    x: 40,
    y: y3,
    size: 16,
    font: fontBold,
    color: primaryDark,
  });
  y3 -= 15;
  page3.drawText("Wholesale FMCG, Pharmacy & Healthcare, and Professional Services", {
    x: 40,
    y: y3,
    size: 9.5,
    font: fontRegular,
    color: textMuted,
  });
  y3 -= 20;

  const part2Sections = [
    {
      title: "4. Wholesale FMCG & Distribution (distribution.demo@zionapos.com)",
      tag: "AI Inwarding * Multi-Warehouse * Dual Packaging * Price Lists",
      features: [
        "[AI INWARD] AI Purchase Bill Inwarding: Bulk scan supplier invoices directly into Central Depot warehouse stock.",
        "[TRANSFERS] Multi-Depot Stock Transfers: Inter-warehouse dispatch from Central Depot to Regional Vans with transit audit.",
        "[DUAL UNIT] Dual Packaging Units: Bill in both Primary & Secondary units (e.g. 1 CASE = 12 BOTTLES) with ratio conversion.",
        "[PRICE LIST] Multi-Tier Price Lists: Custom pricing tiers (Tier-1 Wholesale, Super-Stockist, Retail Trader discounts).",
        "[TERRITORY] Route & Beat Planning: Assign customer khata ledgers to sales territories and field agent beats (/territories).",
      ],
    },
    {
      title: "5. Pharmacy & Healthcare (pharma.demo@zionapos.com)",
      tag: "Batch Expiry Quarantine * Schedule H/H1 Drugs * Doctor Master * 20B/21B",
      features: [
        "[EXPIRY] 30/60/90 Day Expiry Quarantine: Live dashboard alerts for near-expiry drugs; prevents billing expired batches.",
        "[SCHEDULE] Schedule H & H1 Dispensing Register: Mandatory prescription audit log recording patient & doctor details.",
        "[DOCTOR] Prescribing Doctor Master: Fast doctor registration autocomplete with state medical council registration numbers.",
        "[LICENSES] Drug Licenses 20B & 21B: Automated statutory drug license number & batch details printed on tax invoices.",
        "[UNIT] Strip-to-Tablet Fractional Dispensing: Accurately dispenses individual tablets from 10-tablet blister strips.",
      ],
    },
    {
      title: "6. Professional Services & AMC (services.demo@zionapos.com)",
      tag: "SAC 9983 Billing * AMC Contracts * Corporate Khata * Inter-State IGST",
      features: [
        "[HOURLY] Hourly & Project Billing: Bill IT consulting, architecture, and legal services under SAC 9983 / SAC 9987.",
        "[AMC] Annual Maintenance Contracts (AMC): Recurring contract billing with start/end validity dates and service quotas.",
        "[KHATA] Corporate Client Khata Ledger: Complete credit ledger, credit limit controls, and 30/60/90 days aging report.",
        "[IGST] Automated IGST vs CGST/SGST: Automatic interstate tax determination based on Client GSTIN & Place of Supply.",
        "[GST TAX] GSTR-1 & Statutory Filing: Instant export of B2B and B2C sales summary ready for GST portal upload.",
      ],
    },
  ];

  for (const s of part2Sections) {
    page3.drawRectangle({
      x: 38,
      y: y3 - 210,
      width: p3Width - 76,
      height: 205,
      color: cardBg,
      borderColor: cardBorder,
      borderWidth: 1,
    });

    page3.drawText(s.title, {
      x: 50,
      y: y3 - 20,
      size: 11,
      font: fontBold,
      color: primaryDark,
    });

    page3.drawText(s.tag, {
      x: 50,
      y: y3 - 34,
      size: 7.5,
      font: fontBold,
      color: accentBlue,
    });

    let itemY = y3 - 54;
    for (const feat of s.features) {
      const words = feat.split(" ");
      let l1 = "";
      let l2 = "";
      for (const w of words) {
        if ((l1 + " " + w).length < 88) {
          l1 += (l1 ? " " : "") + w;
        } else {
          l2 += (l2 ? " " : "") + w;
        }
      }

      page3.drawText(l1, {
        x: 52,
        y: itemY,
        size: 7.5,
        font: fontRegular,
        color: textDark,
      });
      itemY -= 11;
      if (l2) {
        page3.drawText(l2, {
          x: 65,
          y: itemY,
          size: 7.5,
          font: fontRegular,
          color: textDark,
        });
        itemY -= 12;
      } else {
        itemY -= 3;
      }
    }

    y3 -= 225;
  }

  page3.drawText("ZionaPOS Cloud ERP -- Multi-Tenant Multi-Industry Platform | Page 3 of 5", {
    x: 40,
    y: 25,
    size: 7.5,
    font: fontOblique,
    color: textMuted,
  });

  // =========================================================================
  // PAGE 4: VERTICALS 7 TO 9 IN-DEPTH TESTING GUIDE (Portrait A4: 595.28 x 841.89)
  // =========================================================================
  const page4 = pdfDoc.addPage([595.28, 841.89]);
  const { width: p4Width, height: p4Height } = page4.getSize();

  let y4 = p4Height - 38;

  page4.drawText("Industry Feature Guide -- Part 3: Verticals 7 to 9", {
    x: 40,
    y: y4,
    size: 16,
    font: fontBold,
    color: primaryDark,
  });
  y4 -= 15;
  page4.drawText("Textiles & Apparel, Electronics & Mobile Stores, and World-Standard Salon & Spa", {
    x: 40,
    y: y4,
    size: 9.5,
    font: fontRegular,
    color: textMuted,
  });
  y4 -= 20;

  const part3Sections = [
    {
      title: "7. Textiles & Apparel Store (apparel.demo@zionapos.com)",
      tag: "2D Size-Color Matrix * Barcode Hang-Tags * Fabric Meter Cuts * 12% GST",
      features: [
        "[MATRIX] 2D Size-Color-Fit Matrix: Auto-generate SKU combinations across sizes (S/M/L/XL) & colors with 1 click.",
        "[TAGS] Parent-Child Barcode Generator: Print Code128 / EAN garment hang-tags with MRP, Size, Color, and HSN.",
        "[FABRIC] Fabric Meter Cut Stock Deduction: Deduct fractional lengths (e.g. 2.75 meters) directly from fabric roll bolts.",
        "[SLABS] Apparel Statutory GST Slab: Native compliance for 5% vs 12% GST apparel thresholds and HSN 50-63.",
        "[RETURNS] Garment Exchange & Credit Note: Quick customer size exchange workflow with credit note issuance.",
      ],
    },
    {
      title: "8. Electronics & Mobile Store (electronics.demo@zionapos.com)",
      tag: "Dual 15-Digit IMEI * Warranty History * Brand EMI * Trade-In Vouchers",
      features: [
        "[IMEI] Dual 15-Digit IMEI Tracking: Inward and bill phones with mandatory IMEI-1 & IMEI-2 serial capture.",
        "[WARRANTY] 1-Second Instant Warranty Lookup: Search customer invoice, purchase date & brand warranty by IMEI number.",
        "[FINANCE] Consumer Brand EMI Schemes: Split payment into financing partners (Bajaj, HDFC, PineLabs) and down-payment.",
        "[EXCHANGE] Old Gadget Trade-In Vouchers: Evaluate used phones/laptops and generate instant trade-in credit vouchers.",
        "[SERIAL] Serial Number Tracking for IT Hardware: Serialized warranty tracking for Laptops, GPUs, TVs, and Printers.",
      ],
    },
    {
      title: "9. Salon, Spa & Wellness Center (salon.demo@zionapos.com)",
      tag: "Zero-Wait Self-Booking * Smartphone PWA Shortcut * Standee QR * Stylist Commissions",
      features: [
        "[SELF-BOOK] Zero-Wait Customer Booking Portal: Live slot calendar at /book/demo-salon (collision-free 30m slots).",
        "[PWA] Smartphone PWA 'Add to Home Screen': 1-tap browser install prompt and instant '1-Tap Re-Book Usual Services'.",
        "[STAND-QR] Reception Standee QR & WhatsApp Share: Printable tabletop QR standee modal with 1-click WhatsApp link share.",
        "[CHAIRS] Floor Chair Live Matrix & Token Lounge: Visual chairs, walk-in token lounge, and 1-click POS billing bridge.",
        "[COMMISSIONS] Stylist Commissions & Leaderboard: Automated service commissions, tips, and live stylist performance boards.",
        "[CONSUMABLES] Backbar Consumables Auto-Depletion: Salon shampoos & facial serums automatically deduct upon service billing.",
      ],
    },
  ];

  for (const s of part3Sections) {
    page4.drawRectangle({
      x: 38,
      y: y4 - 210,
      width: p4Width - 76,
      height: 205,
      color: cardBg,
      borderColor: cardBorder,
      borderWidth: 1,
    });

    page4.drawText(s.title, {
      x: 50,
      y: y4 - 20,
      size: 11,
      font: fontBold,
      color: primaryDark,
    });

    page4.drawText(s.tag, {
      x: 50,
      y: y4 - 34,
      size: 7.5,
      font: fontBold,
      color: accentBlue,
    });

    let itemY = y4 - 52;
    for (const feat of s.features) {
      const words = feat.split(" ");
      let l1 = "";
      let l2 = "";
      for (const w of words) {
        if ((l1 + " " + w).length < 88) {
          l1 += (l1 ? " " : "") + w;
        } else {
          l2 += (l2 ? " " : "") + w;
        }
      }

      page4.drawText(l1, {
        x: 52,
        y: itemY,
        size: 7.2,
        font: fontRegular,
        color: textDark,
      });
      itemY -= 10.5;
      if (l2) {
        page4.drawText(l2, {
          x: 65,
          y: itemY,
          size: 7.2,
          font: fontRegular,
          color: textDark,
        });
        itemY -= 11.5;
      } else {
        itemY -= 2;
      }
    }

    y4 -= 225;
  }

  page4.drawText("ZionaPOS Cloud ERP -- Multi-Tenant Multi-Industry Platform | Page 4 of 5", {
    x: 40,
    y: 25,
    size: 7.5,
    font: fontOblique,
    color: textMuted,
  });

  // =========================================================================
  // PAGE 5: PLATFORM-WIDE HIGHLIGHTS & ARCHITECTURE (Portrait A4: 595.28 x 841.89)
  // =========================================================================
  const page5 = pdfDoc.addPage([595.28, 841.89]);
  const { width: p5Width, height: p5Height } = page5.getSize();

  let y5 = p5Height - 38;

  page5.drawText("ZionaPOS Core Technologies & Enterprise Architecture", {
    x: 40,
    y: y5,
    size: 16,
    font: fontBold,
    color: primaryDark,
  });
  y5 -= 15;
  page5.drawText("Next-Gen AI, Statutory Compliance, Omnichannel Automation & Cloud Infrastructure", {
    x: 40,
    y: y5,
    size: 9.5,
    font: fontRegular,
    color: textMuted,
  });
  y5 -= 24;

  const coreCards = [
    {
      title: "[AI OCR] Gemini AI Purchase Bill OCR Scanner",
      color: rgb(0.94, 0.96, 1.0),
      border: rgb(0.3, 0.5, 0.9),
      points: [
        "* Eliminates manual data entry by 100% using multimodal Gemini Vision OCR technology.",
        "* Instantly extracts Supplier Name, GSTIN, Invoice Date, HSN Codes, Line Items, MRP, and Buy Rates.",
        "* Auto-detects medicine batch numbers, manufacturing/expiry dates, and IMEI serials directly into inventory.",
        "* Fully integrated into the Inward Purchase workflow (/inventory/purchase and /scan-purchase).",
      ],
    },
    {
      title: "[BOOKING] Zero-Wait Multi-Tenant Customer Booking Portal",
      color: rgb(0.95, 0.98, 0.96),
      border: rgb(0.2, 0.65, 0.35),
      points: [
        "* Dedicated public booking URL for every store: https://www.zionapos.store/book/[slug] (No customer login required).",
        "* Collision-free slot engine checks stylist schedules & existing appointments in real-time.",
        "* Progressive Web App (PWA) prompt lets smartphone customers add the salon app to their home screen.",
        "* 1-Tap Repeat Booking stores customer service preferences and favorite stylist for instant re-booking.",
        "* Reception tabletop standee QR modal with 1-click direct WhatsApp booking link sharing.",
      ],
    },
    {
      title: "[BOT] Two-Way Interactive WhatsApp Bot Webhook",
      color: rgb(0.98, 0.96, 0.99),
      border: rgb(0.65, 0.25, 0.75),
      points: [
        "* Official Meta Cloud API webhook (/api/whatsapp/webhook) with signature verification.",
        "* Real-time customer self-service keywords: 'DUES' (balance khata), 'BILL' (last PDF invoice), 'PAY' (UPI link).",
        "* Automated payment reminders with embedded dynamic UPI payment links and instant payment acknowledgement.",
      ],
    },
    {
      title: "[UPI & GST] Dynamic NPCI UPI QR & Statutory GST Compliance",
      color: rgb(0.99, 0.97, 0.94),
      border: rgb(0.85, 0.55, 0.15),
      points: [
        "* Dynamic BharatQR encoded with exact invoice paise amount generated directly on 80mm/58mm thermal bills.",
        "* Automatic GST calculation: Intra-state (CGST + SGST) vs Inter-state (IGST), B2B vs B2C, HSN/SAC summaries.",
        "* Statutory GSTR-1 and GSTR-3B tax reports ready for direct portal e-filing.",
      ],
    },
    {
      title: "[SECURITY] Enterprise Multi-Tenancy & Hardware Compatibility",
      color: rgb(0.95, 0.96, 0.98),
      border: rgb(0.4, 0.45, 0.55),
      points: [
        "* Complete logical tenant isolation hosted on high-performance Neon PostgreSQL serverless cloud.",
        "* Driverless hardware support: 80mm & 58mm ESC/POS thermal printers, weighing scale barcodes, pole displays, A4 PDF.",
        "* Granular Role-Based Access Control (RBAC): Distinct permissions for OWNER, MANAGER, CASHIER, and STAFF.",
      ],
    },
  ];

  for (const card of coreCards) {
    page5.drawRectangle({
      x: 38,
      y: y5 - 110,
      width: p5Width - 76,
      height: 105,
      color: card.color,
      borderColor: card.border,
      borderWidth: 1,
    });

    page5.drawText(card.title, {
      x: 48,
      y: y5 - 18,
      size: 9.5,
      font: fontBold,
      color: primaryDark,
    });

    let ptY = y5 - 34;
    for (const pt of card.points) {
      page5.drawText(pt, {
        x: 52,
        y: ptY,
        size: 7.2,
        font: fontRegular,
        color: textDark,
      });
      ptY -= 12.5;
    }

    y5 -= 120;
  }

  // Footer notes on Page 5
  page5.drawText("ZionaPOS Cloud ERP -- Built for India, Scaled for Global Retail & Services | Page 5 of 5", {
    x: 40,
    y: 25,
    size: 7.5,
    font: fontOblique,
    color: textMuted,
  });

  // Save PDF bytes
  const pdfBytes = await pdfDoc.save();

  // 1. Save to project root
  const outPathRoot = path.join(process.cwd(), "ZionaPOS_Industry_Demo_Credentials.pdf");
  fs.writeFileSync(outPathRoot, pdfBytes);
  console.log(`Saved PDF to: ${outPathRoot}`);

  // 2. Save to public directory (accessible directly via https://www.zionapos.store/ZionaPOS_Industry_Demo_Credentials.pdf)
  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const outPathPublic = path.join(publicDir, "ZionaPOS_Industry_Demo_Credentials.pdf");
  fs.writeFileSync(outPathPublic, pdfBytes);
  console.log(`Saved PDF to: ${outPathPublic}`);

  // 3. Save to current artifact directory
  const artifactDir = "C:\\Users\\dell\\.gemini\\antigravity\\brain\\8b96b443-8a8d-4cf4-ae2f-eb78ba7fe41d";
  if (fs.existsSync(artifactDir)) {
    const outPathArtifact = path.join(artifactDir, "ZionaPOS_Industry_Demo_Credentials.pdf");
    fs.writeFileSync(outPathArtifact, pdfBytes);
    console.log(`Saved PDF to: ${outPathArtifact}`);
  }
}

generatePdf().catch((err) => {
  console.error("Failed to generate PDF:", err);
  process.exit(1);
});
