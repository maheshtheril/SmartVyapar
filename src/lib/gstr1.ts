/**
 * Official GSTN GSTR-1 Bulk Portal JSON Schema Generator
 * Conforms to GST Offline Tool / GSTN Portal Upload Specification
 */

export interface Gstr1Item {
  name?: string;
  productName?: string;
  hsnCode?: string | null;
  unit?: string | null;
  unitSold?: string | null;
  unitReturned?: string | null;
  quantity: number | string;
  unitPrice: number | string;
  gstRate: number | string;
  cgstAmount?: number | string;
  sgstAmount?: number | string;
  igstAmount?: number | string;
  lineTotal?: number | string;
  totalAmount?: number | string;
}

export interface Gstr1Invoice {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date | string;
  customerName: string;
  customerPhone?: string | null;
  customerGstin?: string | null;
  customerStateCode?: string | null;
  isInterState?: boolean;
  subtotal: number | string;
  cgstAmount: number | string;
  sgstAmount: number | string;
  igstAmount: number | string;
  totalTax: number | string;
  totalAmount: number | string;
  items: Gstr1Item[];
}

export interface Gstr1CreditNote {
  id: string;
  creditNoteNumber: string;
  creditNoteDate: Date | string;
  originalInvoiceNumber: string;
  originalInvoiceDate: Date | string;
  customerName: string;
  customerGstin?: string | null;
  customerStateCode: string;
  isInterState?: boolean;
  subtotal: number | string;
  cgstAmount: number | string;
  sgstAmount: number | string;
  igstAmount: number | string;
  totalTax: number | string;
  totalAmount: number | string;
  items: Gstr1Item[];
}

export interface Gstr1Tenant {
  gstin?: string | null;
  stateCode?: string | null;
  isComposition?: boolean;
  businessName?: string;
}

export function formatGstDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function normalizeUqc(unit?: string | null): string {
  if (!unit) return "OTH";
  const u = unit.trim().toUpperCase();
  const validUqc: Record<string, string> = {
    PCS: "PCS",
    PIECES: "PCS",
    NOS: "NOS",
    NUMBERS: "NOS",
    KG: "KGS",
    KGS: "KGS",
    KILOGRAMS: "KGS",
    MTR: "MTR",
    METERS: "MTR",
    LTR: "LTR",
    LITRES: "LTR",
    BOX: "BOX",
    BOXES: "BOX",
    BAG: "BAG",
    BAGS: "BAG",
    CTN: "CTN",
    CARTON: "CTN",
    DOZ: "DOZ",
    DOZEN: "DOZ",
    SET: "SET",
  };
  return validUqc[u] || "OTH";
}

/**
 * Generates the official GSTN Portal compliant GSTR-1 JSON Payload
 */
export function generateOfficialGstr1Json(params: {
  tenant: Gstr1Tenant;
  invoices: Gstr1Invoice[];
  creditNotes: Gstr1CreditNote[];
  returnPeriod: string; // MMYYYY e.g. "092026"
  grossTurnover?: number;
}) {
  const { tenant, invoices, creditNotes, returnPeriod, grossTurnover } = params;
  const tenantGstin = tenant.gstin || "32AAAAA0000A1Z5";
  const tenantState = tenant.stateCode || "32";

  let totalSalesTurnover = 0;

  // 1. Group Invoices into B2B (with GSTIN) vs B2C Small (without GSTIN)
  const b2bMap: Record<string, any[]> = {};
  const b2csMap: Record<string, { txval: number; iamt: number; camt: number; samt: number; csamt: number; sply_ty: string; pos: string; typ: string; rt: number }> = {};

  for (const inv of invoices) {
    const invTotal = Number(inv.totalAmount || 0);
    totalSalesTurnover += invTotal;

    const custGstin = inv.customerGstin?.trim().toUpperCase();
    const hasGstin = custGstin && custGstin.length === 15 && custGstin !== "URP";
    const pos = inv.customerStateCode || tenantState;
    const isInter = inv.isInterState ?? (pos !== tenantState);

    // Prepare line item details
    const itms = inv.items.map((item, idx) => {
      const rt = Number(item.gstRate || 0);
      const qty = Number(item.quantity || 1);
      const price = Number(item.unitPrice || 0);
      const txval = Number((price * qty).toFixed(2));
      const camt = Number(item.cgstAmount || 0);
      const samt = Number(item.sgstAmount || 0);
      const iamt = Number(item.igstAmount || 0);

      return {
        num: idx + 1,
        itm_det: {
          rt,
          txval,
          iamt,
          camt,
          samt,
          csamt: 0.0,
        },
      };
    });

    if (hasGstin) {
      if (!b2bMap[custGstin]) {
        b2bMap[custGstin] = [];
      }
      b2bMap[custGstin].push({
        inum: inv.invoiceNumber,
        idt: formatGstDate(inv.invoiceDate),
        val: Number(invTotal.toFixed(2)),
        pos,
        rchrg: "N",
        inv_typ: "R",
        itms,
      });
    } else {
      // B2CS: Aggregate by POS + Tax Rate
      for (const item of inv.items) {
        const rt = Number(item.gstRate || 0);
        const qty = Number(item.quantity || 1);
        const price = Number(item.unitPrice || 0);
        const txval = Number((price * qty).toFixed(2));
        const camt = Number(item.cgstAmount || 0);
        const samt = Number(item.sgstAmount || 0);
        const iamt = Number(item.igstAmount || 0);

        const key = `${pos}_${rt}_${isInter ? "INTER" : "INTRA"}`;
        if (!b2csMap[key]) {
          b2csMap[key] = {
            sply_ty: isInter ? "INTER" : "INTRA",
            pos,
            typ: "OE",
            rt,
            txval: 0,
            iamt: 0,
            camt: 0,
            samt: 0,
            csamt: 0.0,
          };
        }
        b2csMap[key].txval = Number((b2csMap[key].txval + txval).toFixed(2));
        b2csMap[key].iamt = Number((b2csMap[key].iamt + iamt).toFixed(2));
        b2csMap[key].camt = Number((b2csMap[key].camt + camt).toFixed(2));
        b2csMap[key].samt = Number((b2csMap[key].samt + samt).toFixed(2));
      }
    }
  }

  // Build B2B array
  const b2b = Object.keys(b2bMap).map((ctin) => ({
    ctin,
    inv: b2bMap[ctin],
  }));

  // Build B2CS array
  const b2cs = Object.values(b2csMap);

  // 2. Process Credit Notes (CDNR vs CDNUR)
  const cdnrMap: Record<string, any[]> = {};
  const cdnur: any[] = [];

  for (const cn of creditNotes) {
    const custGstin = cn.customerGstin?.trim().toUpperCase();
    const hasGstin = custGstin && custGstin.length === 15 && custGstin !== "URP";
    const cnTotal = Number(cn.totalAmount || 0);

    const itms = cn.items.map((item, idx) => {
      const rt = Number(item.gstRate || 0);
      const qty = Number(item.quantity || 1);
      const price = Number(item.unitPrice || 0);
      const txval = Number((price * qty).toFixed(2));
      const camt = Number(item.cgstAmount || 0);
      const samt = Number(item.sgstAmount || 0);
      const iamt = Number(item.igstAmount || 0);

      return {
        num: idx + 1,
        itm_det: {
          rt,
          txval,
          iamt,
          camt,
          samt,
          csamt: 0.0,
        },
      };
    });

    const notePayload = {
      ntty: "C", // C = Credit Note, D = Debit Note
      nt_num: cn.creditNoteNumber,
      nt_dt: formatGstDate(cn.creditNoteDate),
      p_gst: "N",
      inum: cn.originalInvoiceNumber,
      idt: formatGstDate(cn.originalInvoiceDate),
      val: Number(cnTotal.toFixed(2)),
      itms,
    };

    if (hasGstin) {
      if (!cdnrMap[custGstin]) {
        cdnrMap[custGstin] = [];
      }
      cdnrMap[custGstin].push(notePayload);
    } else {
      cdnur.push({
        typ: cn.isInterState && cnTotal > 250000 ? "B2CL" : "B2CS",
        ...notePayload,
      });
    }
  }

  const cdnr = Object.keys(cdnrMap).map((ctin) => ({
    ctin,
    nt: cdnrMap[ctin],
  }));

  // 3. Table 12 HSN Summary of Outward Supplies
  const hsnSummaryMap: Record<string, {
    hsn_sc: string;
    desc: string;
    uqc: string;
    qty: number;
    val: number;
    txval: number;
    iamt: number;
    camt: number;
    samt: number;
    csamt: number;
  }> = {};

  for (const inv of invoices) {
    for (const item of inv.items) {
      if (!item.hsnCode) {
        throw new Error(`HSN code is strictly required for GSTR-1 reporting on item: ${item.productName || "Unknown"}`);
      }
      const hsn = item.hsnCode.trim();
      const uqc = normalizeUqc(item.unit || item.unitSold);
      const key = `${hsn}_${uqc}`;
      const qty = Number(item.quantity || 1);
      const price = Number(item.unitPrice || 0);
      const txval = Number((price * qty).toFixed(2));
      const camt = Number(item.cgstAmount || 0);
      const samt = Number(item.sgstAmount || 0);
      const iamt = Number(item.igstAmount || 0);
      const val = Number((txval + camt + samt + iamt).toFixed(2));
      const desc = item.productName || item.name || "Goods";

      if (!hsnSummaryMap[key]) {
        hsnSummaryMap[key] = {
          hsn_sc: hsn,
          desc,
          uqc,
          qty: 0,
          val: 0,
          txval: 0,
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0.0,
        };
      }
      hsnSummaryMap[key].qty = Number((hsnSummaryMap[key].qty + qty).toFixed(3));
      hsnSummaryMap[key].val = Number((hsnSummaryMap[key].val + val).toFixed(2));
      hsnSummaryMap[key].txval = Number((hsnSummaryMap[key].txval + txval).toFixed(2));
      hsnSummaryMap[key].iamt = Number((hsnSummaryMap[key].iamt + iamt).toFixed(2));
      hsnSummaryMap[key].camt = Number((hsnSummaryMap[key].camt + camt).toFixed(2));
      hsnSummaryMap[key].samt = Number((hsnSummaryMap[key].samt + samt).toFixed(2));
    }
  }

  // Subtract Credit Notes
  for (const cn of creditNotes) {
    for (const item of cn.items) {
      if (!item.hsnCode) {
        throw new Error(`HSN code is strictly required for GSTR-1 reporting on credit note item: ${item.productName || "Unknown"}`);
      }
      const hsn = item.hsnCode.trim();
      const uqc = normalizeUqc(item.unitReturned || "PCS");
      const key = `${hsn}_${uqc}`;
      
      const qty = Number(item.quantity || 1);
      const price = Number(item.unitPrice || 0);
      const txval = Number((price * qty).toFixed(2));
      const camt = Number(item.cgstAmount || 0);
      const samt = Number(item.sgstAmount || 0);
      const iamt = Number(item.igstAmount || 0);
      const val = Number((txval + camt + samt + iamt).toFixed(2));
      const desc = item.productName || item.name || "Goods";

      if (!hsnSummaryMap[key]) {
        hsnSummaryMap[key] = {
          hsn_sc: hsn,
          desc,
          uqc,
          qty: 0,
          val: 0,
          txval: 0,
          iamt: 0,
          camt: 0,
          samt: 0,
          csamt: 0.0,
        };
      }
      hsnSummaryMap[key].qty = Number((hsnSummaryMap[key].qty - qty).toFixed(3));
      hsnSummaryMap[key].val = Number((hsnSummaryMap[key].val - val).toFixed(2));
      hsnSummaryMap[key].txval = Number((hsnSummaryMap[key].txval - txval).toFixed(2));
      hsnSummaryMap[key].iamt = Number((hsnSummaryMap[key].iamt - iamt).toFixed(2));
      hsnSummaryMap[key].camt = Number((hsnSummaryMap[key].camt - camt).toFixed(2));
      hsnSummaryMap[key].samt = Number((hsnSummaryMap[key].samt - samt).toFixed(2));
    }
  }

  const hsnData = Object.values(hsnSummaryMap).map((h, idx) => ({
    num: idx + 1,
    ...h,
  }));

  // 4. Table 13 Documents Issued
  const docDet: any[] = [];

  // Helper to group by prefix and generate ranges
  function generateDocSeries(documents: any[], docNumType: number, getDocNo: (d: any) => string) {
    if (documents.length === 0) return null;
    
    // Group by prefix (e.g. "INV-2627-" or "CN-")
    const groups: Record<string, any[]> = {};
    for (const doc of documents) {
      const docNo = getDocNo(doc);
      // Extract prefix (everything up to the last dash)
      const lastDash = docNo.lastIndexOf("-");
      const prefix = lastDash >= 0 ? docNo.substring(0, lastDash + 1) : "SERIES-";
      if (!groups[prefix]) groups[prefix] = [];
      groups[prefix].push(doc);
    }

    const docsOutput = [];
    let num = 1;
    for (const [prefix, groupDocs] of Object.entries(groups)) {
      const sorted = [...groupDocs].sort((a, b) => getDocNo(a).localeCompare(getDocNo(b)));
      const totnum = sorted.length;
      // In ZionaPOS, cancelled invoices currently aren't fetched if paymentStatus is filtered, 
      // but if they are passed, we count them. We assume they have status === 'CANCELLED'
      const canc = sorted.filter(d => d.status === "CANCELLED").length;
      docsOutput.push({
        num: num++,
        from: getDocNo(sorted[0]),
        to: getDocNo(sorted[sorted.length - 1]),
        totnum,
        canc,
        net_issue: totnum - canc,
      });
    }

    return {
      doc_num: docNumType,
      docs: docsOutput,
    };
  }

  const invoiceSeries = generateDocSeries(invoices, 1, d => d.invoiceNumber);
  if (invoiceSeries) docDet.push(invoiceSeries);

  const cnSeries = generateDocSeries(creditNotes, 2, d => d.creditNoteNumber);
  if (cnSeries) docDet.push(cnSeries);

  const calculatedGrossTurnover = Number(
    (grossTurnover !== undefined ? grossTurnover : totalSalesTurnover).toFixed(2)
  );

  return {
    gstin: tenantGstin,
    fp: returnPeriod,
    gt: calculatedGrossTurnover,
    cur_gt: calculatedGrossTurnover,
    b2b,
    b2cs,
    cdnr,
    cdnur,
    hsn: {
      data: hsnData,
    },
    doc_issue: {
      doc_det: docDet,
    },
  };
}

/**
 * CA-Ready GSTR-3B monthly tax summary calculator
 */
export function generateGstr3bSummary(params: {
  invoices: Gstr1Invoice[];
  creditNotes: Gstr1CreditNote[];
  purchases?: Array<{
    totalAmount: number | string;
    subtotal?: number | string;
    cgstAmount?: number | string;
    sgstAmount?: number | string;
    igstAmount?: number | string;
  }>;
}) {
  const { invoices, creditNotes, purchases = [] } = params;

  // 1. Outward Taxable Supplies (Sales)
  let grossTaxable = 0;
  let grossCgst = 0;
  let grossSgst = 0;
  let grossIgst = 0;

  for (const inv of invoices) {
    grossTaxable += Number(inv.subtotal || 0);
    grossCgst += Number(inv.cgstAmount || 0);
    grossSgst += Number(inv.sgstAmount || 0);
    grossIgst += Number(inv.igstAmount || 0);
  }

  // 2. Returns & Adjustments (Credit Notes)
  let returnedTaxable = 0;
  let returnedCgst = 0;
  let returnedSgst = 0;
  let returnedIgst = 0;

  for (const cn of creditNotes) {
    returnedTaxable += Number(cn.subtotal || 0);
    returnedCgst += Number(cn.cgstAmount || 0);
    returnedSgst += Number(cn.sgstAmount || 0);
    returnedIgst += Number(cn.igstAmount || 0);
  }

  // Net Output Tax
  const netTaxable = Math.max(0, grossTaxable - returnedTaxable);
  const netCgst = Math.max(0, grossCgst - returnedCgst);
  const netSgst = Math.max(0, grossSgst - returnedSgst);
  const netIgst = Math.max(0, grossIgst - returnedIgst);
  const totalOutputTax = netCgst + netSgst + netIgst;

  // 3. Eligible Input Tax Credit (ITC from Purchases)
  let itmCgst = 0;
  let itmSgst = 0;
  let itmIgst = 0;

  for (const pb of purchases) {
    itmCgst += Number(pb.cgstAmount || 0);
    itmSgst += Number(pb.sgstAmount || 0);
    itmIgst += Number(pb.igstAmount || 0);
  }
  const totalItc = itmCgst + itmSgst + itmIgst;

  // 4. Net Tax Payable (Output Tax minus ITC)
  const payableCgst = Math.max(0, netCgst - itmCgst);
  const payableSgst = Math.max(0, netSgst - itmSgst);
  const payableIgst = Math.max(0, netIgst - itmIgst);
  const netPayable = payableCgst + payableSgst + payableIgst;

  return {
    outwardSupplies: {
      taxableValue: Number(netTaxable.toFixed(2)),
      cgst: Number(netCgst.toFixed(2)),
      sgst: Number(netSgst.toFixed(2)),
      igst: Number(netIgst.toFixed(2)),
      totalOutputTax: Number(totalOutputTax.toFixed(2)),
    },
    inputTaxCredit: {
      cgst: Number(itmCgst.toFixed(2)),
      sgst: Number(itmSgst.toFixed(2)),
      igst: Number(itmIgst.toFixed(2)),
      totalItc: Number(totalItc.toFixed(2)),
    },
    netPayable: {
      cgst: Number(payableCgst.toFixed(2)),
      sgst: Number(payableSgst.toFixed(2)),
      igst: Number(payableIgst.toFixed(2)),
      totalPayable: Number(netPayable.toFixed(2)),
      status: netPayable > 0 ? "TAX_PAYABLE" : "CREDIT_CARRY_FORWARD",
    },
  };
}
