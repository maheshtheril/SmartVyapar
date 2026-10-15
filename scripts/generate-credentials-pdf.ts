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

  // Page 1: Credentials Table & Quick Summary (Landscape A4: 841.89 x 595.28)
  const page1 = pdfDoc.addPage([841.89, 595.28]);
  const { width: p1Width, height: p1Height } = page1.getSize();

  let y = p1Height - 40;

  // Title & Subtitle
  page1.drawText("ZionaPOS — Multi-Industry Demo Environments", {
    x: 40,
    y,
    size: 20,
    font: fontBold,
    color: primaryDark,
  });

  y -= 18;
  page1.drawText("Master Test Tenant Credentials & Testing Guide (Ready-to-Use Out-of-the-Box)", {
    x: 40,
    y,
    size: 11,
    font: fontRegular,
    color: textMuted,
  });

  y -= 35;

  // Master Password Banner
  page1.drawRectangle({
    x: 40,
    y: y - 22,
    width: p1Width - 80,
    height: 42,
    color: highlightBoxBg,
    borderColor: highlightBoxBorder,
    borderWidth: 1.5,
  });

  page1.drawText("DEFAULT MASTER PASSWORD FOR ALL 6 ACCOUNTS:", {
    x: 55,
    y: y - 5,
    size: 10,
    font: fontBold,
    color: rgb(0.1, 0.45, 0.2),
  });

  page1.drawText("ZionaPOS@2026", {
    x: 350,
    y: y - 6,
    size: 13,
    font: fontBold,
    color: pwdGreen,
  });

  page1.drawText("(Role: OWNER / Super-Admin access with full privileges on each store)", {
    x: 460,
    y: y - 5,
    size: 9,
    font: fontOblique,
    color: textMuted,
  });

  y -= 45;

  // Table Configuration with dedicated Password column
  // Total width: 24 + 116 + 145 + 85 + 145 + 95 + 152 = 762 (p1Width - 80 = 761.89)
  const colWidths = [24, 116, 145, 85, 145, 95, 152];
  const headers = ["#", "Industry Vertical", "Tenant / Store Name", "Slug", "Login Email", "Password", "Pre-Loaded Features"];
  const tableX = 40;
  const headerHeight = 26;
  const rowHeight = 44;

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
      x: curX + 5,
      y: y - 17,
      size: 9,
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

  // Row Data with updated @zionapos.com emails and explicit password
  const accounts = [
    {
      num: "1",
      industry: "Retail & Supermarket",
      tenant: "SmartBazaar Retail Supermarket",
      slug: "demo-retail",
      email: "retail.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Barcoded FMCG & Groceries, Cash drawer float, POS counter, A4 & 80mm receipts.",
    },
    {
      num: "2",
      industry: "Restaurant & Cafe",
      tenant: "The Spice Route Kitchen & Cafe",
      slug: "demo-restaurant",
      email: "restaurant.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Dining tables (Main, AC, Rooftop), KOT order flow, Recipe BOM stock deduction.",
    },
    {
      num: "3",
      industry: "Automobile & Garage",
      tenant: "Apex Pro Motors & Garage",
      slug: "demo-garage",
      email: "garage.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Vehicle registry (Creta), Active Job Card, SAC 9987 Labour + OEM spares.",
    },
    {
      num: "4",
      industry: "Wholesale & Distribution",
      tenant: "Horizon FMCG & Wholesale",
      slug: "demo-distribution",
      email: "distribution.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Multi-Warehouse (WH-CENTRAL, VAN-01), Dual Units (PCS/BOX), Price Lists.",
    },
    {
      num: "5",
      industry: "Pharmacy & Healthcare",
      tenant: "CarePlus Pharmacy & Healthcare",
      slug: "demo-pharma",
      email: "pharma.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "Batch & Expiry alerts (Fresh vs Near-Expiry), Strip-to-Tab units, AI OCR.",
    },
    {
      num: "6",
      industry: "Professional Services",
      tenant: "Nexora Tech & Engineering",
      slug: "demo-services",
      email: "services.demo@zionapos.com",
      password: "ZionaPOS@2026",
      features: "SAC 9983 Cloud Consulting, IT AMC contracts, Time billing (HRS/YR), Khata.",
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
      x: cellX + 8,
      y: y - 24,
      size: 9,
      font: fontBold,
      color: primaryDark,
    });
    cellX += colWidths[0];

    // 1: Industry
    page1.drawText(row.industry, {
      x: cellX + 5,
      y: y - 24,
      size: 8.5,
      font: fontBold,
      color: accentBlue,
    });
    cellX += colWidths[1];

    // 2: Tenant Name
    page1.drawText(row.tenant, {
      x: cellX + 5,
      y: y - 24,
      size: 8,
      font: fontBold,
      color: textDark,
    });
    cellX += colWidths[2];

    // 3: Slug
    page1.drawText(row.slug, {
      x: cellX + 5,
      y: y - 24,
      size: 8,
      font: fontRegular,
      color: textMuted,
    });
    cellX += colWidths[3];

    // 4: Email
    page1.drawText(row.email, {
      x: cellX + 5,
      y: y - 24,
      size: 8,
      font: fontBold,
      color: primaryDark,
    });
    cellX += colWidths[4];

    // 5: Password (Dedicated Column!)
    page1.drawText(row.password, {
      x: cellX + 5,
      y: y - 24,
      size: 8.5,
      font: fontBold,
      color: pwdGreen,
    });
    cellX += colWidths[5];

    // 6: Features (wrap text into 2 lines)
    const words = row.features.split(" ");
    let line1 = "";
    let line2 = "";
    for (const w of words) {
      if ((line1 + " " + w).length < 35) {
        line1 += (line1 ? " " : "") + w;
      } else {
        line2 += (line2 ? " " : "") + w;
      }
    }

    page1.drawText(line1, {
      x: cellX + 5,
      y: y - 18,
      size: 7.5,
      font: fontRegular,
      color: textDark,
    });
    if (line2) {
      page1.drawText(line2, {
        x: cellX + 5,
        y: y - 30,
        size: 7.5,
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
  y -= 22;
  page1.drawText("Login Portal: https://zionapos.vercel.app/login  |  Also accessible at http://localhost:3005/login", {
    x: 40,
    y,
    size: 9,
    font: fontBold,
    color: accentBlue,
  });
  y -= 14;
  page1.drawText("Security Note: All 6 test environments are logically partitioned on isolated tenant boundaries. Data remains strictly scoped.", {
    x: 40,
    y,
    size: 8.5,
    font: fontRegular,
    color: textMuted,
  });

  // Page 2: Testing Guide & Feature Checklist (Portrait A4: 595.28 x 841.89)
  const page2 = pdfDoc.addPage([595.28, 841.89]);
  const { width: p2Width, height: p2Height } = page2.getSize();

  let y2 = p2Height - 45;

  page2.drawText("Quick Testing & Demonstration Guide", {
    x: 45,
    y: y2,
    size: 18,
    font: fontBold,
    color: primaryDark,
  });
  y2 -= 16;
  page2.drawText("Step-by-step feature inspection instructions for each vertical", {
    x: 45,
    y: y2,
    size: 10,
    font: fontRegular,
    color: textMuted,
  });
  y2 -= 28;

  const testSections = [
    {
      title: "1. Retail & Supermarket POS (retail.demo@zionapos.com)",
      steps: [
        "- Log in and navigate to POS Counter / Sales.",
        "- Scan or enter barcode '890103000001' (Basmati Rice) or '890103000002' (Cow Milk).",
        "- Test Cash Drawer float check and change tender calculations.",
        "- Print invoice: Verify customer standard A4 print format or 80mm thermal receipt.",
      ],
    },
    {
      title: "2. Restaurant & Cafe (restaurant.demo@zionapos.com)",
      steps: [
        "- Navigate to Restaurant Tables floor view (Main Hall, AC Dining, Rooftop).",
        "- Click table 'T-01' or 'AC-1', add 'Special Malabar Dum Biryani' and fire KOT.",
        "- Verify Recipe BOM: Raw Chicken & Basmati Rice stock automatically de-increments.",
        "- Test table billing, bill splitting, and settlement to UPI / Cash.",
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
        "- Test strip-to-tablet atomic unit breakdown and MRP compliance.",
        "- Test AI Invoice Scanner OCR for purchase bills.",
      ],
    },
    {
      title: "6. Professional Services & Consulting (services.demo@zionapos.com)",
      steps: [
        "- Bill consulting hours using SAC 998313 (Enterprise Cloud Architecture).",
        "- Create Annual Maintenance Contract (AMC) billing under SAC 998717.",
        "- View Corporate Khata ledger for 'Apex Global Logistics Pvt Ltd'.",
        "- Verify credit limit controls and GST inter-state vs intra-state calculations.",
      ],
    },
  ];

  for (const s of testSections) {
    page2.drawText(s.title, {
      x: 45,
      y: y2,
      size: 11,
      font: fontBold,
      color: accentBlue,
    });
    y2 -= 15;

    for (const step of s.steps) {
      page2.drawText(step, {
        x: 55,
        y: y2,
        size: 9,
        font: fontRegular,
        color: textDark,
      });
      y2 -= 13;
    }
    y2 -= 8;
  }

  // Bottom footer
  page2.drawText("Generated on 15 October 2026 | ZionaPOS Cloud ERP Multi-Tenant Edition", {
    x: 45,
    y: 35,
    size: 8,
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

  // 3. Save to artifact directory
  const artifactDir = "C:\\Users\\dell\\.gemini\\antigravity\\brain\\a8d483c8-4344-4784-bfa7-0e502d37a7d4";
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
