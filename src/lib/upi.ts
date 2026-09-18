import QRCode from "qrcode";

export class UpiService {
  /**
   * Generates standard NPCI URI string for PhonePe, GPay, Paytm
   */
  static generateUpiUri({
    upiId,
    payeeName,
    amount,
    invoiceNumber,
    note,
  }: {
    upiId: string;
    payeeName: string;
    amount: number;
    invoiceNumber: string;
    note?: string;
  }): string {
    const cleanUpi = encodeURIComponent(upiId);
    const cleanName = encodeURIComponent(payeeName);
    const cleanAmount = Number(amount).toFixed(2);
    const cleanNote = encodeURIComponent(note || `Bill ${invoiceNumber}`);

    return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${cleanAmount}&cu=INR&tn=${cleanNote}&tr=${invoiceNumber}`;
  }

  /**
   * Generates a Data URI (Base64 PNG) of the UPI QR code for rendering on screen or embedding in PDFs
   */
  static async generateQrDataUrl(upiUri: string): Promise<string> {
    try {
      return await QRCode.toDataURL(upiUri, {
        errorCorrectionLevel: "M",
        margin: 2,
        width: 250,
      });
    } catch (err) {
      console.error("Error generating UPI QR code DataUrl:", err);
      return "";
    }
  }
}
