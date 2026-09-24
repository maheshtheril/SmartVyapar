import { Invoice, InvoiceItem, Tenant, Customer } from "@prisma/client";

export function formatNicDate(date: Date = new Date()): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export interface EWayBillInput {
  transDistance: number;
  transMode: string;
  transporterId?: string | null;
  transporterName?: string | null;
  transDocNo?: string | null;
  transDocDate?: string | null;
  vehicleNo?: string | null;
  vehicleType: string;
}

/**
 * Builds the official NIC E-Way Bill Bulk JSON payload (Schema Version 1.0.0621).
 * Can be directly uploaded to ewaybillgst.gov.in under 'Generate Bulk'.
 */
export function generateNicEwayBillPayload(
  invoice: Invoice & { items: InvoiceItem[]; customer?: Customer | null },
  tenant: Tenant,
  transport: EWayBillInput
) {
  const userGstin = (tenant.gstin || "URP").toUpperCase();
  const fromStateCode = parseInt(tenant.stateCode || "32", 10);
  const toStateCode = parseInt(invoice.customerStateCode || "32", 10);

  const fromPincode = parseInt(tenant.pincode || "682001", 10) || 682001;
  const toPincode = parseInt(invoice.customer?.pincode || "682001", 10) || 682001;

  const itemList = invoice.items.map((item, index) => {
    if (!item.hsnCode) {
      throw new Error(`HSN code is strictly required for E-Way Bill item: ${item.productName}`);
    }
    const rawHsn = item.hsnCode.replace(/\D/g, "");
    if (rawHsn.length < 4) {
      throw new Error(`HSN code must be at least 4 digits for E-Way Bill item: ${item.productName}`);
    }
    const hsnCode = parseInt(rawHsn, 10);
    const taxableAmount = Number(
      (Number(item.unitPrice) * Number(item.quantity)).toFixed(2)
    );

    const gstRate = Number(item.gstRate);
    const isInter = invoice.isInterState;

    return {
      itemNo: index + 1,
      productName: item.productName || "Product",
      productDesc: item.productName || "Product",
      hsnCode: hsnCode,
      quantity: Number(item.quantity),
      qtyUnit: item.unitSold || "PCS",
      cgstRate: isInter ? 0 : Number((gstRate / 2).toFixed(2)),
      sgstRate: isInter ? 0 : Number((gstRate / 2).toFixed(2)),
      igstRate: isInter ? gstRate : 0,
      cessRate: 0,
      taxableAmount,
    };
  });

  const billEntry = {
    userGstin,
    supplyType: "O", // Outward
    subSupplyType: "1", // Supply
    docType: "INV", // Tax Invoice
    docNo: invoice.invoiceNumber,
    docDate: formatNicDate(invoice.invoiceDate),
    
    // Consignor (Supplier) Details
    fromGstin: userGstin,
    fromTrdName: tenant.businessName,
    fromAddr1: tenant.address || "Shop Address",
    fromAddr2: "",
    fromPlace: tenant.stateName || "City",
    fromPincode,
    actFromStateCode: fromStateCode,
    fromStateCode,

    // Consignee (Buyer) Details
    toGstin: (invoice.customerGstin || "URP").toUpperCase(),
    toTrdName: invoice.customerName,
    toAddr1: invoice.customer?.address || "Delivery Address",
    toAddr2: "",
    toPlace: "Destination",
    toPincode,
    actToStateCode: toStateCode,
    toStateCode,

    // Invoice Totals
    totalValue: Number(Number(invoice.subtotal).toFixed(2)),
    cgstValue: Number(Number(invoice.cgstAmount).toFixed(2)),
    sgstValue: Number(Number(invoice.sgstAmount).toFixed(2)),
    igstValue: Number(Number(invoice.igstAmount).toFixed(2)),
    cessValue: 0.0,
    totInvValue: Number(Number(invoice.totalAmount).toFixed(2)),
    totalInvoiceValue: Number(Number(invoice.totalAmount).toFixed(2)),

    // Part-B Transport Details
    transDistance: String(transport.transDistance),
    transporterId: transport.transporterId ? transport.transporterId.toUpperCase() : "",
    transporterName: transport.transporterName || "",
    transDocNo: transport.transDocNo || "",
    transDocDate: transport.transDocDate ? formatNicDate(new Date(transport.transDocDate)) : "",
    vehicleNo: transport.vehicleNo
      ? transport.vehicleNo.replace(/[\s\-_]/g, "").toUpperCase()
      : "",
    vehicleType: transport.vehicleType || "R",
    transMode: transport.transMode || "1",

    itemList,
  };

  return {
    version: "1.0.0621",
    billLists: [billEntry],
  };
}
