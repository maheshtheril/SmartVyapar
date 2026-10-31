import { PrismaClient, UserRole, SubscriptionTier } from "@prisma/client";
import bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: connectionString,
    },
  },
});

const SHARED_PASSWORD = "ZionaPOS@2026";
import { seedDefaultAccounts } from "../src/lib/default-accounts";

async function main() {
  console.log("🚀 Starting Diagnostic Laboratory (LIMS) Seed...");

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(SHARED_PASSWORD, salt);

  // 1. Create or update Diagnostic Lab Tenant
  const labTenant = await prisma.tenant.upsert({
    where: { slug: "demo-lab" },
    update: {
      businessName: "Apex Diagnostics & Molecular Pathology Lab",
      legalName: "Apex Clinical Diagnostics & Research Center LLP",
      businessType: "DIAGNOSTIC_LAB",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCA1234F1Z6",
      phone: "+91 98470 11223",
      email: "lab.demo@zionapos.com",
      address: "Medical Trust Tower, MG Road, Ravipuram",
      stateCode: "32",
      stateName: "Kerala",
      pincode: "682016",
      upiId: "apexlab@okaxis",
      labAccreditationNo: "NABL-MED-2026-9481 | ICMR Reg: APEX-KL-09",
      labPathologistName: "Dr. Ananya Nair",
      labPathologistRegNo: "TCMC Reg. No. 49182",
      labPathologistDegree: "MD, DCP (Consultant Clinical Pathologist)",
      labPathologistSignatureUrl: "/signatures/dr_ananya_pathology.png"
    },
    create: {
      slug: "demo-lab",
      businessName: "Apex Diagnostics & Molecular Pathology Lab",
      legalName: "Apex Clinical Diagnostics & Research Center LLP",
      businessType: "DIAGNOSTIC_LAB",
      subscriptionTier: SubscriptionTier.PRO,
      subscriptionStatus: "ACTIVE",
      gstin: "32AABCA1234F1Z6",
      phone: "+91 98470 11223",
      email: "lab.demo@zionapos.com",
      address: "Medical Trust Tower, MG Road, Ravipuram",
      stateCode: "32",
      stateName: "Kerala",
      pincode: "682016",
      upiId: "apexlab@okaxis",
      labAccreditationNo: "NABL-MED-2026-9481 | ICMR Reg: APEX-KL-09",
      labPathologistName: "Dr. Ananya Nair",
      labPathologistRegNo: "TCMC Reg. No. 49182",
      labPathologistDegree: "MD, DCP (Consultant Clinical Pathologist)",
      labPathologistSignatureUrl: "/signatures/dr_ananya_pathology.png"
    }
  });

  const tenantId = labTenant.id;
  console.log(`Tenant Ready: ${labTenant.businessName} (ID: ${tenantId})`);

  // Ensure Warehouse & Accounts
  console.log("Checking warehouse...");
  let wh = await prisma.warehouse.findFirst({
    where: { tenantId, isDefault: true },
  });
  console.log("Warehouse found:", wh ? wh.id : "none");
  if (!wh) {
    console.log("Creating default warehouse...");
    await prisma.warehouse.create({
      data: {
        tenantId,
        name: "Central Specimen Collection Counter",
        code: "LAB-MAIN",
        city: "Kochi",
        address: "Ground Floor, Diagnostic Wing",
        isDefault: true,
      },
    });
  }
  // Accounts already seeded
  // await seedDefaultAccounts(prisma, tenantId);

  // 2. Users: Pathologist (Owner) and Lab Tech (Staff)
  console.log("Upserting pathologist user...");
  await prisma.user.upsert({
    where: {
      email: "lab.demo@zionapos.com"
    },
    update: {
      tenantId,
      phone: "+91 98470 11223",
      passwordHash,
      role: UserRole.OWNER,
      name: "Dr. Ananya Nair (Chief Pathologist)"
    },
    create: {
      tenantId,
      email: "lab.demo@zionapos.com",
      phone: "+91 98470 11223",
      name: "Dr. Ananya Nair (Chief Pathologist)",
      passwordHash,
      role: UserRole.OWNER
    }
  });
  console.log("Pathologist user ready.");

  console.log("Upserting lab tech user...");
  await prisma.user.upsert({
    where: {
      email: "lab.tech@zionapos.com"
    },
    update: {
      tenantId,
      phone: "+91 98470 11224",
      passwordHash,
      role: UserRole.STAFF,
      name: "Rahul Kumar (Senior Technologist)"
    },
    create: {
      tenantId,
      email: "lab.tech@zionapos.com",
      phone: "+91 98470 11224",
      name: "Rahul Kumar (Senior Technologist)",
      passwordHash,
      role: UserRole.STAFF
    }
  });
  console.log("Lab tech user ready.");

  // 3. Referring Doctors Master
  console.log("Upserting doctors...");
  const doctors = [
    { name: "Dr. Rajesh Varma", regNumber: "TCMC-24901", qualification: "MD (General Medicine)", clinicName: "Varma Speciality Clinic", phone: "9847123456", city: "Kochi" },
    { name: "Dr. Priya Menon", regNumber: "TCMC-31802", qualification: "MS, DGO (OBG)", clinicName: "Menon Care & Maternity Hospital", phone: "9847234567", city: "Ernakulam" },
    { name: "Dr. Sunil Joseph", regNumber: "TCMC-18490", qualification: "DM (Cardiology)", clinicName: "HeartLine Diagnostics", phone: "9847345678", city: "Kakkanad" }
  ];

  for (const doc of doctors) {
    await prisma.doctor.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: doc.name
        }
      },
      update: doc,
      create: { ...doc, tenantId }
    });
  }

  // 4. Diagnostic Test Catalog & World-Standard Reference Ranges
  const testCatalog = [
    {
      code: "CBC",
      name: "Complete Blood Count (CBC with 5-Part Differential)",
      department: "HEMATOLOGY",
      specimenType: "EDTA Whole Blood (Purple Top)",
      price: 350,
      tatHours: 2,
      method: "Automated 5-Part Hematology Analyzer (Laser Flow Cytometry)",
      instructions: "No special preparation needed. Random sample.",
      parameters: [
        { name: "Hemoglobin (Hb)", code: "HB", unit: "g/dL", orderIndex: 1, maleMin: 13.5, maleMax: 17.5, femaleMin: 12.0, femaleMax: 15.5, childMin: 11.5, childMax: 14.5, criticalLow: 7.0, criticalHigh: 20.0, referenceText: "Male: 13.5 - 17.5 | Female: 12.0 - 15.5 g/dL" },
        { name: "Total Leukocyte Count (WBC)", code: "WBC", unit: "cells/cu.mm", orderIndex: 2, maleMin: 4000, maleMax: 11000, femaleMin: 4000, femaleMax: 11000, childMin: 5000, childMax: 14500, criticalLow: 2000, criticalHigh: 30000, referenceText: "4,000 - 11,000 cells/cu.mm" },
        { name: "Red Blood Cell Count (RBC)", code: "RBC", unit: "million/cu.mm", orderIndex: 3, maleMin: 4.5, maleMax: 5.5, femaleMin: 3.8, femaleMax: 4.8, referenceText: "Male: 4.5 - 5.5 | Female: 3.8 - 4.8 million/cu.mm" },
        { name: "Packed Cell Volume (PCV)", code: "PCV", unit: "%", orderIndex: 4, maleMin: 40.0, maleMax: 50.0, femaleMin: 36.0, femaleMax: 46.0, referenceText: "Male: 40 - 50% | Female: 36 - 46%" },
        { name: "Platelet Count", code: "PLT", unit: "lakhs/cu.mm", orderIndex: 5, maleMin: 1.5, maleMax: 4.5, femaleMin: 1.5, femaleMax: 4.5, criticalLow: 0.5, criticalHigh: 8.0, referenceText: "1.50 - 4.50 lakhs/cu.mm" },
        { name: "Mean Corpuscular Volume (MCV)", code: "MCV", unit: "fL", orderIndex: 6, generalMin: 80.0, generalMax: 100.0, referenceText: "80.0 - 100.0 fL" },
        { name: "Neutrophils", code: "NEUT", unit: "%", orderIndex: 7, generalMin: 40.0, generalMax: 70.0, referenceText: "40 - 70%" },
        { name: "Lymphocytes", code: "LYMPH", unit: "%", orderIndex: 8, generalMin: 20.0, generalMax: 45.0, referenceText: "20 - 45%" },
        { name: "Eosinophils", code: "EOS", unit: "%", orderIndex: 9, generalMin: 1.0, generalMax: 6.0, referenceText: "1 - 6%" },
        { name: "Monocytes", code: "MONO", unit: "%", orderIndex: 10, generalMin: 2.0, generalMax: 8.0, referenceText: "2 - 8%" }
      ]
    },
    {
      code: "LIPID",
      name: "Lipid Profile (Complete Heart & Cholesterol Panel)",
      department: "BIOCHEMISTRY",
      specimenType: "Serum (Yellow Top SST)",
      price: 650,
      tatHours: 4,
      method: "Enzymatic Spectrophotometry",
      instructions: "12 hours strict overnight fasting is mandatory.",
      parameters: [
        { name: "Total Cholesterol", code: "CHOL", unit: "mg/dL", orderIndex: 1, generalMin: 120.0, generalMax: 200.0, criticalHigh: 300.0, referenceText: "< 200 mg/dL Desirable" },
        { name: "HDL Cholesterol (Good)", code: "HDL", unit: "mg/dL", orderIndex: 2, maleMin: 40.0, maleMax: 60.0, femaleMin: 50.0, femaleMax: 70.0, referenceText: "Male: > 40 | Female: > 50 mg/dL" },
        { name: "Serum Triglycerides", code: "TRIG", unit: "mg/dL", orderIndex: 3, generalMin: 50.0, generalMax: 150.0, criticalHigh: 500.0, referenceText: "< 150 mg/dL Normal" },
        { name: "LDL Cholesterol (Friedewald)", code: "LDL", unit: "mg/dL", orderIndex: 4, calculationFormula: "CHOL - HDL - (TRIG / 5)", generalMin: 60.0, generalMax: 100.0, referenceText: "< 100 mg/dL Optimal" },
        { name: "VLDL Cholesterol", code: "VLDL", unit: "mg/dL", orderIndex: 5, calculationFormula: "TRIG / 5", generalMin: 10.0, generalMax: 30.0, referenceText: "10.0 - 30.0 mg/dL" },
        { name: "Chol / HDL Ratio", code: "RATIO", unit: "Ratio", orderIndex: 6, calculationFormula: "CHOL / HDL", generalMin: 3.0, generalMax: 4.5, referenceText: "3.3 - 4.5 Desirable" }
      ]
    },
    {
      code: "LFT",
      name: "Liver Function Test (LFT Panel)",
      department: "BIOCHEMISTRY",
      specimenType: "Serum (Yellow Top SST)",
      price: 750,
      tatHours: 4,
      method: "Automated Clinical Chemistry Analyzer",
      instructions: "Overnight fasting preferred.",
      parameters: [
        { name: "Total Bilirubin", code: "TBIL", unit: "mg/dL", orderIndex: 1, generalMin: 0.2, generalMax: 1.2, criticalHigh: 5.0, referenceText: "0.2 - 1.2 mg/dL" },
        { name: "Direct (Conjugated) Bilirubin", code: "DBIL", unit: "mg/dL", orderIndex: 2, generalMin: 0.0, generalMax: 0.3, referenceText: "0.0 - 0.3 mg/dL" },
        { name: "SGOT (AST)", code: "SGOT", unit: "U/L", orderIndex: 3, generalMin: 5.0, generalMax: 40.0, criticalHigh: 200.0, referenceText: "5 - 40 U/L" },
        { name: "SGPT (ALT)", code: "SGPT", unit: "U/L", orderIndex: 4, generalMin: 5.0, generalMax: 45.0, criticalHigh: 200.0, referenceText: "5 - 45 U/L" },
        { name: "Alkaline Phosphatase (ALP)", code: "ALP", unit: "U/L", orderIndex: 5, generalMin: 30.0, generalMax: 120.0, referenceText: "30 - 120 U/L" },
        { name: "Total Serum Protein", code: "TP", unit: "g/dL", orderIndex: 6, generalMin: 6.4, generalMax: 8.3, referenceText: "6.4 - 8.3 g/dL" },
        { name: "Serum Albumin", code: "ALB", unit: "g/dL", orderIndex: 7, generalMin: 3.5, generalMax: 5.0, referenceText: "3.5 - 5.0 g/dL" },
        { name: "Serum Globulin", code: "GLOB", unit: "g/dL", orderIndex: 8, calculationFormula: "TP - ALB", generalMin: 2.0, generalMax: 3.5, referenceText: "2.0 - 3.5 g/dL" },
        { name: "A/G Ratio", code: "AG_RATIO", unit: "Ratio", orderIndex: 9, calculationFormula: "ALB / GLOB", generalMin: 1.2, generalMax: 2.2, referenceText: "1.2 - 2.2" }
      ]
    },
    {
      code: "RFT",
      name: "Renal / Kidney Function Test (RFT / KFT)",
      department: "BIOCHEMISTRY",
      specimenType: "Serum",
      price: 600,
      tatHours: 3,
      method: "Jaffe Kinetic / Urease Enzymatic",
      instructions: "Routine random or morning sample.",
      parameters: [
        { name: "Blood Urea", code: "UREA", unit: "mg/dL", orderIndex: 1, generalMin: 15.0, generalMax: 45.0, criticalHigh: 100.0, referenceText: "15 - 45 mg/dL" },
        { name: "Serum Creatinine", code: "CREAT", unit: "mg/dL", orderIndex: 2, maleMin: 0.7, maleMax: 1.3, femaleMin: 0.6, femaleMax: 1.1, criticalHigh: 3.5, referenceText: "Male: 0.7 - 1.3 | Female: 0.6 - 1.1 mg/dL" },
        { name: "Serum Uric Acid", code: "URIC", unit: "mg/dL", orderIndex: 3, maleMin: 3.5, maleMax: 7.2, femaleMin: 2.6, femaleMax: 6.0, referenceText: "Male: 3.5 - 7.2 | Female: 2.6 - 6.0 mg/dL" },
        { name: "Serum Calcium", code: "CALC", unit: "mg/dL", orderIndex: 4, generalMin: 8.5, generalMax: 10.5, criticalLow: 6.5, criticalHigh: 13.0, referenceText: "8.5 - 10.5 mg/dL" }
      ]
    },
    {
      code: "THYROID",
      name: "Thyroid Profile (Total T3, Total T4, TSH Ultra)",
      department: "IMMUNOLOGY",
      specimenType: "Serum",
      price: 550,
      tatHours: 4,
      method: "Chemiluminescence Immunoassay (CLIA)",
      instructions: "Morning fasting sample recommended.",
      parameters: [
        { name: "Total Triiodothyronine (T3)", code: "T3", unit: "ng/dL", orderIndex: 1, generalMin: 60.0, generalMax: 200.0, referenceText: "60 - 200 ng/dL" },
        { name: "Total Thyroxine (T4)", code: "T4", unit: "µg/dL", orderIndex: 2, generalMin: 4.5, generalMax: 12.0, referenceText: "4.5 - 12.0 µg/dL" },
        { name: "Thyroid Stimulating Hormone (TSH)", code: "TSH", unit: "µIU/mL", orderIndex: 3, generalMin: 0.35, generalMax: 4.94, criticalLow: 0.05, criticalHigh: 20.0, referenceText: "0.35 - 4.94 µIU/mL" }
      ]
    },
    {
      code: "FBS_PPBS",
      name: "Blood Glucose (Fasting & Post Prandial)",
      department: "BIOCHEMISTRY",
      specimenType: "Fluoride Plasma (Grey Top)",
      price: 150,
      tatHours: 2,
      method: "Hexokinase / GOD-POD",
      instructions: "Fasting: 8-10 hrs. PPBS: Exactly 2 hours after breakfast.",
      parameters: [
        { name: "Fasting Blood Sugar (FBS)", code: "FBS", unit: "mg/dL", orderIndex: 1, generalMin: 70.0, generalMax: 99.0, criticalLow: 50.0, criticalHigh: 350.0, referenceText: "70 - 99 mg/dL (Normal)" },
        { name: "Post Prandial Blood Sugar (PPBS)", code: "PPBS", unit: "mg/dL", orderIndex: 2, generalMin: 80.0, generalMax: 140.0, criticalLow: 50.0, criticalHigh: 400.0, referenceText: "< 140 mg/dL (Normal)" }
      ]
    }
  ];

  for (const t of testCatalog) {
    const { parameters, ...testData } = t;
    
    // Create/Update Product first so test can be billed on POS
    let product = await prisma.product.findFirst({
      where: {
        tenantId,
        sku: `LAB-${t.code}`
      }
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          tenantId,
          name: t.name,
          displayName: `${t.code} - ${t.name}`,
          sku: `LAB-${t.code}`,
          barcode: `TEST-${t.code}`,
          hsnCode: "999312", // Medical & Diagnostic Testing Services SAC/HSN
          category: "DIAGNOSTIC_TEST",
          sellingPrice: t.price,
          purchasePrice: 0,
          currentStock: 9999, // Diagnostic service has virtual unlimited stock
          gstRate: 0.0, // Healthcare diagnostic services are exempt under GST in India
          isLabTest: true
        }
      });
    }

    const labTest = await prisma.labTest.upsert({
      where: {
        tenantId_code: {
          tenantId,
          code: t.code
        }
      },
      update: {
        ...testData,
        productId: product.id
      },
      create: {
        ...testData,
        tenantId,
        productId: product.id
      }
    });

    // Upsert parameters
    for (const p of parameters) {
      const existingParam = await prisma.labTestParameter.findFirst({
        where: {
          testId: labTest.id,
          name: p.name
        }
      });

      if (existingParam) {
        await prisma.labTestParameter.update({
          where: { id: existingParam.id },
          data: p
        });
      } else {
        await prisma.labTestParameter.create({
          data: {
            ...p,
            tenantId,
            testId: labTest.id
          }
        });
      }
    }
  }

  console.log(`Seeded ${testCatalog.length} World-Standard Diagnostic Tests with Parameters!`);

  // 5. Seed Real Demo Orders in 3 different stages:
  // Order A: SAMPLE_PENDING (Just registered at counter, awaiting blood draw)
  // Order B: IN_TESTING (Sample collected, values currently on analyzer)
  // Order C: VERIFIED (Doctor signed off, ready for print/download report)

  const cbcTest = await prisma.labTest.findUnique({
    where: { tenantId_code: { tenantId, code: "CBC" } },
    include: { parameters: true }
  });

  const lipidTest = await prisma.labTest.findUnique({
    where: { tenantId_code: { tenantId, code: "LIPID" } },
    include: { parameters: true }
  });

  const lftTest = await prisma.labTest.findUnique({
    where: { tenantId_code: { tenantId, code: "LFT" } },
    include: { parameters: true }
  });

  // Patient 1: Suresh Menon, Male, 54 yrs (SAMPLE_PENDING)
  const orderA = await prisma.labOrder.upsert({
    where: {
      tenantId_orderNumber: {
        tenantId,
        orderNumber: "LAB-2610-0001"
      }
    },
    update: {},
    create: {
      tenantId,
      orderNumber: "LAB-2610-0001",
      sampleBarcode: "SMP-849201",
      patientName: "Suresh Menon",
      patientAge: 54,
      patientAgeUnit: "YEARS",
      patientGender: "MALE",
      patientPhone: "+91 98460 55441",
      referringDoctorName: "Dr. Rajesh Varma",
      status: "SAMPLE_PENDING",
      sampleType: "EDTA Whole Blood & Fasting Serum",
      clinicalHistory: "Routine annual master health checkup. Mild hypertension.",
      items: {
        create: [
          { testId: cbcTest!.id, testName: cbcTest!.name, department: cbcTest!.department, price: cbcTest!.price },
          { testId: lipidTest!.id, testName: lipidTest!.name, department: lipidTest!.department, price: lipidTest!.price }
        ]
      }
    }
  });

  // Patient 2: Meera Krishnan, Female, 29 yrs (IN_TESTING)
  const orderB = await prisma.labOrder.upsert({
    where: {
      tenantId_orderNumber: {
        tenantId,
        orderNumber: "LAB-2610-0002"
      }
    },
    update: {},
    create: {
      tenantId,
      orderNumber: "LAB-2610-0002",
      sampleBarcode: "SMP-849202",
      patientName: "Meera Krishnan",
      patientAge: 29,
      patientAgeUnit: "YEARS",
      patientGender: "FEMALE",
      patientPhone: "+91 94471 22334",
      referringDoctorName: "Dr. Priya Menon",
      status: "IN_TESTING",
      sampleType: "EDTA Whole Blood",
      collectedAt: new Date(Date.now() - 45 * 60 * 1000), // Collected 45 mins ago
      collectedBy: "Rahul Kumar (Phlebotomy)",
      receivedAt: new Date(Date.now() - 30 * 60 * 1000),
      testedBy: "Rahul Kumar",
      clinicalHistory: "General fatigue, screening for microcytic anemia.",
      items: {
        create: [
          { testId: cbcTest!.id, testName: cbcTest!.name, department: cbcTest!.department, price: cbcTest!.price }
        ]
      }
    }
  });

  // Patient 3: George Varghese, Male, 62 yrs (VERIFIED & SIGNED OFF)
  // Has critical abnormal Platelet & High Cholesterol - perfect for testing reports & flags!
  const orderC = await prisma.labOrder.upsert({
    where: {
      tenantId_orderNumber: {
        tenantId,
        orderNumber: "LAB-2610-0003"
      }
    },
    update: {},
    create: {
      tenantId,
      orderNumber: "LAB-2610-0003",
      sampleBarcode: "SMP-849203",
      patientName: "George Varghese",
      patientAge: 62,
      patientAgeUnit: "YEARS",
      patientGender: "MALE",
      patientPhone: "+91 98471 99887",
      referringDoctorName: "Dr. Sunil Joseph",
      status: "VERIFIED",
      sampleType: "EDTA Whole Blood & Serum",
      collectedAt: new Date(Date.now() - 3 * 3600 * 1000),
      collectedBy: "Rahul Kumar",
      receivedAt: new Date(Date.now() - 2.5 * 3600 * 1000),
      testedAt: new Date(Date.now() - 1.5 * 3600 * 1000),
      testedBy: "Rahul Kumar",
      verifiedAt: new Date(Date.now() - 30 * 60 * 1000),
      verifiedBy: "Dr. Ananya Nair, MD",
      pathologistSignatureUrl: "/signatures/dr_ananya_pathology.png",
      pathologistRemarks: "CBC reveals moderate thrombocytopenia (Platelets 85,000). Lipid profile indicates mixed dyslipidemia with elevated LDL and Total Cholesterol. Suggest clinical correlation and repeat platelet count after 10 days.",
      hasCriticalAlert: true,
      criticalAlertNotes: "Low Platelet count alert communicated to Dr. Sunil Joseph at 11:15 AM.",
      clinicalHistory: "Post-CABG follow-up. Dyslipidemia and bleeding tendency evaluation.",
      items: {
        create: [
          { testId: cbcTest!.id, testName: cbcTest!.name, department: cbcTest!.department, price: cbcTest!.price, status: "COMPLETED" },
          { testId: lipidTest!.id, testName: lipidTest!.name, department: lipidTest!.department, price: lipidTest!.price, status: "COMPLETED" }
        ]
      }
    }
  });

  // Populate results for Order C
  const orderCResults = [
    // CBC
    { testName: "Complete Blood Count", parameterName: "Hemoglobin (Hb)", parameterCode: "HB", resultValue: "11.8", numericValue: 11.8, unit: "g/dL", referenceInterval: "13.5 - 17.5 g/dL", flag: "LOW", orderIndex: 1 },
    { testName: "Complete Blood Count", parameterName: "Total Leukocyte Count (WBC)", parameterCode: "WBC", resultValue: "7800", numericValue: 7800, unit: "cells/cu.mm", referenceInterval: "4,000 - 11,000 cells/cu.mm", flag: "NORMAL", orderIndex: 2 },
    { testName: "Complete Blood Count", parameterName: "Red Blood Cell Count (RBC)", parameterCode: "RBC", resultValue: "4.20", numericValue: 4.20, unit: "million/cu.mm", referenceInterval: "4.5 - 5.5 million/cu.mm", flag: "LOW", orderIndex: 3 },
    { testName: "Complete Blood Count", parameterName: "Packed Cell Volume (PCV)", parameterCode: "PCV", resultValue: "37.5", numericValue: 37.5, unit: "%", referenceInterval: "40.0 - 50.0 %", flag: "LOW", orderIndex: 4 },
    { testName: "Complete Blood Count", parameterName: "Platelet Count", parameterCode: "PLT", resultValue: "0.85", numericValue: 0.85, unit: "lakhs/cu.mm", referenceInterval: "1.50 - 4.50 lakhs/cu.mm", flag: "CRITICAL_LOW", remarks: "Confirmed by peripheral smear examination", orderIndex: 5 },
    { testName: "Complete Blood Count", parameterName: "Mean Corpuscular Volume (MCV)", parameterCode: "MCV", resultValue: "89.2", numericValue: 89.2, unit: "fL", referenceInterval: "80.0 - 100.0 fL", flag: "NORMAL", orderIndex: 6 },
    { testName: "Complete Blood Count", parameterName: "Neutrophils", parameterCode: "NEUT", resultValue: "64", numericValue: 64, unit: "%", referenceInterval: "40 - 70 %", flag: "NORMAL", orderIndex: 7 },
    { testName: "Complete Blood Count", parameterName: "Lymphocytes", parameterCode: "LYMPH", resultValue: "28", numericValue: 28, unit: "%", referenceInterval: "20 - 45 %", flag: "NORMAL", orderIndex: 8 },

    // Lipid Profile
    { testName: "Lipid Profile", parameterName: "Total Cholesterol", parameterCode: "CHOL", resultValue: "248.0", numericValue: 248.0, unit: "mg/dL", referenceInterval: "< 200.0 mg/dL Desirable", flag: "HIGH", orderIndex: 9 },
    { testName: "Lipid Profile", parameterName: "HDL Cholesterol (Good)", parameterCode: "HDL", resultValue: "36.0", numericValue: 36.0, unit: "mg/dL", referenceInterval: "> 40.0 mg/dL", flag: "LOW", orderIndex: 10 },
    { testName: "Lipid Profile", parameterName: "Serum Triglycerides", parameterCode: "TRIG", resultValue: "215.0", numericValue: 215.0, unit: "mg/dL", referenceInterval: "< 150.0 mg/dL", flag: "HIGH", orderIndex: 11 },
    { testName: "Lipid Profile", parameterName: "LDL Cholesterol (Friedewald)", parameterCode: "LDL", resultValue: "169.0", numericValue: 169.0, unit: "mg/dL", referenceInterval: "< 100.0 mg/dL Optimal", flag: "HIGH", remarks: "Calculated: Total Chol - HDL - (Trig/5)", orderIndex: 12 },
    { testName: "Lipid Profile", parameterName: "VLDL Cholesterol", parameterCode: "VLDL", resultValue: "43.0", numericValue: 43.0, unit: "mg/dL", referenceInterval: "10.0 - 30.0 mg/dL", flag: "HIGH", orderIndex: 13 },
    { testName: "Lipid Profile", parameterName: "Chol / HDL Ratio", parameterCode: "RATIO", resultValue: "6.89", numericValue: 6.89, unit: "Ratio", referenceInterval: "3.3 - 4.5 Desirable", flag: "HIGH", orderIndex: 14 }
  ];

  await prisma.labOrderResult.deleteMany({
    where: { labOrderId: orderC.id }
  });

  for (const r of orderCResults) {
    await prisma.labOrderResult.create({
      data: {
        ...r,
        labOrderId: orderC.id
      }
    });
  }

  console.log("✅ Seed Complete! Apex Diagnostics is ready with tests, parameters, and demo queue!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
