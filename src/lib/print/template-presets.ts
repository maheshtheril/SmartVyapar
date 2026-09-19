/**
 * SmartVyapar World-Class Print Configuration Presets & Schema
 * Tailored for Indian GST compliance, Retail POS, Automobile Workshops, and Restaurants
 */

export type PrintDocType = 
  | 'sale_bill' 
  | 'pos_bill' 
  | 'auto_workshop' 
  | 'kot' 
  | 'credit_note' 
  | 'challan';

export type PaperSize = 'a4' | 'a5' | 'roll80' | 'roll58';

export interface TemplateBrand {
  primaryColor: string;
  accentColor: string;
  headerBg: string;
  headerText: string;
  fontFamily: 'sans' | 'serif' | 'mono';
  logoPosition: 'left' | 'center' | 'right' | 'hidden';
  logoSize: number;
}

export interface TemplateSections {
  showLogo: boolean;
  showBusinessName: boolean;
  showLegalName: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showGstin: boolean;
  showStateCode: boolean;
  showCustomerDetails: boolean;
  showVehicleDetails: boolean;
  showDueDate: boolean;
  showHsnColumn: boolean;
  showBatchColumn: boolean;
  showUnitColumn: boolean;
  showDiscountColumn: boolean;
  showTaxBreakup: boolean;
  showSavingsBadge: boolean;
  showBankDetails: boolean;
  showUpiQr: boolean;
  showTerms: boolean;
  showSignatures: boolean;
}

export interface TemplateAutomation {
  autoPrint: boolean;
  previewBeforePrint: boolean;
  whatsappOnSave: boolean;
  copies: number;
  actionAfterSave: 'success_screen' | 'print' | 'new_bill';
}

export interface PrintTemplatePreset {
  id: string;
  name: string;
  docType: PrintDocType;
  description: string;
  paperSize: PaperSize;
  brand: TemplateBrand;
  sections: TemplateSections;
  automation: TemplateAutomation;
  previewColors: { bg: string; header: string; accent: string; text: string };
}

export const DOC_TYPE_METADATA: Record<PrintDocType, { label: string; description: string; emoji: string; color: string }> = {
  sale_bill: {
    label: "Sale Tax Invoice",
    description: "Detailed B2B & B2C GST Tax Invoice (A4 & A5 full sheet)",
    emoji: "🧾",
    color: "indigo"
  },
  pos_bill: {
    label: "POS Thermal Receipt",
    description: "High-speed retail roll receipt for POS counters (80mm & 58mm)",
    emoji: "🖨️",
    color: "emerald"
  },
  auto_workshop: {
    label: "Automobile Job-Card & Bill",
    description: "Vehicle registration, odometer, mechanic notes, parts + labor SAC billing",
    emoji: "🚗",
    color: "amber"
  },
  kot: {
    label: "Restaurant KOT Ticket",
    description: "Kitchen order ticket with table number, captain, and item special notes",
    emoji: "🍽️",
    color: "rose"
  },
  credit_note: {
    label: "GST Credit Note / Return",
    description: "Statutory sales return voucher reversing GST liability",
    emoji: "↩️",
    color: "teal"
  },
  challan: {
    label: "Delivery Challan",
    description: "Goods transit document with transporter and vehicle information",
    emoji: "🚚",
    color: "sky"
  }
};

export const COLOR_PALETTES = [
  { id: "corporate_navy", name: "Corporate Navy", primary: "#1e3a8a", accent: "#3b82f6", headerBg: "#1e3a8a", headerText: "#ffffff" },
  { id: "modern_indigo", name: "Modern Indigo", primary: "#4f46e5", accent: "#818cf8", headerBg: "#4f46e5", headerText: "#ffffff" },
  { id: "emerald_retail", name: "Emerald Retail", primary: "#059669", accent: "#34d399", headerBg: "#059669", headerText: "#ffffff" },
  { id: "workshop_amber", name: "Workshop Amber", primary: "#b45309", accent: "#f59e0b", headerBg: "#b45309", headerText: "#ffffff" },
  { id: "slate_pro", name: "Slate Professional", primary: "#1e293b", accent: "#64748b", headerBg: "#1e293b", headerText: "#ffffff" },
  { id: "ruby_elegance", name: "Ruby Luxury", primary: "#9f1239", accent: "#f43f5e", headerBg: "#9f1239", headerText: "#ffffff" },
  { id: "clean_monochrome", name: "Clean Monochrome", primary: "#0f172a", accent: "#475569", headerBg: "#ffffff", headerText: "#0f172a" },
];

export const BUILT_IN_PRESETS: PrintTemplatePreset[] = [
  {
    id: "classic_gst_a4",
    name: "Standard GST Tax Invoice (A4)",
    docType: "sale_bill",
    description: "Statutory Indian GST tax invoice with full CGST/SGST breakdown, HSN codes, and bank details.",
    paperSize: "a4",
    brand: {
      primaryColor: "#1e3a8a",
      accentColor: "#3b82f6",
      headerBg: "#1e3a8a",
      headerText: "#ffffff",
      fontFamily: "sans",
      logoPosition: "left",
      logoSize: 70
    },
    sections: {
      showLogo: true,
      showBusinessName: true,
      showLegalName: true,
      showAddress: true,
      showPhone: true,
      showEmail: true,
      showGstin: true,
      showStateCode: true,
      showCustomerDetails: true,
      showVehicleDetails: false,
      showDueDate: true,
      showHsnColumn: true,
      showBatchColumn: false,
      showUnitColumn: true,
      showDiscountColumn: true,
      showTaxBreakup: true,
      showSavingsBadge: true,
      showBankDetails: true,
      showUpiQr: true,
      showTerms: true,
      showSignatures: true
    },
    automation: {
      autoPrint: false,
      previewBeforePrint: true,
      whatsappOnSave: false,
      copies: 1,
      actionAfterSave: "success_screen"
    },
    previewColors: { bg: "#ffffff", header: "#1e3a8a", accent: "#3b82f6", text: "#1e293b" }
  },
  {
    id: "compact_gst_a5",
    name: "Compact Counter Bill (A5)",
    docType: "sale_bill",
    description: "Half-sheet A5 invoice formatted for retail counters and high paper cost savings.",
    paperSize: "a5",
    brand: {
      primaryColor: "#4f46e5",
      accentColor: "#818cf8",
      headerBg: "#4f46e5",
      headerText: "#ffffff",
      fontFamily: "sans",
      logoPosition: "left",
      logoSize: 55
    },
    sections: {
      showLogo: true,
      showBusinessName: true,
      showLegalName: false,
      showAddress: true,
      showPhone: true,
      showEmail: false,
      showGstin: true,
      showStateCode: true,
      showCustomerDetails: true,
      showVehicleDetails: false,
      showDueDate: false,
      showHsnColumn: true,
      showBatchColumn: false,
      showUnitColumn: false,
      showDiscountColumn: true,
      showTaxBreakup: true,
      showSavingsBadge: true,
      showBankDetails: false,
      showUpiQr: true,
      showTerms: false,
      showSignatures: true
    },
    automation: {
      autoPrint: false,
      previewBeforePrint: true,
      whatsappOnSave: true,
      copies: 1,
      actionAfterSave: "success_screen"
    },
    previewColors: { bg: "#ffffff", header: "#4f46e5", accent: "#818cf8", text: "#1e293b" }
  },
  {
    id: "thermal_roll_80mm",
    name: "80mm POS Thermal Roll Receipt",
    docType: "pos_bill",
    description: "Industry-standard 80mm thermal receipt with dynamic UPI QR code, barcode, and savings banner.",
    paperSize: "roll80",
    brand: {
      primaryColor: "#000000",
      accentColor: "#333333",
      headerBg: "#ffffff",
      headerText: "#000000",
      fontFamily: "mono",
      logoPosition: "center",
      logoSize: 65
    },
    sections: {
      showLogo: true,
      showBusinessName: true,
      showLegalName: false,
      showAddress: true,
      showPhone: true,
      showEmail: false,
      showGstin: true,
      showStateCode: false,
      showCustomerDetails: true,
      showVehicleDetails: false,
      showDueDate: false,
      showHsnColumn: false,
      showBatchColumn: false,
      showUnitColumn: false,
      showDiscountColumn: false,
      showTaxBreakup: true,
      showSavingsBadge: true,
      showBankDetails: false,
      showUpiQr: true,
      showTerms: true,
      showSignatures: false
    },
    automation: {
      autoPrint: true,
      previewBeforePrint: false,
      whatsappOnSave: false,
      copies: 1,
      actionAfterSave: "new_bill"
    },
    previewColors: { bg: "#ffffff", header: "#ffffff", accent: "#000000", text: "#000000" }
  },
  {
    id: "thermal_roll_58mm",
    name: "58mm Compact Thermal Roll",
    docType: "pos_bill",
    description: "Ultra-compact 2-inch receipt for mobile Bluetooth printers and compact billing terminals.",
    paperSize: "roll58",
    brand: {
      primaryColor: "#000000",
      accentColor: "#333333",
      headerBg: "#ffffff",
      headerText: "#000000",
      fontFamily: "mono",
      logoPosition: "center",
      logoSize: 50
    },
    sections: {
      showLogo: true,
      showBusinessName: true,
      showLegalName: false,
      showAddress: true,
      showPhone: true,
      showEmail: false,
      showGstin: true,
      showStateCode: false,
      showCustomerDetails: true,
      showVehicleDetails: false,
      showDueDate: false,
      showHsnColumn: false,
      showBatchColumn: false,
      showUnitColumn: false,
      showDiscountColumn: false,
      showTaxBreakup: false,
      showSavingsBadge: true,
      showBankDetails: false,
      showUpiQr: true,
      showTerms: true,
      showSignatures: false
    },
    automation: {
      autoPrint: true,
      previewBeforePrint: false,
      whatsappOnSave: false,
      copies: 1,
      actionAfterSave: "new_bill"
    },
    previewColors: { bg: "#ffffff", header: "#ffffff", accent: "#000000", text: "#000000" }
  },
  {
    id: "auto_workshop_master",
    name: "Automobile Workshop Pro (Parts + Labor)",
    docType: "auto_workshop",
    description: "Full automotive workshop job-card with vehicle plate number, mileage, spare parts HSN, and labor SAC.",
    paperSize: "a4",
    brand: {
      primaryColor: "#b45309",
      accentColor: "#f59e0b",
      headerBg: "#b45309",
      headerText: "#ffffff",
      fontFamily: "sans",
      logoPosition: "left",
      logoSize: 75
    },
    sections: {
      showLogo: true,
      showBusinessName: true,
      showLegalName: true,
      showAddress: true,
      showPhone: true,
      showEmail: true,
      showGstin: true,
      showStateCode: true,
      showCustomerDetails: true,
      showVehicleDetails: true,
      showDueDate: true,
      showHsnColumn: true,
      showBatchColumn: true,
      showUnitColumn: true,
      showDiscountColumn: true,
      showTaxBreakup: true,
      showSavingsBadge: false,
      showBankDetails: true,
      showUpiQr: true,
      showTerms: true,
      showSignatures: true
    },
    automation: {
      autoPrint: false,
      previewBeforePrint: true,
      whatsappOnSave: true,
      copies: 2,
      actionAfterSave: "success_screen"
    },
    previewColors: { bg: "#ffffff", header: "#b45309", accent: "#f59e0b", text: "#1e293b" }
  },
  {
    id: "kot_kitchen_ticket",
    name: "Kitchen Order Ticket (KOT)",
    docType: "kot",
    description: "Clear thermal ticket for kitchen chefs showing table number, captain name, timestamp, and order items.",
    paperSize: "roll80",
    brand: {
      primaryColor: "#000000",
      accentColor: "#333333",
      headerBg: "#ffffff",
      headerText: "#000000",
      fontFamily: "mono",
      logoPosition: "hidden",
      logoSize: 40
    },
    sections: {
      showLogo: false,
      showBusinessName: true,
      showLegalName: false,
      showAddress: false,
      showPhone: false,
      showEmail: false,
      showGstin: false,
      showStateCode: false,
      showCustomerDetails: false,
      showVehicleDetails: false,
      showDueDate: false,
      showHsnColumn: false,
      showBatchColumn: false,
      showUnitColumn: false,
      showDiscountColumn: false,
      showTaxBreakup: false,
      showSavingsBadge: false,
      showBankDetails: false,
      showUpiQr: false,
      showTerms: false,
      showSignatures: false
    },
    automation: {
      autoPrint: true,
      previewBeforePrint: false,
      whatsappOnSave: false,
      copies: 1,
      actionAfterSave: "new_bill"
    },
    previewColors: { bg: "#ffffff", header: "#ffffff", accent: "#000000", text: "#000000" }
  }
];
