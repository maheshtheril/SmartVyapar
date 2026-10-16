import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import * as fs from "fs";
import * as path from "path";

async function generatePdf() {
  const pdfDoc = await PDFDocument.create();

  // Load fonts
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Colors
  const primaryDark = rgb(0.09, 0.13, 0.24); // #17223b
  const accentBlue = rgb(0.12, 0.45, 0.88);  // #1f73e0
  const headerBg = rgb(0.93, 0.95, 0.98);
  const textDark = rgb(0.12, 0.15, 0.2);
  const textMuted = rgb(0.4, 0.45, 0.52);
  const borderLight = rgb(0.82, 0.86, 0.92);
  const rowEvenBg = rgb(0.98, 0.99, 1.0);
  const rowOddBg = rgb(1.0, 1.0, 1.0);
  const pwdGreen = rgb(0.08, 0.45, 0.18);
  const highlightBoxBg = rgb(0.92, 0.97, 0.94);
  const highlightBoxBorder = rgb(0.2, 0.65, 0.35);

  // =========================================================================
  // PAGE 1: CREDENTIALS TABLE (Landscape A4: 841.89 x 595.28)
  // =========================================================================
  const page1 = pdfDoc.addPage([841.89, 595.28]);
  const { width: p1Width, height: p1Height } = page1.getSize();

  let y = p1Height - 32;

  // Title & Subtitle
  page1.drawText("ZionaPOS — Multi-Industry Demo Environments", {
    x: 40,
    y,
    size: 19,
    font: fontBold,
    color: primaryDark,
  });

  y -= 16;
  page1.drawText("Master Test Tenant Credentials & Testing Guide (9 Industry Verticals Ready Out-of-the-Box)", {
    x: 40,
    y,
    size: 10,
    font: fontRegular,
    color: textMuted,
  });

  y -= 26;

  // Master Password Banner
  page1.drawRectangle({
    x: 40,
    y: y - 22,
    width: p1Width - 80,
    height: 34,
    color: highlightBoxBg,
    borderColor: highlightBoxBorder,
    borderWidth: 1.2,
  });

  page1.drawText("DEFAULT MASTER PASSWORD FOR ALL 9 ACCOUNTS:", {
    x: 55,
    y: y - 10,
    size: 9.5,
    font: fontBold,
    color: rgb(0.1, 0.45, 0.2),
  });

  page1.drawText("ZionaPOS@2026", {
    x: 350,
    y: y - 11,
    size: 12,
    font: fontBold,
    color: pwdGreen,
  });

  page1.drawText("(Role: OWNER / Full Super-Admin privileges on each isolated store)", {
    x: 465,
    y: y - 10,
    size: 8.5,
    font: fontOblique,
    color: textMuted,
  });

  y -= 38;

  // Table Configuration with dedicated Password column
  // Total width: 20 + 115 + 145 + 85 + 145 + 92 + 160 = 762 (p1Width - 80 = 761.89)
  const colWidths = [20, 115, 145, 85, 145, 92, 160];
  const headers = ["#", "Industry Vertical", "Tenant / Store Name", "Slug", "Login Email", "Password", "Pre-Loaded Features"];
  const tableX = 40;
  const headerHeight = 22;
  const rowHeight = 35;

  // Draw Header Row
  page1.drawRectangle({
    x: tableX,
    y: y - headerHeight,
    width: p1Width - 80,
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
      size: 8.5,
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

  // 9 Accounts
  const accounts = [
    {
      num: "1",
      industry: "Retail & Supermarket",
      tenant: "SmartBazaar Retail Supermarket",
      slug: "demo-retail",
      email: "retail.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Barcoded FMCG, Scale barcode decoding (EAN-13), Dual pole display, Cash float.",
    },
    {
      num: "2",
      industry: "Restaurant & Cafe",
      tenant: "The Spice Route Kitchen & Cafe",
      slug: "demo-restaurant",
      email: "restaurant.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Dining tables (Main, AC, Rooftop), KOT order flow, Recipe BOM stock depletion.",
    },
    {
      num: "3",
      industry: "Automobile & Garage",
      tenant: "Apex Pro Motors & Garage",
      slug: "demo-garage",
      email: "garage.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Vehicle registry (Creta), Active Job Card, SAC 9987 Labour + OEM spare parts.",
    },
    {
      num: "4",
      industry: "Wholesale & Distribution",
      tenant: "Horizon FMCG & Wholesale",
      slug: "demo-distribution",
      email: "distribution.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Multi-Warehouse, Region/Territory beats, Dual Units (PCS/BOX), Price Lists.",
    },
    {
      num: "5",
      industry: "Pharmacy & Healthcare",
      tenant: "CarePlus Pharmacy & Healthcare",
      slug: "demo-pharma",
      email: "pharma.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Schedule H/H1 register, Doctor master, Forms 20B/21B, Expiry 30/60/90 days.",
    },
    {
      num: "6",
      industry: "Professional Services",
      tenant: "Nexora Tech & Engineering",
      slug: "demo-services",
      email: "services.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "SAC 9983 Cloud Consulting, IT AMC contracts, Time billing (HRS), Client Khata.",
    },
    {
      num: "7",
      industry: "Textiles & Apparel",
      tenant: "Vogue & Velvet Textiles & Apparel",
      slug: "demo-apparel",
      email: "apparel.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Size-Color matrix (S/M/L/XL), Parent-child barcodes, Fabric meter cut deductions.",
    },
    {
      num: "8",
      industry: "Electronics & Mobiles",
      tenant: "ElectroPulse Digital & Mobiles",
      slug: "demo-electronics",
      email: "electronics.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Dual IMEI/Serial tracking, 15-digit warranty lookup, Brand EMI, Trade-in vouchers.",
    },
    {
      num: "9",
      industry: "Salon, Spa & Wellness",
      tenant: "Aura Luxury Salon, Spa & Wellness",
      slug: "demo-salon",
      email: "salon.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Stylist commissions, Appointment scheduler, Prepaid packages, Backbar depletion.",
    },
  ];

  for (let r = 0; r < accounts.length; r++) {
    const row = accounts[r];
    const isEven = r % 2 === 0;

    page1.drawRectangle({
      x: tableX,
      y: y - rowHeight,
      width: p1Width - 80,
      height: rowHeight,
      color: isEven ? rowEvenBg : rowOddBg,
      borderColor: borderLight,
      borderWidth: 1,
    });

    let cellX = tableX;

    // 0: #
    page1.drawText(row.num, {
      x: cellX + 6,
      y: y - 21,
      size: 8.5,
      font: fontBold,
      color: primaryDark,
    });
    cellX += colWidths[0];

    // 1: Industry
    page1.drawText(row.industry, {
      x: cellX + 4,
      y: y - 21,
      size: 8,
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

    // 3: Slug
    page1.drawText(row.slug, {
      x: cellX + 4,
      y: y - 21,
      size: 7.5,
      font: fontRegular,
      color: textMuted,
    });
    cellX += colWidths[3];

    // 4: Email
    page1.drawText(row.email, {
      x: cellX + 4,
      y: y - 21,
      size: 7.5,
      font: fontBold,
      color: primaryDark,
    });
    cellX += colWidths[4];

    // 5: Password
    page1.drawText(row.password, {
      x: cellX + 4,
      y: y - 21,
      size: 8,
      font: fontBold,
      color: pwdGreen,
    });
    cellX += colWidths[5];

    // 6: Features (wrap text into 2 lines)
    const words = row.features.split(" ");
    let line1 = "";
    let line2 = "";
    for (const w of words) {
      if ((line1 + " " + w).length < 38) {
        line1 += (line1 ? " " : "") + w;
      } else {
        line2 += (line2 ? " " : "") + w;
      }
    }

    page1.drawText(line1, {
      x: cellX + 4,
      y: y - 15,
      size: 7,
      font: fontRegular,
      color: textDark,
    });
    if (line2) {
      page1.drawText(line2, {
        x: cellX + 4,
        y: y - 26,
        size: 7,
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
  y -= 18;
  page1.drawText("Login Portal: https://zionapos.vercel.app/login  |  Also accessible locally at http://localhost:3005/login", {
    x: 40,
    y,
    size: 8.5,
    font: fontBold,
    color: accentBlue,
  });
  y -= 12;
  page1.drawText("Security Architecture: All 9 demo environments are isolated tenants. Catalog items, taxes, customers, and reports are strictly scoped.", {
    x: 40,
    y,
    size: 7.5,
    font: fontRegular,
    color: textMuted,
  });

  // =========================================================================
  // PAGE 2: TESTING GUIDE PART 1 (Portrait A4: 595.28 x 841.89)
  // =========================================================================
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  const { width: p2Width, height: p2Height } = page2.getSize();

  let y2 = p2Height - 40;

  page2.drawText("Quick Testing Guide (Part 1: Verticals 1 to 5)", {
    x: 45,
    y: y2,
    size: 17,
    font: fontBold,
    color: primaryDark,
  });
  y2 -= 16;
  page2.drawText("Step-by-step feature inspection for Retail, Restaurant, Garage, Distribution & Pharmacy", {
    x: 45,
    y: y2,
    size: 9.5,
    font: fontRegular,
    color: textMuted,
  });
  y2 -= 24;

  const part1Sections = [
    {
      title: "1. Retail & Supermarket POS (retail.demo@zionapos.com)",
      steps: [
        "- Log in and navigate to POS Counter / Sales.",
        "- Scan or enter barcode '890103000001' (Basmati Rice) or '890103000002' (Cow Milk).",
        "- Test Cash Drawer float check and change tender calculations.",
        "- Test Weighing Scale EAN-13 barcode decoding and dual Customer Pole Display.",
        "- Print invoice: Verify standard A4 tax invoice or 80mm thermal receipt.",
      ],
    },
    {
      title: "2. Restaurant & Cafe (restaurant.demo@zionapos.com)",
      steps: [
        "- Navigate to Restaurant Tables floor view (Main Hall, AC Dining, Rooftop).",
        "- Click table 'T-01' or 'AC-1', add 'Special Malabar Dum Biryani' and fire KOT.",
        "- Verify Recipe BOM: Raw Chicken & Basmati Rice stock automatically de-increments.",
        "- Test table billing, bill splitting, and settlement to dynamic UPI QR / Cash.",
      ],
    },
    {
      title: "3. Automobile Workshop & Garage (garage.demo@zionapos.com)",
      steps: [
        "- Open Job Cards menu: Inspect active job card 'JC-2026-0001'.",
        "- Check linked vehicle 'KL-07-CB-5544' (Rahul Menon / Hyundai Creta).",
        "- Verify hybrid line items: SAC 998714 Labour Service + Spare Parts with HSN 8708.",
        "- Convert Job Card to Final GST Tax Invoice and verify statutory breakdown.",
      ],
    },
    {
      title: "4. Wholesale FMCG & Distribution (distribution.demo@zionapos.com)",
      steps: [
        "- Open Multi-Warehouse manager: Check 'WH-CENTRAL', 'WH-NORTH', and 'VAN-01'.",
        "- Create a Stock Transfer from Central Depot to Mobile Van Unit.",
        "- Select FMCG items with Dual Packaging (e.g., Sunflower Oil: 1 BOX = 12 PCS).",
        "- View customer 'Arogya Super Bazaar' and test Tier-1 wholesale discount price list.",
      ],
    },
    {
      title: "5. Pharmacy & Healthcare (pharma.demo@zionapos.com)",
      steps: [
        "- Open Products / Medicines: View 'Paracetamol 650mg' and 'Amoxicillin 625mg'.",
        "- Inspect Batches: Batch 'PCM-2026-A1' (Fresh) vs 'PCM-2025-E8' (Near Expiry alert).",
        "- Test Schedule H & H1 Drug Dispensing Register with Doctor Registration autocomplete.",
        "- Verify Forms 20B and 21B drug licenses printed on statutory sales bills.",
      ],
    },
  ];

  for (const s of part1Sections) {
    page2.drawText(s.title, {
      x: 45,
      y: y2,
      size: 10.5,
      font: fontBold,
      color: accentBlue,
    });
    y2 -= 14;

    for (const step of s.steps) {
      page2.drawText(step, {
        x: 55,
        y: y2,
        size: 8.5,
        font: fontRegular,
        color: textDark,
      });
      y2 -= 12;
    }
    y2 -= 8;
  }

  page2.drawText("ZionaPOS Cloud ERP — Multi-Tenant Multi-Industry Platform", {
    x: 45,
    y: 30,
    size: 7.5,
    font: fontOblique,
    color: textMuted,
  });

  // =========================================================================
  // PAGE 3: TESTING GUIDE PART 2 (Portrait A4: 595.28 x 841.89)
  // =========================================================================
  const page3 = pdfDoc.addPage([595.28, 841.89]);
  const { width: p3Width, height: p3Height } = page3.getSize();

  let y3 = p3Height - 40;

  page3.drawText("Quick Testing Guide (Part 2: Verticals 6 to 9)", {
    x: 45,
    y: y3,
    size: 17,
    font: fontBold,
    color: primaryDark,
  });
  y3 -= 16;
  page3.drawText("Step-by-step feature inspection for Services, Apparel, Electronics & Salon/Spa", {
    x: 45,
    y: y3,
    size: 9.5,
    font: fontRegular,
    color: textMuted,
  });
  y3 -= 24;

  const part2Sections = [
    {
      title: "6. Professional Services & Consulting (services.demo@zionapos.com)",
      steps: [
        "- Bill consulting hours using SAC 998313 (Enterprise Cloud Architecture).",
        "- Create Annual Maintenance Contract (AMC) billing under SAC 998717.",
        "- View Corporate Khata ledger for 'Apex Global Logistics Pvt Ltd'.",
        "- Verify credit limit controls and GST inter-state (IGST) vs intra-state calculations.",
      ],
    },
    {
      title: "7. Textiles & Apparel Store (apparel.demo@zionapos.com)",
      steps: [
        "- Log in and view catalog: 'Raymond Cotton Shirt (Size 40)' & 'Levi's 511 Denims (32)'.",
        "- Test Size-Color-Fit Grid Matrix and parent-child SKU barcode label generator.",
        "- Test Fabric Meter Cut Deduction: Select 'Pure Irish Linen Suiting' and bill 2.5 MTR.",
        "- Verify standard 12% apparel GST slab and garment hang-tag label printing.",
      ],
    },
    {
      title: "8. Electronics & Mobile Store (electronics.demo@zionapos.com)",
      steps: [
        "- Search or scan 'Apple iPhone 16 Pro 128GB' or 'Samsung Galaxy S24 Ultra'.",
        "- Test 15-digit dual IMEI tracking on checkout: Enter/scan IMEI-1 and IMEI-2.",
        "- Perform instant warranty & service lookup directly by phone IMEI / laptop serial number.",
        "- Test consumer brand EMI scheme billing and Old Gadget Trade-in valuation voucher.",
      ],
    },
    {
      title: "9. Salon, Spa & Wellness Center (salon.demo@zionapos.com)",
      steps: [
        "- Open Services Catalog: 'Signature Haircut', 'Keratin Hair Spa', and 'Hydra-Facial'.",
        "- Allocate service to Stylist / Therapist and verify automatic commission split calculation.",
        "- Test Backbar Consumables Auto-Depletion: Consumables deduct automatically upon checkout.",
        "- Bill retail product (Moroccanoil 100ml) alongside aesthetic services on a single GST bill.",
      ],
    },
  ];

  for (const s of part2Sections) {
    page3.drawText(s.title, {
      x: 45,
      y: y3,
      size: 10.5,
      font: fontBold,
      color: accentBlue,
    });
    y3 -= 14;

    for (const step of s.steps) {
      page3.drawText(step, {
        x: 55,
        y: y3,
        size: 8.5,
        font: fontRegular,
        color: textDark,
      });
      y3 -= 12;
    }
    y3 -= 8;
  }

  y3 -= 10;

  // Platform Architecture Summary Card
  page3.drawRectangle({
    x: 45,
    y: y3 - 100,
    width: p3Width - 90,
    height: 100,
    color: rgb(0.96, 0.97, 1.0),
    borderColor: rgb(0.7, 0.75, 0.9),
    borderWidth: 1,
  });

  page3.drawText("Cross-Industry Architecture & Multi-Tenant Highlights", {
    x: 60,
    y: y3 - 20,
    size: 10,
    font: fontBold,
    color: primaryDark,
  });

  const highlights = [
    "• Logical Tenant Isolation: Every business has strictly partitioned data, users, and warehouses.",
    "• Automated Indian GST Engine: Intra-State (CGST+SGST) vs Inter-State (IGST), B2B vs B2C, HSN/SAC.",
    "• Dynamic NPCI UPI QR: Real-time BharatQR / UPI string encoded with exact invoice paise.",
    "• Universal Hardware Compatibility: Thermal 80mm/58mm POS, weighing scale barcodes, pole display, A4.",
  ];

  let hy = y3 - 36;
  for (const h of highlights) {
    page3.drawText(h, {
      x: 60,
      y: hy,
      size: 8,
      font: fontRegular,
      color: textDark,
    });
    hy -= 14;
  }

  // Bottom footer on Page 3
  page3.drawText("Updated October 2026 | ZionaPOS Cloud ERP Multi-Tenant Edition", {
    x: 45,
    y: 30,
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

  // 2. Save to public directory
  const publicDir = path.join(process.cwd(), "public");
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const outPathPublic = path.join(publicDir, "ZionaPOS_Industry_Demo_Credentials.pdf");
  fs.writeFileSync(outPathPublic, pdfBytes);
  console.log(`Saved PDF to: ${outPathPublic}`);

  // 3. Save to current artifact directory
  const artifactDir = "C:\\Users\\dell\\.gemini\\antigravity\\brain\\8e005b3a-20b1-4bb1-8038-7989ffeed7dc";
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
