const fs = require('fs');
let p = 'C:\\\\2035-HMS\\\\ZionaPOS\\\\src\\\\app\\\\(app)\\\\customers\\\\page.tsx';
let c = fs.readFileSync(p, 'utf8');

const importIcon = `import { Users, Search, Plus, Upload, Download, FileText, CheckCircle2, AlertCircle, Map, ChevronRight, MapPin } from 'lucide-react';`;
c = c.replace(/import \{ Users, Search, Plus \} from 'lucide-react';/, importIcon);

const importState = `
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const downloadTemplate = () => {
    const headers = "Name,Phone,OpeningBalance,Email,GSTIN,StateCode,Address,Pincode\\n";
    const sample = "Rajan Enterprises,9876543210,1500.50,rajan@example.com,29AAAAA0000A1Z5,29,123 MG Road,560001\\n";
    const blob = new Blob([headers + sample], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Customer_Import_Template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);

    try {
      const text = await importFile.text();
      const rows = text.split('\\n').map(r => r.trim()).filter(Boolean);
      if (rows.length < 2) throw new Error("File is empty or missing data rows.");

      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      
      const customersToImport = rows.slice(1).map(row => {
        // Handle basic CSV splitting (ignoring quotes for simplicity in this version)
        const values = row.split(',');
        const obj: any = {};
        headers.forEach((header, index) => {
          obj[header] = values[index]?.trim() || '';
        });
        return obj;
      });

      const res = await fetch('/api/customers/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customers: customersToImport })
      });
      
      const data = await res.json();
      setImportResult(data);
      if (data.success) {
        fetchCustomers();
      }
    } catch (err: any) {
      setImportResult({ success: false, error: err.message });
    } finally {
      setImporting(false);
    }
  };
`;

c = c.replace(/const fetchCustomers = async \(\) => \{/, importState + '\n  const fetchCustomers = async () => {');

const importButton = `
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={() => { setIsImportModalOpen(true); setImportResult(null); setImportFile(null); }}
            className="flex-1 sm:flex-none bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <Upload className="h-4 w-4" /> Bulk Import
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="h-4 w-4" /> Add Customer
          </button>
        </div>
`;

c = c.replace(/<button\s*onClick=\{\(\) => setIsAddModalOpen\(true\)\}\s*className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2\.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm"\s*>\s*<Plus className="h-4 w-4" \/> Add Customer\s*<\/button>/, importButton);

const importModal = `
      {/* BULK IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <Upload className="h-4 w-4 text-indigo-600" /> Bulk Import Customers
              </h2>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              {!importResult ? (
                <>
                  <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-center">
                    <p className="text-xs text-indigo-800 font-medium mb-3">
                      Download the official CSV template, fill in your customer details, and upload it here.
                    </p>
                    <button onClick={downloadTemplate} className="bg-white text-indigo-600 border border-indigo-200 hover:border-indigo-400 px-4 py-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 mx-auto">
                      <Download className="h-3 w-3" /> Download CSV Template
                    </button>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">Upload Completed CSV</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition relative">
                      <input 
                        type="file" 
                        accept=".csv"
                        onChange={e => setImportFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <FileText className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">
                        {importFile ? importFile.name : "Click to select or drag and drop CSV"}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {importResult.success ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-6 text-center">
                      <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
                      <h3 className="font-black text-emerald-800 text-lg">Import Complete</h3>
                      <p className="text-sm text-emerald-600 font-medium mt-1">
                        Successfully imported <b>{importResult.imported}</b> customers.
                      </p>
                      {importResult.failed > 0 && (
                        <p className="text-xs text-rose-600 mt-2 font-bold">
                          Failed to import {importResult.failed} rows.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-6 text-center">
                      <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-2" />
                      <h3 className="font-black text-rose-800 text-lg">Import Failed</h3>
                      <p className="text-xs text-rose-600 mt-2">{importResult.error}</p>
                    </div>
                  )}

                  {importResult.errors && importResult.errors.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-3 max-h-32 overflow-y-auto border border-slate-200">
                      <p className="text-[10px] font-bold uppercase text-slate-500 mb-2">Error Log</p>
                      <ul className="text-xs text-slate-700 space-y-1">
                        {importResult.errors.map((err: string, i: number) => <li key={i}>• {err}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex gap-2 bg-slate-50/50">
              <button 
                onClick={() => setIsImportModalOpen(false)}
                className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2.5 rounded-xl text-xs font-bold transition"
              >
                {importResult ? "Close" : "Cancel"}
              </button>
              {!importResult && (
                <button 
                  disabled={!importFile || importing}
                  onClick={handleImport}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition flex justify-center items-center gap-2"
                >
                  {importing ? "Importing..." : "Start Import"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
`;

c = c.replace(/\{\/\* ADD CUSTOMER MODAL \*\/\}/, importModal + '\n\n      {/* ADD CUSTOMER MODAL */}');

fs.writeFileSync(p, c, 'utf8');
console.log('Bulk Import UI added to customers page');
