export interface TaxBreakdownResult {
  taxableAmount: number;
  gstRate: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
  taxType: "INTRA-STATE (CGST + SGST)" | "INTER-STATE (IGST)" | "EXEMPT / NON-GST";
}

export class GstCalculator {
  /**
   * Calculates CGST/SGST or IGST based on buyer and seller state codes
   */
  static calculate(
    taxableAmount: number,
    gstRate: number,
    businessStateCode: string,
    customerStateCode?: string,
    isComposition = false
  ): TaxBreakdownResult {
    if (isComposition || gstRate === 0) {
      return {
        taxableAmount,
        gstRate: 0,
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: 0,
        igstAmount: 0,
        totalTax: 0,
        totalAmount: taxableAmount,
        taxType: "EXEMPT / NON-GST",
      };
    }

    const isIntraState = !customerStateCode || customerStateCode === businessStateCode;
    const totalTax = Number(((taxableAmount * gstRate) / 100).toFixed(2));

    if (isIntraState) {
      const halfRate = gstRate / 2;
      const halfTax = Number((totalTax / 2).toFixed(2));
      return {
        taxableAmount,
        gstRate,
        cgstRate: halfRate,
        cgstAmount: halfTax,
        sgstRate: halfRate,
        sgstAmount: halfTax,
        igstRate: 0,
        igstAmount: 0,
        totalTax,
        totalAmount: Number((taxableAmount + totalTax).toFixed(2)),
        taxType: "INTRA-STATE (CGST + SGST)",
      };
    } else {
      return {
        taxableAmount,
        gstRate,
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: gstRate,
        igstAmount: totalTax,
        totalTax,
        totalAmount: Number((taxableAmount + totalTax).toFixed(2)),
        taxType: "INTER-STATE (IGST)",
      };
    }
  }

  /**
   * CA-Ready GSTR-3B Net Tax Payable
   * Output Tax (Collected from sales) - Input Tax Credit (Paid on purchases)
   */
  static calculateNetPayable(
    outputTax: { cgst: number; sgst: number; igst: number },
    inputCredit: { cgst: number; sgst: number; igst: number }
  ) {
    const totalOutput = outputTax.cgst + outputTax.sgst + outputTax.igst;
    const totalInput = inputCredit.cgst + inputCredit.sgst + inputCredit.igst;
    const net = Math.max(0, totalOutput - totalInput);

    return {
      outputTax: Number(totalOutput.toFixed(2)),
      inputTaxCredit: Number(totalInput.toFixed(2)),
      netPayable: Number(net.toFixed(2)),
      status: net > 0 ? "TAX_PAYABLE" : "CREDIT_CARRY_FORWARD",
    };
  }
}
