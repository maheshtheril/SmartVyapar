import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";

async function generateMarketingPdf() {
  const pdfDoc = await PDFDocument.create();

  // Load standard fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Modern corporate color palette
  const primaryDark = rgb(0.06, 0.1, 0.2);     // #0f1a33
  const brandIndigo = rgb(0.3, 0.2, 0.82);    // #4d33d1
  const accentBlue = rgb(0.1, 0.45, 0.9);     // #1a73e8
  const emeraldGreen = rgb(0.05, 0.55, 0.25); // #0d8c40
  const amberGold = rgb(0.85, 0.55, 0.1);     // #d98c1a
  const textDark = rgb(0.12, 0.15, 0.22);
  const textMuted = rgb(0.42, 0.46, 0.54);
  const borderLight = rgb(0.82, 0.86, 0.92);
  const cardBg = rgb(0.97, 0.98, 1.0);
  const cardBorder = rgb(0.85, 0.89, 0.95);
  const highlightGreenBg = rgb(0.93, 0.98, 0.95);
  const highlightGreenBorder = rgb(0.2, 0.68, 0.38);

  // Page dimensions (Standard A4 Portrait: 595.28 x 841.89)
  const pageWidth = 595.28;
  const pageHeight = 841.89;

  // =========================================================================
  // PAGE 1: COVER & EXECUTIVE SOLUTION BRIEF
  // =========================================================================
  const page1 = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - 45;

  // Header Brand Tag
  page1.drawRectangle({
    x: 40,
    y: y - 18,
    width: 140,
    height: 22,
    color: rgb(0.92, 0.94, 1.0),
    borderColor: brandIndigo,
    borderWidth: 1,
  });
  page1.drawText("ENTERPRISE SOLUTION BRIEF", {
    x: 48,
    y: y - 12,
    size: 7.5,
    font: fontBold,
    color: brandIndigo,
  });

  y -= 42;

  // Main Headline
  page1.drawText("ZionaPOS Cloud ERP", {
    x: 40,
    y,
    size: 26,
    font: fontBold,
    color: primaryDark,
  });
  y -= 22;
  page1.drawText("Next-Gen All-in-One Operating System for Modern Businesses", {
    x: 40,
    y,
    size: 13,
    font: fontBold,
    color: accentBlue,
  });
  y -= 16;
  page1.drawText("Unifying Point-of-Sale, AI Automation, Zero-Wait Customer Booking, and GST Compliance", {
    x: 40,
    y,
    size: 9.5,
    font: fontRegular,
    color: textMuted,
  });

  y -= 26;

  // Hero Value Metric Cards (Row of 3)
  const heroMetrics = [
    { value: "99.4%", label: "AI OCR Accuracy", desc: "Zero manual purchase data entry" },
    { value: "0 Mins", label: "Customer Wait Time", desc: "Automated slot booking engine" },
    { value: "Rs 499", label: "Disruptor Pricing", desc: "Full Pro ERP vs legacy Rs 30k/yr" },
  ];

  const mCardWidth = (pageWidth - 80 - 20) / 3;
  for (let m = 0; m < heroMetrics.length; m++) {
    const mx = 40 + m * (mCardWidth + 10);
    page1.drawRectangle({
      x: mx,
      y: y - 56,
      width: mCardWidth,
      height: 56,
      color: highlightGreenBg,
      borderColor: highlightGreenBorder,
      borderWidth: 1,
    });
    page1.drawText(heroMetrics[m].value, {
      x: mx + 12,
      y: y - 22,
      size: 16,
      font: fontBold,
      color: emeraldGreen,
    });
    page1.drawText(heroMetrics[m].label, {
      x: mx + 12,
      y: y - 36,
      size: 8.5,
      font: fontBold,
      color: primaryDark,
    });
    page1.drawText(heroMetrics[m].desc, {
      x: mx + 12,
      y: y - 48,
      size: 7,
      font: fontRegular,
      color: textMuted,
    });
  }

  y -= 74;

  // Executive Problem & Solution Section
  page1.drawText("The Market Challenge We Solve", {
    x: 40,
    y,
    size: 12,
    font: fontBold,
    color: primaryDark,
  });
  y -= 14;

  page1.drawRectangle({
    x: 40,
    y: y - 95,
    width: pageWidth - 80,
    height: 95,
    color: rgb(0.99, 0.98, 0.98),
    borderColor: rgb(0.9, 0.8, 0.8),
    borderWidth: 1,
  });

  const painPoints = [
    "* Fragmented Chaos: Typical retailers juggle 3 to 5 separate tools (POS, accounting, WhatsApp reminders, booking).",
    "* 3+ Hours Wasted Daily: Manual data entry of supplier bills, barcode labeling, and calculating employee commissions.",
    "* Lost Customers & Long Queues: Walk-in bottlenecks, crowded waiting lobbies, and no digital repeat-visit incentives.",
    "* Outdated Desktop Software: Legacy desktop software locks data to one PC, crashes often, and lacks mobile access.",
  ];

  let py = y - 18;
  for (const p of painPoints) {
    page1.drawText(p, {
      x: 52,
      y: py,
      size: 8,
      font: fontRegular,
      color: textDark,
    });
    py -= 18;
  }

  y -= 112;

  // The ZionaPOS Unified Advantage
  page1.drawText("The ZionaPOS Cloud Advantage", {
    x: 40,
    y,
    size: 12,
    font: fontBold,
    color: primaryDark,
  });
  y -= 14;

  page1.drawRectangle({
    x: 40,
    y: y - 110,
    width: pageWidth - 80,
    height: 110,
    color: cardBg,
    borderColor: cardBorder,
    borderWidth: 1,
  });

  const advantages = [
    "1. 100% Cloud Serverless: Access from any device (Phone, Tablet, Laptop, Touch POS) with instant multi-branch sync.",
    "2. Multimodal Gemini AI OCR: Snap a photo of any purchase bill; items, prices, batches & taxes inward in 2 seconds.",
    "3. Zero-Wait Customer Booking Portal: Dedicated branded link (zionapos.store/book/[slug]) with PWA home screen install.",
    "4. Official WhatsApp 2-Way Bot: Automated customer balance inquiries (DUES), instant PDF bills, and UPI pay links.",
    "5. 9 Turnkey Industry Verticals: Pre-configured workflows for Retail, Restaurant, Garage, Pharma, Apparel, Salon & more.",
  ];

  let ay = y - 18;
  for (const a of advantages) {
    page1.drawText(a, {
      x: 52,
      y: ay,
      size: 8,
      font: fontRegular,
      color: textDark,
    });
    ay -= 18;
  }

  y -= 126;

  // Live Portal & Quick Links
  page1.drawRectangle({
    x: 40,
    y: y - 48,
    width: pageWidth - 80,
    height: 48,
    color: rgb(0.95, 0.96, 1.0),
    borderColor: brandIndigo,
    borderWidth: 1,
  });

  page1.drawText("Live Production Platform: https://www.zionapos.store", {
    x: 52,
    y: y - 18,
    size: 9.5,
    font: fontBold,
    color: brandIndigo,
  });
  page1.drawText("Experience Instant Customer Booking: https://www.zionapos.store/book/demo-salon", {
    x: 52,
    y: y - 32,
    size: 8.5,
    font: fontRegular,
    color: accentBlue,
  });

  // Footer Page 1
  page1.drawText("ZionaPOS Enterprise Commercial Pitch Deck | Confidential & Proprietary | Page 1 of 5", {
    x: 40,
    y: 25,
    size: 7.5,
    font: fontOblique,
    color: textMuted,
  });

  // =========================================================================
  // PAGE 2: 4 CORE TECHNOLOGICAL PILLARS
  // =========================================================================
  const page2 = pdfDoc.addPage([pageWidth, pageHeight]);
  let y2 = pageHeight - 45;

  page2.drawText("4 Core Technological Pillars Driving Business ROI", {
    x: 40,
    y: y2,
    size: 17,
    font: fontBold,
    color: primaryDark,
  });
  y2 -= 16;
  page2.drawText("Proprietary automation built into every tenant to cut operational costs by over 40%", {
    x: 40,
    y: y2,
    size: 9.5,
    font: fontRegular,
    color: textMuted,
  });
  y2 -= 24;

  const pillars = [
    {
      num: "PILLAR 1",
      title: "Gemini Vision AI Purchase Bill Scanner",
      benefit: "Saves 15+ Hours of Weekly Manual Data Entry",
      bullets: [
        "* Multimodal OCR reads physical paper bills or PDF invoices with 99.4% accuracy.",
        "* Automatically captures Supplier Name, GSTIN, Invoice Date, Line Items, HSN, MRP, and Buy Rates.",
        "* Recognizes pharmaceutical batch numbers, expiry dates, and 15-digit mobile IMEI numbers.",
        "* Direct 1-click inwarding into live warehouse stock, updating cost of goods and margin metrics.",
      ],
      color: rgb(0.95, 0.97, 1.0),
      border: rgb(0.3, 0.5, 0.9),
    },
    {
      num: "PILLAR 2",
      title: "Zero-Wait Multi-Tenant Customer Booking Portal",
      benefit: "Eliminates Waiting Room Churn & Multiplies Repeat Bookings",
      bullets: [
        "* Every store receives a custom public booking link: https://www.zionapos.store/book/[slug].",
        "* Collision-free scheduling engine prevents overlapping appointments across technicians.",
        "* Smartphone PWA Shortcut: Prompts customers to 'Add to Home Screen' like a native iOS/Android app.",
        "* 1-Tap Re-Book Usual Services: Repeat visitors re-book their preferred stylist and services in 5 seconds.",
        "* Printable Reception Tabletop Standee: QR standee modal with 1-click direct WhatsApp link share.",
      ],
      color: rgb(0.94, 0.98, 0.95),
      border: rgb(0.2, 0.65, 0.35),
    },
    {
      num: "PILLAR 3",
      title: "Two-Way Interactive Meta WhatsApp Bot",
      benefit: "24/7 Automated Customer Self-Service & Payment Collection",
      bullets: [
        "* Official Meta Cloud API webhook with cryptographic signature verification.",
        "* Real-time keywords: Customers message 'DUES' for balance, 'BILL' for PDF invoice, 'PAY' for UPI link.",
        "* Automated payment reminders with embedded dynamic UPI payment links reduce overdue credit by 65%.",
        "* Instant payment receipts and appointment confirmation vouchers dispatched straight to WhatsApp.",
      ],
      color: rgb(0.98, 0.96, 1.0),
      border: rgb(0.65, 0.3, 0.8),
    },
    {
      num: "PILLAR 4",
      title: "Dynamic NPCI BharatQR UPI & Statutory GST Engine",
      benefit: "Zero Payment Terminal Fees (0% MDR) & 100% Tax Accuracy",
      bullets: [
        "* Dynamic NPCI BharatQR generated on thermal bills with exact invoice paise amount encoded.",
        "* Customers scan and pay directly via GPay, PhonePe, Paytm; cashiers never have to type amounts.",
        "* Native Indian GST Engine: Automatic CGST + SGST vs IGST detection based on Place of Supply.",
        "* 1-Click statutory GSTR-1 and GSTR-3B tax summaries ready for direct government portal filing.",
      ],
      color: rgb(0.99, 0.97, 0.94),
      border: rgb(0.85, 0.55, 0.15),
    },
  ];

  for (const pil of pillars) {
    page2.drawRectangle({
      x: 40,
      y: y2 - 142,
      width: pageWidth - 80,
      height: 138,
      color: pil.color,
      borderColor: pil.border,
      borderWidth: 1,
    });

    page2.drawText(pil.num, {
      x: 52,
      y: y2 - 18,
      size: 7.5,
      font: fontBold,
      color: brandIndigo,
    });
    page2.drawText(pil.title, {
      x: 105,
      y: y2 - 19,
      size: 11,
      font: fontBold,
      color: primaryDark,
    });
    page2.drawText("Impact: " + pil.benefit, {
      x: 52,
      y: y2 - 34,
      size: 8,
      font: fontBold,
      color: emeraldGreen,
    });

    let by = y2 - 50;
    for (const b of pil.bullets) {
      page2.drawText(b, {
        x: 52,
        y: by,
        size: 7.5,
        font: fontRegular,
        color: textDark,
      });
      by -= 16;
    }

    y2 -= 152;
  }

  // Footer Page 2
  page2.drawText("ZionaPOS Enterprise Commercial Pitch Deck | Confidential & Proprietary | Page 2 of 5", {
    x: 40,
    y: 25,
    size: 7.5,
    font: fontOblique,
    color: textMuted,
  });

  // =========================================================================
  // PAGE 3: INDUSTRY SHOWCASE (PART 1: RETAIL, F&B, AUTOMOBILE, WHOLESALE)
  // =========================================================================
  const page3 = pdfDoc.addPage([pageWidth, pageHeight]);
  let y3 = pageHeight - 45;

  page3.drawText("Industry Solutions Matrix -- Part 1: Retail & Distribution", {
    x: 40,
    y: y3,
    size: 17,
    font: fontBold,
    color: primaryDark,
  });
  y3 -= 16;
  page3.drawText("Dedicated workflows engineered for Supermarkets, Restaurants, Garages & Distributors", {
    x: 40,
    y: y3,
    size: 9.5,
    font: fontRegular,
    color: textMuted,
  });
  y3 -= 24;

  const indPart1 = [
    {
      title: "Retail & Supermarkets",
      tag: "High-Speed Billing * Weighing Scale EAN-13 * Dual Pole Display",
      roi: "Checkouts 3x faster with zero cashier calculation errors",
      features: [
        "* Sub-second barcode scanning for FMCG, packaged goods, and private labels.",
        "* Auto-decodes price/weight embedded 13-digit weighing scale barcodes.",
        "* Real-time websocket customer pole display stream for complete transparency.",
        "* Shift cash drawer float management and daily cash reconciliation audit.",
      ],
    },
    {
      title: "Restaurants, Cafes & Cloud Kitchens",
      tag: "Contactless QR Ordering * Floor Table Map * KOT Station Routing",
      roi: "Boosts table turnover by 28% and cuts food waste via BOM tracking",
      features: [
        "* Contactless digital menu & ordering via table QR codes (No app install needed).",
        "* Visual floor table plan across Dining Halls, AC Cabins, and Rooftop Lounges.",
        "* Real-time Kitchen Order Ticket (KOT) firing to kitchen cook stations.",
        "* Recipe Bill of Materials (BOM) automatically depletes raw ingredients on order.",
      ],
    },
    {
      title: "Automobile Workshops & Garages",
      tag: "Vehicle Registry * Multi-Stage Job Cards * Hybrid SAC/HSN Billing",
      roi: "Doubles technician productivity and automates vehicle service history",
      features: [
        "* Vehicle master registry tracking license plate, chassis, mileage, and fuel.",
        "* Digital Job Cards: Inspection -> In Progress -> Quality Check -> Ready for Delivery.",
        "* Seamless hybrid billing: Combines Labour (SAC 9987 @ 18%) + Spare Parts (HSN 8708 @ 28%).",
        "* Service history timeline, gate pass printing, and authorized delivery sign-off.",
      ],
    },
    {
      title: "Wholesale FMCG & Multi-Warehouse Distribution",
      tag: "AI Bill Inwarding * Inter-Depot Transfers * Dual Packaging Units",
      roi: "Complete multi-branch inventory visibility with zero stock shrinkage",
      features: [
        "* Bulk AI purchase inwarding directly to central warehouse depot.",
        "* Multi-warehouse transfer engine with in-transit audit to regional vans/depots.",
        "* Dual packaging units: Bill seamlessly in PCS, BOX, or CASE with ratio conversion.",
        "* Multi-tier customer price lists (Tier-1 Wholesale, Super-Stockist, Retail Trader).",
      ],
    },
  ];

  for (const ind of indPart1) {
    page3.drawRectangle({
      x: 40,
      y: y3 - 142,
      width: pageWidth - 80,
      height: 138,
      color: cardBg,
      borderColor: cardBorder,
      borderWidth: 1,
    });

    page3.drawText(ind.title, {
      x: 52,
      y: y3 - 18,
      size: 11,
      font: fontBold,
      color: primaryDark,
    });
    page3.drawText(ind.tag, {
      x: 52,
      y: y3 - 32,
      size: 7.5,
      font: fontBold,
      color: accentBlue,
    });
    page3.drawText("Business Value: " + ind.roi, {
      x: 52,
      y: y3 - 46,
      size: 8,
      font: fontBold,
      color: emeraldGreen,
    });

    let fy = y3 - 62;
    for (const feat of ind.features) {
      page3.drawText(feat, {
        x: 52,
        y: fy,
        size: 7.5,
        font: fontRegular,
        color: textDark,
      });
      fy -= 16;
    }

    y3 -= 152;
  }

  // Footer Page 3
  page3.drawText("ZionaPOS Enterprise Commercial Pitch Deck | Confidential & Proprietary | Page 3 of 5", {
    x: 40,
    y: 25,
    size: 7.5,
    font: fontOblique,
    color: textMuted,
  });

  // =========================================================================
  // PAGE 4: INDUSTRY SHOWCASE (PART 2: PHARMACY, APPAREL, ELECTRONICS, SALON)
  // =========================================================================
  const page4 = pdfDoc.addPage([pageWidth, pageHeight]);
  let y4 = pageHeight - 45;

  page4.drawText("Industry Solutions Matrix -- Part 2: Specialized Verticals", {
    x: 40,
    y: y4,
    size: 17,
    font: fontBold,
    color: primaryDark,
  });
  y4 -= 16;
  page4.drawText("Tailored compliance & operations for Healthcare, Fashion, Mobiles, and Wellness", {
    x: 40,
    y: y4,
    size: 9.5,
    font: fontRegular,
    color: textMuted,
  });
  y4 -= 24;

  const indPart2 = [
    {
      title: "Pharmacy & Healthcare Centers",
      tag: "Batch Expiry Quarantine * Schedule H/H1 Drugs * Doctor Master",
      roi: "100% Drug Controller statutory compliance; zero expired stock losses",
      features: [
        "* 30/60/90 day near-expiry live dashboard alerts prevent billing expired drugs.",
        "* Statutory Schedule H & H1 dispensing audit register with prescribing doctor tracking.",
        "* Doctor Master with automated state medical council registration autocomplete.",
        "* Mandatory Forms 20B & 21B drug licenses automatically printed on statutory bills.",
      ],
    },
    {
      title: "Textiles, Fashion & Apparel Stores",
      tag: "2D Size-Color Matrix * Barcode Hang-Tags * Fabric Meter Cuts",
      roi: "Streamlines 10,000+ fashion SKUs with single-click matrix generation",
      features: [
        "* 2D Size-Color-Fit matrix generator produces hundreds of SKUs in seconds.",
        "* Parent-child barcode generator for printing standard garment hang-tags.",
        "* Fractional fabric meter cuts: Deduct 2.75 meters directly from fabric roll stock.",
        "* Native support for 5% vs 12% apparel GST thresholds and customer exchanges.",
      ],
    },
    {
      title: "Electronics & Mobile Showrooms",
      tag: "Dual 15-Digit IMEI * Instant Warranty Lookup * Brand EMI Schemes",
      roi: "Prevents warranty fraud and boosts high-ticket conversions with EMI",
      features: [
        "* Strict dual 15-digit IMEI inwarding and POS billing for smartphones & tablets.",
        "* 1-Second instant warranty lookup by IMEI/serial number across past purchases.",
        "* Split financing across consumer EMI partners (Bajaj, HDFC, PineLabs) & down-payment.",
        "* Trade-in valuation engine generates instant credit vouchers for old used gadgets.",
      ],
    },
    {
      title: "Salon, Spa & Aesthetic Centers (World-Standard Experience)",
      tag: "Zero-Wait Booking * PWA Smartphone App * Stylist Commissions",
      roi: "Eliminates waiting room crowding and increases client retention by 45%",
      features: [
        "* Self-Booking Zero-Wait Portal: Customers book slots online (zionapos.store/book/[slug]).",
        "* Smartphone PWA Shortcut: 1-Tap 'Add to Home Screen' and instant repeat service re-booking.",
        "* Printable Reception Tabletop Standee: QR standee modal with 1-click WhatsApp share.",
        "* Floor Chair Live Matrix, Token Lounge, and automatic stylist commission leaderboard.",
        "* Backbar Consumables Auto-Depletion: Shampoos and serums deduct on service completion.",
      ],
    },
  ];

  for (const ind of indPart2) {
    page4.drawRectangle({
      x: 40,
      y: y4 - 142,
      width: pageWidth - 80,
      height: 138,
      color: cardBg,
      borderColor: cardBorder,
      borderWidth: 1,
    });

    page4.drawText(ind.title, {
      x: 52,
      y: y4 - 18,
      size: 11,
      font: fontBold,
      color: primaryDark,
    });
    page4.drawText(ind.tag, {
      x: 52,
      y: y4 - 32,
      size: 7.5,
      font: fontBold,
      color: accentBlue,
    });
    page4.drawText("Business Value: " + ind.roi, {
      x: 52,
      y: y4 - 46,
      size: 8,
      font: fontBold,
      color: emeraldGreen,
    });

    let fy = y4 - 62;
    for (const feat of ind.features) {
      page4.drawText(feat, {
        x: 52,
        y: fy,
        size: 7.5,
        font: fontRegular,
        color: textDark,
      });
      fy -= 16;
    }

    y4 -= 152;
  }

  // Footer Page 4
  page4.drawText("ZionaPOS Enterprise Commercial Pitch Deck | Confidential & Proprietary | Page 4 of 5", {
    x: 40,
    y: 25,
    size: 7.5,
    font: fontOblique,
    color: textMuted,
  });

  // =========================================================================
  // PAGE 5: PRICING, PARTNER PROGRAM & COMMERCIAL NEXT STEPS
  // =========================================================================
  const page5 = pdfDoc.addPage([pageWidth, pageHeight]);
  let y5 = pageHeight - 45;

  page5.drawText("Commercial Pricing & Channel Partner Program", {
    x: 40,
    y: y5,
    size: 17,
    font: fontBold,
    color: primaryDark,
  });
  y5 -= 16;
  page5.drawText("Disruptive SaaS pricing designed for high adoption and lucrative partner commissions", {
    x: 40,
    y: y5,
    size: 9.5,
    font: fontRegular,
    color: textMuted,
  });
  y5 -= 24;

  // Pricing Comparison (2 Cards)
  const cardW = (pageWidth - 80 - 16) / 2;

  // Card 1: Starter Free
  page5.drawRectangle({
    x: 40,
    y: y5 - 150,
    width: cardW,
    height: 150,
    color: rgb(0.98, 0.99, 1.0),
    borderColor: borderLight,
    borderWidth: 1,
  });
  page5.drawText("STARTER FREE TIER", {
    x: 52,
    y: y5 - 20,
    size: 8.5,
    font: fontBold,
    color: textMuted,
  });
  page5.drawText("Rs 0 / forever", {
    x: 52,
    y: y5 - 38,
    size: 18,
    font: fontBold,
    color: primaryDark,
  });
  page5.drawText("Ideal for micro-retailers & single counters", {
    x: 52,
    y: y5 - 50,
    size: 7.5,
    font: fontOblique,
    color: textMuted,
  });

  const starterPts = [
    "* Up to 50 sales invoices per month",
    "* Core Point of Sale (POS) & A4 Billing",
    "* Basic Inventory & Product Catalog",
    "* Single device cashier login",
    "* Standard thermal 80mm/58mm printing",
  ];
  let sY = y5 - 68;
  for (const pt of starterPts) {
    page5.drawText(pt, {
      x: 52,
      y: sY,
      size: 7.5,
      font: fontRegular,
      color: textDark,
    });
    sY -= 15;
  }

  // Card 2: ZionaPOS Pro
  page5.drawRectangle({
    x: 40 + cardW + 16,
    y: y5 - 150,
    width: cardW,
    height: 150,
    color: highlightGreenBg,
    borderColor: highlightGreenBorder,
    borderWidth: 1.5,
  });
  page5.drawText("ZIONAPOS PRO UNLIMITED", {
    x: 40 + cardW + 28,
    y: y5 - 20,
    size: 8.5,
    font: fontBold,
    color: emeraldGreen,
  });
  page5.drawText("Rs 499 / month", {
    x: 40 + cardW + 28,
    y: y5 - 38,
    size: 18,
    font: fontBold,
    color: primaryDark,
  });
  page5.drawText("(or Rs 4,999/year - Save 17%)", {
    x: 40 + cardW + 28,
    y: y5 - 50,
    size: 7.5,
    font: fontOblique,
    color: emeraldGreen,
  });

  const proPts = [
    "* Unlimited Invoices, Quotations & Receipts",
    "* Gemini AI Purchase Bill OCR Scanner",
    "* Zero-Wait Customer Booking Portal & PWA",
    "* Two-Way Interactive WhatsApp Bot Webhook",
    "* Multi-Warehouse, Multi-User & RBAC Controls",
    "* Statutory GSTR-1, GSTR-3B & Tax Ledgers",
  ];
  let pY = y5 - 68;
  for (const pt of proPts) {
    page5.drawText(pt, {
      x: 40 + cardW + 28,
      y: pY,
      size: 7.5,
      font: fontBold,
      color: textDark,
    });
    pY -= 12.5;
  }

  y5 -= 168;

  // Channel Partner & Agency Program
  page5.drawText("Marketing Agency & Reseller Partnership Program", {
    x: 40,
    y: y5,
    size: 12,
    font: fontBold,
    color: primaryDark,
  });
  y5 -= 14;

  page5.drawRectangle({
    x: 40,
    y: y5 - 110,
    width: pageWidth - 80,
    height: 110,
    color: rgb(0.96, 0.97, 1.0),
    borderColor: brandIndigo,
    borderWidth: 1,
  });

  const partnerPoints = [
    "1. 30% Lifetime Recurring Commission: Earn recurring SaaS revenue on every client onboarded.",
    "2. Hardware Bundling Opportunities: Bundle POS terminals, thermal printers, barcode scanners & cash drawers.",
    "3. Dedicated Partner Dashboard: Monitor client tenant activations, renewal dates, and commission payouts.",
    "4. White-Label & Chain Deployments: Custom domain & branding available for retail chains, franchises, and salons.",
    "5. Full Marketing & Sales Collateral: Complete slide decks, client demo credentials, and technical onboarding support.",
  ];

  let pty = y5 - 18;
  for (const pt of partnerPoints) {
    page5.drawText(pt, {
      x: 52,
      y: pty,
      size: 8,
      font: fontRegular,
      color: textDark,
    });
    pty -= 18;
  }

  y5 -= 126;

  // Executive Contact & Next Steps Box
  page5.drawRectangle({
    x: 40,
    y: y5 - 80,
    width: pageWidth - 80,
    height: 80,
    color: primaryDark,
  });

  page5.drawText("Schedule an Executive Demo or Discuss Partnership Opportunities", {
    x: 55,
    y: y5 - 20,
    size: 11,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page5.drawText("Live Production Platform: https://www.zionapos.store", {
    x: 55,
    y: y5 - 36,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.7, 0.85, 1.0),
  });

  page5.drawText("Customer Booking Engine: https://www.zionapos.store/book/demo-salon", {
    x: 55,
    y: y5 - 48,
    size: 8.5,
    font: fontRegular,
    color: rgb(0.7, 0.85, 1.0),
  });

  page5.drawText("Partnership Inquiries: partner@zionapos.store  |  Founder / Sales Desk: sales@zionapos.store", {
    x: 55,
    y: y5 - 62,
    size: 8.5,
    font: fontBold,
    color: rgb(0.95, 0.95, 0.95),
  });

  // Footer Page 5
  page5.drawText("ZionaPOS Enterprise Commercial Pitch Deck | Built for India, Scaled for the World | Page 5 of 5", {
    x: 40,
    y: 25,
    size: 7.5,
    font: fontOblique,
    color: textMuted,
  });

  // Save PDF bytes
  const pdfBytes = await pdfDoc.save();

  // 1. Root
  const outPathRoot = path.join(process.cwd(), "ZionaPOS_Commercial_Product_Brochure.pdf");
  fs.writeFileSync(outPathRoot, pdfBytes);
  console.log(`Saved PDF to: ${outPathRoot}`);

  // 2. Public
  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const outPathPublic = path.join(publicDir, "ZionaPOS_Commercial_Product_Brochure.pdf");
  fs.writeFileSync(outPathPublic, pdfBytes);
  console.log(`Saved PDF to: ${outPathPublic}`);

  // 3. Artifact directory
  const artifactDir = "C:\\Users\\dell\\.gemini\\antigravity\\brain\\8b96b443-8a8d-4cf4-ae2f-eb78ba7fe41d";
  if (fs.existsSync(artifactDir)) {
    const outPathArtifact = path.join(artifactDir, "ZionaPOS_Commercial_Product_Brochure.pdf");
    fs.writeFileSync(outPathArtifact, pdfBytes);
    console.log(`Saved PDF to: ${outPathArtifact}`);
  }
}

generateMarketingPdf().catch((err) => {
  console.error("Failed to generate Marketing PDF:", err);
  process.exit(1);
});
