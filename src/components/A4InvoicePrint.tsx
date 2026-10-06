import React from 'react';
import { Phone } from 'lucide-react';
import { ThermalReceiptData, BusinessProfile, ThermalReceiptItem } from './ThermalReceiptModal';

interface A4InvoicePrintProps {
  data: ThermalReceiptData;
  business: BusinessProfile;
}

export default function A4InvoicePrint({ data, business }: A4InvoicePrintProps) {
  const isIgst = data.customerState && business.stateCode && data.customerState !== business.stateCode;

  // Helper to calculate taxes per item (assuming total is inclusive)
  const calculateItemTaxes = (item: ThermalReceiptItem) => {
    const isComposition = business.isComposition;
    const rate = isComposition ? 0 : (item.gstRate || 0);
    const taxAmount = (item.total * rate) / (100 + rate);
    const taxable = item.total - taxAmount;
    
    return {
      taxable,
      cgst: isComposition ? 0 : (isIgst ? 0 : taxAmount / 2),
      sgst: isComposition ? 0 : (isIgst ? 0 : taxAmount / 2),
      igst: isComposition ? 0 : (isIgst ? taxAmount : 0),
    };
  };

  return (
    <div className="bg-white w-full max-w-[210mm] mx-auto text-black font-sans min-h-[297mm] flex flex-col border-2 border-black p-1 text-[13px] leading-tight print:border-none print:p-[10mm]">
      <div className="border border-black flex flex-col flex-1">
        
        {/* Top Header */}
        <div className="relative border-b border-black p-4 text-center flex flex-col items-center min-h-[120px] justify-center bg-slate-50">
          <div className="absolute top-4 left-4 flex flex-col items-center justify-center w-24 h-24 bg-white border border-slate-200 rounded-sm shadow-sm z-10">
            {business.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
            ) : (
              <span className="text-gray-300 text-sm font-bold">LOGO</span>
            )}
          </div>
          
          <div className="flex flex-col items-center justify-center px-28 w-full">
            <div className="font-bold text-[11px] uppercase tracking-widest mb-1 text-slate-600 bg-slate-200/80 border border-slate-300 px-3 py-0.5 rounded-sm">{data.docTitle || 'TAX INVOICE'}</div>
            <h1 className="text-2xl font-black uppercase tracking-[0.05em] text-blue-800 mb-1.5 leading-tight">{business.name}</h1>
            <p className="font-bold text-[13px] text-slate-700 tracking-wide leading-snug">{business.address}</p>
            <p className="font-bold text-[12px] text-slate-700 mt-0.5 flex items-center justify-center">
              <Phone className="w-3.5 h-3.5 text-slate-400 mr-1" strokeWidth={2.5} /> {business.phone}
            </p>
          </div>
          
          <div className="absolute bottom-4 right-4 text-right text-[13px]">
            {business.gstin && <div className="font-bold">GSTIN: {business.gstin}</div>}
            {business.stateCode && <div className="font-bold">State code: {business.stateCode}</div>}
          </div>
        </div>

        {/* Info Row */}
        <div className="flex border-b border-black">
          {/* Billed To */}
          <div className="w-1/2 border-r border-black p-3">
            <div className="font-semibold mb-1 text-sm">Billed To :</div>
            <div className="font-bold text-[14px]">{data.customerName || 'Cash Customer'}</div>
            {data.customerState && <div className="mt-1 text-[13px]">State: {data.customerState}</div>}
            {data.customerPhone && <div className="mt-1 text-[13px]">Phone: {data.customerPhone}</div>}
          </div>
          
          {/* Invoice Details Table */}
          <div className="w-1/2 flex flex-col text-[13px]">
            <div className="flex border-b border-black">
              <div className="w-1/2 border-r border-black p-1.5 font-semibold bg-slate-50 text-slate-800">Invoice No</div>
              <div className="w-1/2 p-1.5 font-bold">{data.invoiceNumber}</div>
            </div>
            <div className="flex border-b border-black">
              <div className="w-1/2 border-r border-black p-1.5 font-semibold bg-slate-50 text-slate-800">Date</div>
              <div className="w-1/2 p-1.5 font-semibold">{new Date(data.invoiceDate).toLocaleDateString('en-IN')}</div>
            </div>
            <div className="flex border-b border-black">
              <div className="w-1/2 border-r border-black p-1.5 font-semibold bg-slate-50 text-slate-800">Terms of Payments</div>
              <div className="w-1/2 p-1.5 font-semibold">{data.paymentMode}</div>
            </div>
            <div className="flex border-b border-black">
              <div className="w-1/2 border-r border-black p-1.5 font-semibold bg-slate-50 text-slate-800">Sales Person</div>
              <div className="w-1/2 p-1.5 font-semibold">{data.cashierName || '-'}</div>
            </div>
            <div className="flex flex-1">
              <div className="w-1/2 border-r border-black p-1.5 font-semibold bg-slate-50 text-slate-800">Destination</div>
              <div className="w-1/2 p-1.5 font-semibold">-</div>
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="flex-1 flex flex-col">
          {/* Table Header */}
          <div className="flex border-b border-black font-bold text-center bg-slate-100/80 items-stretch text-[13px] text-slate-800">
            <div className="w-10 border-r border-black p-2 flex items-center justify-center">SNo</div>
            <div className="flex-1 border-r border-black p-2 flex items-center justify-center">Commodity / Item</div>
            <div className="w-20 border-r border-black p-2 flex items-center justify-center">HSN/SAC</div>
            {!business.isComposition && <div className="w-16 border-r border-black p-2 flex items-center justify-center">Tax(%)</div>}
            <div className="w-20 border-r border-black p-2 flex items-center justify-center">Rate</div>
            <div className="w-16 border-r border-black p-2 flex items-center justify-center">Qty</div>
            {!business.isComposition && (
              <>
                <div className="w-24 border-r border-black p-2 flex items-center justify-center">Gross</div>
                <div className="w-20 border-r border-black p-2 flex items-center justify-center">{isIgst ? 'IGST' : 'CGST'}</div>
                <div className="w-20 border-r border-black p-2 flex items-center justify-center">{isIgst ? '-' : 'SGST'}</div>
              </>
            )}
            <div className="w-28 p-2 flex items-center justify-center">Total</div>
          </div>

          {/* Table Body */}
          <div className="flex-1 flex flex-col text-[13px]">
            {data.items.map((item, idx) => {
              const taxes = calculateItemTaxes(item);
              return (
                <div key={idx} className="flex border-b border-black min-h-[28px] items-stretch">
                  <div className="w-10 border-r border-black p-1.5 text-center">{idx + 1}</div>
                  <div className="flex-1 border-r border-black p-1.5 font-semibold">{item.name}</div>
                  <div className="w-20 border-r border-black p-1.5 text-center text-[12px]">{item.hsn || '-'}</div>
                  {!business.isComposition && <div className="w-16 border-r border-black p-1.5 text-center">{item.gstRate || 0}</div>}
                  <div className="w-20 border-r border-black p-1.5 text-right">{item.price.toFixed(2)}</div>
                  <div className="w-16 border-r border-black p-1.5 text-center">{item.quantity}</div>
                  {!business.isComposition && (
                    <>
                      <div className="w-24 border-r border-black p-1.5 text-right">{taxes.taxable.toFixed(2)}</div>
                      <div className="w-20 border-r border-black p-1.5 text-right">{isIgst ? taxes.igst.toFixed(2) : taxes.cgst.toFixed(2)}</div>
                      <div className="w-20 border-r border-black p-1.5 text-right">{isIgst ? '-' : taxes.sgst.toFixed(2)}</div>
                    </>
                  )}
                  <div className="w-28 p-1.5 text-right font-bold">{item.total.toFixed(2)}</div>
                </div>
              );
            })}
            {/* Empty space filler with vertical lines */}
            <div className="flex-1 flex min-h-[120px]">
              <div className="w-10 border-r border-black"></div>
              <div className="flex-1 border-r border-black"></div>
              <div className="w-20 border-r border-black"></div>
              {!business.isComposition && <div className="w-16 border-r border-black"></div>}
              <div className="w-20 border-r border-black"></div>
              <div className="w-16 border-r border-black"></div>
              {!business.isComposition && (
                <>
                  <div className="w-24 border-r border-black"></div>
                  <div className="w-20 border-r border-black"></div>
                  <div className="w-20 border-r border-black"></div>
                </>
              )}
              <div className="w-28"></div>
            </div>
          </div>
          
          {/* Table Footer / Subtotals */}
          <div className="flex border-t border-b border-black font-bold text-[13px]">
            <div className="flex-1 border-r border-black p-2 text-right pr-4">Total</div>
            <div className="w-16 border-r border-black p-2 text-center">{data.items.reduce((acc, i) => acc + i.quantity, 0)}</div>
            {!business.isComposition && (
              <>
                <div className="w-24 border-r border-black p-2 text-right">{(data.taxableAmount || data.subTotal).toFixed(2)}</div>
                <div className="w-20 border-r border-black p-2 text-right">{isIgst ? (data.igstAmount || 0).toFixed(2) : (data.cgstAmount || 0).toFixed(2)}</div>
                <div className="w-20 border-r border-black p-2 text-right">{isIgst ? '-' : (data.sgstAmount || 0).toFixed(2)}</div>
              </>
            )}
            <div className="w-28 p-2 text-right">{data.totalAmount.toFixed(2)}</div>
          </div>
        </div>

        {/* Summary Footer */}
        <div className="flex h-36">
          {/* Amount in words */}
          <div className="w-3/5 border-r border-black p-3 flex flex-col justify-between text-[13px]">
            <div>
              <div className="underline font-semibold italic mb-1">Amount in Words</div>
              <div className="font-bold text-[14px]">Rupees {numberToWords(Math.round(data.totalAmount))} Only</div>
            </div>
            {data.notes && (
              <div className="mt-2 text-[12px]">
                <div className="font-semibold underline mb-1">Terms & Conditions / Notes:</div>
                <div>{data.notes}</div>
              </div>
            )}
          </div>
          
          {/* Tax Totals */}
          <div className="w-2/5 flex flex-col text-[13px] font-semibold">
            {!business.isComposition && (
              <>
                <div className="flex border-b border-black flex-1 items-center">
                  <div className="w-1/2 p-1.5 pl-3">CGST</div>
                  <div className="w-1/2 p-1.5 text-right pr-3">{(data.cgstAmount || 0).toFixed(2)}</div>
                </div>
                <div className="flex border-b border-black flex-1 items-center">
                  <div className="w-1/2 p-1.5 pl-3">SGST</div>
                  <div className="w-1/2 p-1.5 text-right pr-3">{(data.sgstAmount || 0).toFixed(2)}</div>
                </div>
                {isIgst && (
                  <div className="flex border-b border-black flex-1 items-center">
                    <div className="w-1/2 p-1.5 pl-3">IGST</div>
                    <div className="w-1/2 p-1.5 text-right pr-3">{(data.igstAmount || 0).toFixed(2)}</div>
                  </div>
                )}
                <div className="flex border-b border-black flex-1 items-center">
                  <div className="w-1/2 p-1.5 pl-3">TOTAL TAX</div>
                  <div className="w-1/2 p-1.5 text-right pr-3">{((data.cgstAmount || 0) + (data.sgstAmount || 0) + (data.igstAmount || 0)).toFixed(2)}</div>
                </div>
              </>
            )}
            <div className="flex border-b border-black flex-1 items-center">
              <div className="w-1/2 p-1.5 pl-3">Discount</div>
              <div className="w-1/2 p-1.5 text-right pr-3">{(data.discountAmount || 0).toFixed(2)}</div>
            </div>
            <div className="flex flex-1 items-center bg-slate-100 font-bold text-[15px]">
              <div className="w-1/2 p-1.5 pl-3">Net Total</div>
              <div className="w-1/2 p-1.5 text-right pr-3">{data.totalAmount.toFixed(2)}</div>
            </div>
          </div>
        </div>
        
        {/* Total Balance block at the bottom */}
        <div className="flex border-t border-black bg-slate-50 font-bold p-2 text-[15px]">
          <div className="w-3/5 pl-2">Total Balance</div>
          <div className="w-2/5 text-right pr-2">{data.totalAmount.toFixed(2)}</div>
        </div>

        {/* Declaration and Signatory */}
        <div className="flex h-24 border-t border-black">
          <div className="w-1/2 border-r border-black p-3 text-[12px]">
            <div className="font-bold underline mb-1">DECLARATION</div>
            <div>Certified that all the particulars given above are true and correct.</div>
          </div>
          <div className="w-1/2 p-3 flex flex-col justify-between items-end text-center text-[12px]">
            <div className="font-bold text-[13px]">For {business.name}</div>
            <div className="font-bold mt-8">Authorised Signatory</div>
          </div>
        </div>
        
      </div>

      {/* App Footer Brand */}
      <div className="text-center text-[9px] text-slate-400 font-medium py-1 print:text-black mt-1">
        Software powered by <span className="font-bold text-slate-500 print:text-black">ZionaPOS.store</span>
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


