import React from 'react';
import { ThermalReceiptData } from './ThermalReceiptModal';
import { BusinessProfile } from './ThermalReceiptModal';

interface A4InvoicePrintProps {
  data: ThermalReceiptData;
  business: BusinessProfile;
}

export default function A4InvoicePrint({ data, business }: A4InvoicePrintProps) {
  const isIgst = data.customerState && business.stateCode && data.customerState !== business.stateCode;

  return (
    <div className="bg-white w-full max-w-[210mm] mx-auto p-8 text-slate-900 font-sans shadow-sm ring-1 ring-slate-200 min-h-[297mm]">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight">{business.name}</h1>
          <p className="text-sm mt-1">{business.address}</p>
          <p className="text-sm">Phone: {business.phone}</p>
          {business.gstin && <p className="text-sm font-bold mt-1">GSTIN: {business.gstin}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold uppercase text-slate-500 mb-2">{data.docTitle || 'TAX INVOICE'}</h2>
          <p className="text-sm font-semibold">Invoice No: <span className="font-mono">{data.invoiceNumber}</span></p>
          <p className="text-sm font-semibold">Date: {new Date(data.invoiceDate).toLocaleDateString('en-IN')}</p>
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Billed To</h3>
        <p className="font-bold text-base">{data.customerName}</p>
        {data.customerPhone && <p className="text-sm">Ph: {data.customerPhone}</p>}
        {data.customerState && <p className="text-sm">State: {data.customerState}</p>}
      </div>

      {/* Items Table */}
      <table className="w-full text-sm mb-6 border-collapse">
        <thead>
          <tr className="bg-slate-100 border-y border-slate-300">
            <th className="py-2 px-2 text-left font-bold">#</th>
            <th className="py-2 px-2 text-left font-bold">Item Description</th>
            <th className="py-2 px-2 text-center font-bold">HSN/SAC</th>
            <th className="py-2 px-2 text-right font-bold">Qty</th>
            <th className="py-2 px-2 text-right font-bold">Rate</th>
            <th className="py-2 px-2 text-right font-bold">GST %</th>
            <th className="py-2 px-2 text-right font-bold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, idx) => (
            <tr key={idx} className="border-b border-slate-200">
              <td className="py-2 px-2 text-left">{idx + 1}</td>
              <td className="py-2 px-2 text-left font-medium">{item.name}</td>
              <td className="py-2 px-2 text-center text-xs">{item.hsn || '-'}</td>
              <td className="py-2 px-2 text-right">{item.quantity} {item.unit || 'PCS'}</td>
              <td className="py-2 px-2 text-right">₹{item.price.toFixed(2)}</td>
              <td className="py-2 px-2 text-right">{item.gstRate || 0}%</td>
              <td className="py-2 px-2 text-right font-bold">₹{item.total.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-1/2">
          <div className="flex justify-between py-1">
            <span className="font-semibold text-slate-600">Subtotal:</span>
            <span>₹{(data.taxableAmount || data.subTotal).toFixed(2)}</span>
          </div>
          
          {(data.cgstAmount || 0) > 0 && (
            <div className="flex justify-between py-1">
              <span className="font-semibold text-slate-600">CGST:</span>
              <span>₹{(data.cgstAmount || 0).toFixed(2)}</span>
            </div>
          )}
          {(data.sgstAmount || 0) > 0 && (
            <div className="flex justify-between py-1">
              <span className="font-semibold text-slate-600">SGST:</span>
              <span>₹{(data.sgstAmount || 0).toFixed(2)}</span>
            </div>
          )}
          {(data.igstAmount || 0) > 0 && (
            <div className="flex justify-between py-1">
              <span className="font-semibold text-slate-600">IGST:</span>
              <span>₹{(data.igstAmount || 0).toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex justify-between py-2 border-t-2 border-slate-900 mt-2">
            <span className="font-black text-lg">Grand Total:</span>
            <span className="font-black text-lg">₹{data.totalAmount.toFixed(2)}</span>
          </div>
          
          <div className="text-right mt-1 text-xs text-slate-500 font-semibold">
            Amount in words: Rupees {numberToWords(Math.round(data.totalAmount))} Only
          </div>
        </div>
      </div>

      {/* Footer / Notes */}
      {data.notes && (
        <div className="mb-6">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Notes / Terms</h3>
          <p className="text-sm whitespace-pre-wrap">{data.notes}</p>
        </div>
      )}

      <div className="mt-16 flex justify-between items-end">
        <div className="text-xs text-slate-500">
          This is a computer generated invoice.
        </div>
        <div className="text-center">
          <div className="border-t border-slate-900 w-48 mb-2"></div>
          <span className="text-sm font-bold">Authorized Signatory</span>
        </div>
      </div>
    </div>
  );
}

function numberToWords(num: number) {
  const a = ['','One ','Two ','Three ','Four ', 'Five ','Six ','Seven ','Eight ','Nine ','Ten ','Eleven ','Twelve ','Thirteen ','Fourteen ','Fifteen ','Sixteen ','Seventeen ','Eighteen ','Nineteen '];
  const b = ['', '', 'Twenty','Thirty','Forty','Fifty', 'Sixty','Seventy','Eighty','Ninety'];
  let numStr = num.toString();
  if (numStr.length > 9) return 'overflow';
  let n = ('000000000' + numStr).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return '';
  let str = '';
  str += (n[1] !== '00') ? (a[Number(n[1])] || b[Number(n[1][0])] + ' ' + a[Number(n[1][1])]) + 'Crore ' : '';
  str += (n[2] !== '00') ? (a[Number(n[2])] || b[Number(n[2][0])] + ' ' + a[Number(n[2][1])]) + 'Lakh ' : '';
  str += (n[3] !== '00') ? (a[Number(n[3])] || b[Number(n[3][0])] + ' ' + a[Number(n[3][1])]) + 'Thousand ' : '';
  str += (n[4] !== '0') ? (a[Number(n[4])] || b[Number(n[4][0])] + ' ' + a[Number(n[4][1])]) + 'Hundred ' : '';
  str += (n[5] !== '00') ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[Number(n[5][0])] + ' ' + a[Number(n[5][1])]) : '';
  return str.trim();
}
