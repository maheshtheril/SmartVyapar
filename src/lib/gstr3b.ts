/**
 * SmartVyapar Statutory GSTR-3B Preparation Engine
 * Complies with Section 39 of CGST Act & Rule 88A (Order of utilization of Input Tax Credit)
 */

export interface Gstr3bComputationInput {
  period: string; // MMYYYY e.g. "082026"
  tenant: {
    gstin?: string | null;
    stateCode: string;
    businessName: string;
  };
  invoices: Array<{
    invoiceNumber: string;
    invoiceDate: Date | string;
    subtotal: number | string;
    cgstAmount: number | string;
    sgstAmount: number | string;
    igstAmount: number | string;
    totalAmount: number | string;
    customerGstin?: string | null;
    customerStateCode?: string | null;
    isInterState?: boolean;
  }>;
  creditNotes: Array<{
    subtotal: number | string;
    cgstAmount: number | string;
    sgstAmount: number | string;
    igstAmount: number | string;
    totalAmount: number | string;
    isInterState?: boolean;
  }>;
  purchaseBills: Array<{
    billNumber: string;
    totalTaxable: number | string;
    cgstAmount: number | string;
    sgstAmount: number | string;
    igstAmount: number | string;
    totalAmount: number | string;
  }>;
  reconciled2bItc?: {
    igst: number;
    cgst: number;
    sgst: number;
    ineligibleIgst?: number;
    ineligibleCgst?: number;
    ineligibleSgst?: number;
  };
}

export interface Gstr3bReport {
  period: string;
  financialYear: string;
  tenantGstin: string;
  tenantStateCode: string;

  // Table 3.1: Outward Supplies & Inward Liable to Reverse Charge
  table31: {
    taxableOutward: {
      txval: number;
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    };
    zeroRated: { txval: number; iamt: number; csamt: number };
    nilExempt: { txval: number };
    reverseChargeInward: { txval: number; iamt: number; camt: number; samt: number; csamt: number };
    nonGst: { txval: number };
  };

  // Table 3.2: Inter-state supplies to unregistered persons
  table32: Array<{
    pos: string;
    txval: number;
    iamt: number;
  }>;

  // Table 4: Eligible ITC
  table4: {
    itcAvailable: {
      importGoods: { iamt: number; csamt: number };
      importServices: { iamt: number; csamt: number };
      reverseCharge: { iamt: number; camt: number; samt: number; csamt: number };
      isd: { iamt: number; camt: number; samt: number; csamt: number };
      allOtherItc: { iamt: number; camt: number; samt: number; csamt: number };
    };
    itcReversed: {
      asPerRule4243: { iamt: number; camt: number; samt: number; csamt: number };
      others: { iamt: number; camt: number; samt: number; csamt: number };
    };
    netItc: {
      iamt: number;
      camt: number;
      samt: number;
      csamt: number;
    };
    ineligibleItc: {
      section175: { iamt: number; camt: number; samt: number; csamt: number };
      others: { iamt: number; camt: number; samt: number; csamt: number };
    };
  };

  // Table 5: Inward supplies exempt, nil & non-GST
  table5: {
    interState: number;
    intraState: number;
  };

  // Table 6.1: Tax payment calculation & Rule 88A offset
  table61: {
    taxPayable: { iamt: number; camt: number; samt: number };
    paidThroughItc: {
      igstPaidWith: { igst: number; cgst: number; sgst: number };
      cgstPaidWith: { igst: number; cgst: number };
      sgstPaidWith: { igst: number; sgst: number };
    };
    taxPaidInCash: {
      iamt: number;
      camt: number;
      samt: number;
      total: number;
    };
  };
}

/**
 * Computes statutory GSTR-3B return according to GST rules & Rule 88A setoff
 */
export function computeGstr3bReturn(input: Gstr3bComputationInput): Gstr3bReport {
  const { period, tenant, invoices, creditNotes, purchaseBills, reconciled2bItc } = input;

  // 1. Calculate Gross Sales from Invoices
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

  // 2. Deduct Sales Returns from Credit Notes (Rule 53)
  let cnTaxable = 0;
  let cnCgst = 0;
  let cnSgst = 0;
  let cnIgst = 0;

  for (const cn of creditNotes) {
    cnTaxable += Number(cn.subtotal || 0);
    cnCgst += Number(cn.cgstAmount || 0);
    cnSgst += Number(cn.sgstAmount || 0);
    cnIgst += Number(cn.igstAmount || 0);
  }

  const netTaxable = Math.max(0, grossTaxable - cnTaxable);
  const netCgst = Math.max(0, grossCgst - cnCgst);
  const netSgst = Math.max(0, grossSgst - cnSgst);
  const netIgst = Math.max(0, grossIgst - cnIgst);

  // 3. Table 3.2: Inter-state supplies to unregistered persons
  const interStateMap = new Map<string, { txval: number; iamt: number }>();
  for (const inv of invoices) {
    if (inv.isInterState && (!inv.customerGstin || inv.customerGstin.length < 15)) {
      const pos = inv.customerStateCode || '97';
      const existing = interStateMap.get(pos) || { txval: 0, iamt: 0 };
      existing.txval += Number(inv.subtotal || 0);
      existing.iamt += Number(inv.igstAmount || 0);
      interStateMap.set(pos, existing);
    }
  }

  const table32 = Array.from(interStateMap.entries()).map(([pos, val]) => ({
    pos,
    txval: Math.round(val.txval * 100) / 100,
    iamt: Math.round(val.iamt * 100) / 100,
  }));

  // 4. Table 4: Eligible ITC
  let itcIgst = 0;
  let itcCgst = 0;
  let itcSgst = 0;

  if (reconciled2bItc) {
    itcIgst = reconciled2bItc.igst;
    itcCgst = reconciled2bItc.cgst;
    itcSgst = reconciled2bItc.sgst;
  } else {
    for (const b of purchaseBills) {
      if ((b as any).itcEligible !== false) { // By default true for backward compatibility
        itcIgst += Number(b.igstAmount || 0);
        itcCgst += Number(b.cgstAmount || 0);
        itcSgst += Number(b.sgstAmount || 0);
      }
    }
  }

  // 5. Rule 88A Tax Offset Math
  // Step A: Pay IGST liability first with IGST credit
  let availableIgstCredit = itcIgst;
  let availableCgstCredit = itcCgst;
  let availableSgstCredit = itcSgst;

  let liabilityIgst = netIgst;
  let liabilityCgst = netCgst;
  let liabilitySgst = netSgst;

  // IGST credit used against IGST liability
  const igstUsedForIgst = Math.min(availableIgstCredit, liabilityIgst);
  liabilityIgst -= igstUsedForIgst;
  availableIgstCredit -= igstUsedForIgst;

  // Remaining IGST credit can be used against CGST or SGST
  const igstUsedForCgst = Math.min(availableIgstCredit, liabilityCgst);
  liabilityCgst -= igstUsedForCgst;
  availableIgstCredit -= igstUsedForCgst;

  const igstUsedForSgst = Math.min(availableIgstCredit, liabilitySgst);
  liabilitySgst -= igstUsedForSgst;
  availableIgstCredit -= igstUsedForSgst;

  // CGST credit used against remaining CGST liability, then remaining IGST liability
  const cgstUsedForCgst = Math.min(availableCgstCredit, liabilityCgst);
  liabilityCgst -= cgstUsedForCgst;
  availableCgstCredit -= cgstUsedForCgst;

  const cgstUsedForIgst = Math.min(availableCgstCredit, liabilityIgst);
  liabilityIgst -= cgstUsedForIgst;
  availableCgstCredit -= cgstUsedForIgst;

  // SGST credit used against remaining SGST liability, then remaining IGST liability
  const sgstUsedForSgst = Math.min(availableSgstCredit, liabilitySgst);
  liabilitySgst -= sgstUsedForSgst;
  availableSgstCredit -= sgstUsedForSgst;

  const sgstUsedForIgst = Math.min(availableSgstCredit, liabilityIgst);
  liabilityIgst -= sgstUsedForIgst;
  availableSgstCredit -= sgstUsedForIgst;

  // Remaining liabilities must be paid in CASH
  const cashIgst = Math.max(0, liabilityIgst);
  const cashCgst = Math.max(0, liabilityCgst);
  const cashSgst = Math.max(0, liabilitySgst);
  const totalCash = cashIgst + cashCgst + cashSgst;

  const year = parseInt(period.substring(2), 10);
  const finYear = `${year}-${String((year + 1) % 100).padStart(2, '0')}`;

  return {
    period,
    financialYear: finYear,
    tenantGstin: tenant.gstin || 'UNREGISTERED',
    tenantStateCode: tenant.stateCode || '32',

    table31: {
      taxableOutward: {
        txval: Math.round(netTaxable * 100) / 100,
        iamt: Math.round(netIgst * 100) / 100,
        camt: Math.round(netCgst * 100) / 100,
        samt: Math.round(netSgst * 100) / 100,
        csamt: 0.0,
      },
      zeroRated: { txval: 0, iamt: 0, csamt: 0 },
      nilExempt: { txval: 0 },
      reverseChargeInward: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
      nonGst: { txval: 0 },
    },

    table32,

    table4: {
      itcAvailable: {
        importGoods: { iamt: 0, csamt: 0 },
        importServices: { iamt: 0, csamt: 0 },
        reverseCharge: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
        isd: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
        allOtherItc: {
          iamt: Math.round(itcIgst * 100) / 100,
          camt: Math.round(itcCgst * 100) / 100,
          samt: Math.round(itcSgst * 100) / 100,
          csamt: 0.0,
        },
      },
      itcReversed: {
        asPerRule4243: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
        others: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
      },
      netItc: {
        iamt: Math.round(itcIgst * 100) / 100,
        camt: Math.round(itcCgst * 100) / 100,
        samt: Math.round(itcSgst * 100) / 100,
        csamt: 0.0,
      },
      ineligibleItc: {
        section175: {
          iamt: Math.round((reconciled2bItc?.ineligibleIgst || 0) * 100) / 100,
          camt: Math.round((reconciled2bItc?.ineligibleCgst || 0) * 100) / 100,
          samt: Math.round((reconciled2bItc?.ineligibleSgst || 0) * 100) / 100,
          csamt: 0.0,
        },
        others: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
      },
    },

    table5: {
      interState: 0,
      intraState: 0,
    },

    table61: {
      taxPayable: {
        iamt: Math.round(netIgst * 100) / 100,
        camt: Math.round(netCgst * 100) / 100,
        samt: Math.round(netSgst * 100) / 100,
      },
      paidThroughItc: {
        igstPaidWith: {
          igst: Math.round(igstUsedForIgst * 100) / 100,
          cgst: Math.round(cgstUsedForIgst * 100) / 100,
          sgst: Math.round(sgstUsedForIgst * 100) / 100,
        },
        cgstPaidWith: {
          igst: Math.round(igstUsedForCgst * 100) / 100,
          cgst: Math.round(cgstUsedForCgst * 100) / 100,
        },
        sgstPaidWith: {
          igst: Math.round(igstUsedForSgst * 100) / 100,
          sgst: Math.round(sgstUsedForSgst * 100) / 100,
        },
      },
      taxPaidInCash: {
        iamt: Math.round(cashIgst * 100) / 100,
        camt: Math.round(cashCgst * 100) / 100,
        samt: Math.round(cashSgst * 100) / 100,
        total: Math.round(totalCash * 100) / 100,
      },
    },
  };
}
