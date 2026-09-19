'use client';

import React, { useState, useRef } from 'react';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download, 
  X, 
  Loader2, 
  FileCheck,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { parseCsv, generateCsv } from '@/lib/csv';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [validRows, setValidRows] = useState<any[]>([]);
  const [invalidRows, setInvalidRows] = useState<{ row: number; item: string; reason: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [resultSummary, setResultSummary] = useState<{ created: number; updated: number; errors: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsProcessing(true);
    setResultSummary(null);

    try {
      const text = await selectedFile.text();
      const rawRecords = parseCsv(text);

      const valids: any[] = [];
      const invalids: { row: number; item: string; reason: string }[] = [];

      rawRecords.forEach((row, idx) => {
        const rowNum = idx + 2; // header is row 1
        // Flexible key matching (case-insensitive & handles various column naming)
        const getField = (keys: string[]) => {
          for (const k of keys) {
            for (const actualKey of Object.keys(row)) {
              if (actualKey.trim().toLowerCase() === k.toLowerCase()) {
                return row[actualKey]?.trim();
              }
            }
          }
          return '';
        };

        const name = getField(['Product Name', 'Name', 'Item Name', 'Title']);
        const sellingPriceStr = getField(['Selling Price', 'Selling Price (₹)', 'Price', 'Sale Price', 'Rate']);
        const mrpStr = getField(['MRP', 'MRP (₹)', 'Maximum Retail Price']);
        const purchasePriceStr = getField(['Purchase Price', 'Purchase Price (₹)', 'Cost Price', 'Cost']);
        const gstRateStr = getField(['GST Rate', 'GST Rate (%)', 'GST%', 'GST']);
        const openingStockStr = getField(['Opening Stock', 'Current Stock', 'Stock', 'Quantity', 'Qty']);
        const hsnCode = getField(['HSN / SAC Code', 'HSN Code', 'HSN', 'SAC']) || '9983';
        const category = getField(['Category', 'Item Group']) || 'General';
        const baseUnit = getField(['Base Unit', 'Unit', 'UOM']) || 'PCS';
        const sku = getField(['SKU', 'SKU / Item Code', 'Item Code']);
        const barcode = getField(['Barcode', 'EAN', 'UPC']);
        const minStockAlertStr = getField(['Min Stock Alert', 'Min Stock', 'Alert Stock']) || '5';

        if (!name) {
          invalids.push({ row: rowNum, item: 'Unnamed', reason: 'Product name cannot be empty' });
          return;
        }

        const sellingPrice = Number(sellingPriceStr);
        if (isNaN(sellingPrice) || sellingPrice <= 0) {
          invalids.push({ row: rowNum, item: name, reason: `Invalid selling price: "${sellingPriceStr}"` });
          return;
        }

        let mrp = mrpStr ? Number(mrpStr) : sellingPrice;
        if (isNaN(mrp) || mrp < sellingPrice) {
          invalids.push({
            row: rowNum,
            item: name,
            reason: `Selling price (₹${sellingPrice}) cannot exceed MRP (₹${mrp}) under Legal Metrology Act`,
          });
          return;
        }

        valids.push({
          name,
          sku: sku || undefined,
          barcode: barcode || undefined,
          category,
          hsnCode,
          baseUnit,
          purchasePrice: Number(purchasePriceStr) || 0,
          sellingPrice,
          mrp,
          gstRate: Number(gstRateStr) || 18,
          openingStock: Number(openingStockStr) || 0,
          minStockAlert: Number(minStockAlertStr) || 5,
        });
      });

      setParsedRows(rawRecords);
      setValidRows(valids);
      setInvalidRows(invalids);
    } catch (err: any) {
      alert('Failed to parse CSV file: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadSample = () => {
    const sampleHeaders = [
      { key: 'name', label: 'Product Name' },
      { key: 'sku', label: 'SKU / Item Code' },
      { key: 'barcode', label: 'Barcode' },
      { key: 'category', label: 'Category' },
      { key: 'hsnCode', label: 'HSN / SAC Code' },
      { key: 'baseUnit', label: 'Base Unit' },
      { key: 'purchasePrice', label: 'Purchase Price (₹)' },
      { key: 'sellingPrice', label: 'Selling Price (₹)' },
      { key: 'mrp', label: 'MRP (₹)' },
      { key: 'gstRate', label: 'GST Rate (%)' },
      { key: 'openingStock', label: 'Opening Stock' },
      { key: 'minStockAlert', label: 'Min Stock Alert' },
    ];

    const sampleRows = [
      {
        name: 'Polycab 2.5mm FlameGuard Wire (90m)',
        sku: 'POLY-25-RED',
        barcode: '8901234567890',
        category: 'Wires & Cables',
        hsnCode: '8544',
        baseUnit: 'ROLL',
        purchasePrice: 1850,
        sellingPrice: 2250,
        mrp: 2450,
        gstRate: 18,
        openingStock: 25,
        minStockAlert: 5,
      },
      {
        name: 'Philips 20W LED Batten Light',
        sku: 'PHIL-20W-LED',
        barcode: '8901234567891',
        category: 'Lighting',
        hsnCode: '8539',
        baseUnit: 'PCS',
        purchasePrice: 320,
        sellingPrice: 450,
        mrp: 499,
        gstRate: 18,
        openingStock: 60,
        minStockAlert: 10,
      },
      {
        name: 'Schneider 16A Modular Switch',
        sku: 'SCH-16A-SW',
        barcode: '8901234567892',
        category: 'Switches & Sockets',
        hsnCode: '8536',
        baseUnit: 'PCS',
        purchasePrice: 65,
        sellingPrice: 95,
        mrp: 110,
        gstRate: 18,
        openingStock: 120,
        minStockAlert: 20,
      },
      {
        name: 'Bosch 12V 45Ah Maintenance Free Battery',
        sku: 'BOSCH-45AH',
        barcode: '8901234567893',
        category: 'Automobile Spares',
        hsnCode: '8507',
        baseUnit: 'NOS',
        purchasePrice: 3400,
        sellingPrice: 4200,
        mrp: 4600,
        gstRate: 28,
        openingStock: 8,
        minStockAlert: 2,
      },
    ];

    const csvContent = generateCsv(sampleHeaders, sampleRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'SmartVyapar_Inventory_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleConfirmImport = async () => {
    if (validRows.length === 0) return;
    setIsUploading(true);

    try {
      const res = await fetch('/api/inventory/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: validRows }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Import failed');
      }

      setResultSummary({
        created: data.createdCount || 0,
        updated: data.updatedCount || 0,
        errors: invalidRows.length,
      });

      onSuccess();
    } catch (err: any) {
      alert('Error importing catalog: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const resetModal = () => {
    setFile(null);
    setParsedRows([]);
    setValidRows([]);
    setInvalidRows([]);
    setResultSummary(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-2xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm md:text-base">
                Bulk Inventory Import (CSV / Excel)
              </h3>
              <p className="text-xs text-slate-500">
                Migrate or import thousands of items from Tally, Vyapar, Marg, or Excel in seconds
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetModal();
              onClose();
            }}
            className="rounded-xl p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Download Template Banner */}
          <div className="flex items-center justify-between rounded-2xl bg-indigo-50/60 border border-indigo-100 p-4">
            <div className="flex items-center space-x-3">
              <Download className="h-5 w-5 text-indigo-600 flex-shrink-0" />
              <div>
                <div className="text-xs font-bold text-indigo-900">Download Standard Template</div>
                <p className="text-[11px] text-indigo-700">Pre-formatted columns with sample electrical & automobile items</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDownloadSample}
              className="rounded-xl bg-white border border-indigo-200 px-3.5 py-1.5 text-xs font-bold text-indigo-700 shadow-sm hover:bg-indigo-50 transition"
            >
              Download CSV
            </button>
          </div>

          {/* Upload Dropzone */}
          {!resultSummary && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="hidden"
                id="bulk-csv-upload-input"
              />
              <label
                htmlFor="bulk-csv-upload-input"
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition ${
                  file
                    ? 'border-indigo-400 bg-indigo-50/20'
                    : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
                }`}
              >
                <UploadCloud className="h-10 w-10 text-indigo-600 mb-2" />
                <div className="text-xs font-bold text-slate-800">
                  {file ? file.name : 'Click to select or drag & drop your inventory CSV'}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports .csv format with up to 5,000 items per import
                </p>
              </label>
            </div>
          )}

          {/* Parsing State */}
          {isProcessing && (
            <div className="flex items-center justify-center space-x-2 py-4 text-xs font-bold text-indigo-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Validating rows and checking Legal Metrology MRP rules...</span>
            </div>
          )}

          {/* Validation Analysis Preview */}
          {!isProcessing && parsedRows.length > 0 && !resultSummary && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <div className="text-lg font-black text-slate-900">{parsedRows.length}</div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Total Rows</div>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-center">
                  <div className="text-lg font-black text-emerald-700">{validRows.length}</div>
                  <div className="text-[10px] text-emerald-600 uppercase font-bold">Ready to Import</div>
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-center">
                  <div className="text-lg font-black text-rose-700">{invalidRows.length}</div>
                  <div className="text-[10px] text-rose-600 uppercase font-bold">Skipped (Errors)</div>
                </div>
              </div>

              {/* Error Warnings List */}
              {invalidRows.length > 0 && (
                <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 max-h-36 overflow-y-auto space-y-1.5 text-[11px]">
                  <div className="font-bold text-rose-900 flex items-center space-x-1">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                    <span>Errors found in {invalidRows.length} rows (these will be skipped):</span>
                  </div>
                  {invalidRows.map((err, i) => (
                    <div key={i} className="text-rose-700 pl-4">
                      • <strong>Row {err.row} ({err.item}):</strong> {err.reason}
                    </div>
                  ))}
                </div>
              )}

              {/* Sample Valid Rows Preview */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-700">
                  Sample Preview (First 3 items):
                </div>
                <div className="divide-y divide-slate-100 text-[11px]">
                  {validRows.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between">
                      <div>
                        <strong className="text-slate-900">{item.name}</strong>
                        <div className="text-slate-500 text-[10px]">
                          HSN: {item.hsnCode} · Cat: {item.category} {item.barcode ? `· Barcode: ${item.barcode}` : ''}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">₹{item.sellingPrice.toFixed(2)}</div>
                        <div className="text-emerald-600 text-[10px]">Stock: +{item.openingStock} {item.baseUnit}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Final Success Summary */}
          {resultSummary && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-base font-black text-emerald-900">Bulk Import Completed!</h4>
              <p className="text-xs text-emerald-700">
                Created <strong>{resultSummary.created}</strong> new products and updated <strong>{resultSummary.updated}</strong> existing items in your database.
              </p>
              <button
                type="button"
                onClick={() => {
                  resetModal();
                  onClose();
                }}
                className="inline-flex items-center space-x-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-emerald-700 transition"
              >
                <span>View Updated Inventory</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!resultSummary && (
          <div className="flex items-center justify-end space-x-2 border-t border-slate-200 bg-slate-50 px-6 py-3">
            <button
              type="button"
              onClick={() => {
                resetModal();
                onClose();
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={validRows.length === 0 || isUploading}
              onClick={handleConfirmImport}
              className="flex items-center space-x-1.5 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white shadow hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Importing {validRows.length} Items...</span>
                </>
              ) : (
                <>
                  <FileCheck className="h-4 w-4" />
                  <span>Import {validRows.length} Valid Items</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
