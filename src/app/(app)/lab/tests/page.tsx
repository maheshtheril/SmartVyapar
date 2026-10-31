'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Tag, 
  Search, 
  Plus, 
  ChevronDown, 
  ChevronRight, 
  FlaskConical, 
  Clock, 
  Calculator, 
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  X
} from 'lucide-react';

import LabNav from '@/components/lab/LabNav';
import PrintCatalogModal from '@/components/lab/PrintCatalogModal';
import { Printer } from 'lucide-react';

export default function LabTestCatalogPage() {
  const [printCatalogOpen, setPrintCatalogOpen] = useState(false);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');
  const [expandedTestId, setExpandedTestId] = useState<string | null>('CBC');

  // New Test Modal State
  const [showModal, setShowModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDept, setNewDept] = useState('BIOCHEMISTRY');
  const [newSpecimen, setNewSpecimen] = useState('Serum');
  const [newPrice, setNewPrice] = useState('250');
  const [newTat, setNewTat] = useState('4');
  const [newMethod, setNewMethod] = useState('');
  const [newInstructions, setNewInstructions] = useState('');
  const [paramRows, setParamRows] = useState([
    { name: '', code: '', unit: '', maleMin: '', maleMax: '', femaleMin: '', femaleMax: '', referenceText: '', criticalHigh: '' }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const loadTests = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lab/tests');
      const data = await res.json();
      if (data.success) {
        setTests(data.tests || []);
        if (data.tests?.length > 0 && !expandedTestId) {
          setExpandedTestId(data.tests[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load lab tests:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  const handleAddParamRow = () => {
    setParamRows([
      ...paramRows,
      { name: '', code: '', unit: '', maleMin: '', maleMax: '', femaleMin: '', femaleMax: '', referenceText: '', criticalHigh: '' }
    ]);
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode.trim() || !newName.trim()) {
      alert('Test Code and Test Name are required');
      return;
    }

    setSubmitting(true);
    try {
      const validParams = paramRows.filter(p => p.name.trim().length > 0);
      const res = await fetch('/api/lab/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          name: newName,
          department: newDept,
          specimenType: newSpecimen,
          price: parseFloat(newPrice) || 0,
          tatHours: parseInt(newTat) || 4,
          method: newMethod,
          instructions: newInstructions,
          parameters: validParams
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowModal(false);
        setNewCode('');
        setNewName('');
        setParamRows([{ name: '', code: '', unit: '', maleMin: '', maleMax: '', femaleMin: '', femaleMax: '', referenceText: '', criticalHigh: '' }]);
        loadTests();
      } else {
        alert(data.error || 'Failed to save test');
      }
    } catch (err) {
      console.error('Error creating test:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredTests = tests.filter(t => {
    const matchesDept = selectedDept === 'ALL' || t.department === selectedDept;
    const matchesSearch = !searchQuery || 
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      t.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDept && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <LabNav onPrintCatalog={() => setPrintCatalogOpen(true)} />

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
              <Tag className="h-6 w-6" />
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Diagnostic Test Catalog & Reference Range Master
            </h1>
          </div>
          <p className="text-xs font-semibold text-slate-500 mt-1">
            Configure test packages, specimen requirements, age/gender normal ranges, and auto-calculation formulas.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPrintCatalogOpen(true)}
            className="rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 text-xs font-bold text-emerald-800 transition flex items-center space-x-1.5 shadow-2xs"
          >
            <Printer className="h-4 w-4 text-emerald-600" />
            <span>Print Catalog (A4)</span>
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition flex items-center space-x-1.5 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Add Custom Test</span>
          </button>
          <button
            onClick={loadTests}
            className="p-2 border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800 rounded-xl transition"
            title="Refresh catalog"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Department Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
          {[
            { id: 'ALL', label: 'All Departments' },
            { id: 'HEMATOLOGY', label: '🩸 Hematology' },
            { id: 'BIOCHEMISTRY', label: '🧪 Clinical Biochemistry' },
            { id: 'IMMUNOLOGY', label: '🛡️ Immunology & Hormones' },
            { id: 'CLINICAL_PATHOLOGY', label: '🔬 Clinical Pathology' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedDept(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedDept === tab.id
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search test by code (e.g. CBC, LIPID, LFT) or test name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-indigo-500 font-medium"
          />
        </div>
      </div>

      {/* Tests Catalog List with Expandable Parameters */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
          <p className="text-xs font-semibold text-slate-500">Loading Test Catalog...</p>
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-sm font-bold text-slate-700">No diagnostic tests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTests.map((test) => {
            const isExpanded = expandedTestId === test.id || expandedTestId === test.code;

            return (
              <div
                key={test.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs transition"
              >
                {/* Test Card Header */}
                <div
                  onClick={() => setExpandedTestId(isExpanded ? null : test.id)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/60 transition"
                >
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                      {test.code}
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{test.name}</h3>
                      <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-600">{test.department}</span>
                        <span>•</span>
                        <span>Specimen: <strong>{test.specimenType}</strong></span>
                        {test.tatHours && (
                          <>
                            <span>•</span>
                            <span className="flex items-center space-x-1">
                              <Clock className="h-3 w-3 text-slate-400" />
                              <span>TAT: {test.tatHours} hrs</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <span className="text-sm font-black text-slate-900">₹{Number(test.price).toFixed(0)}</span>
                      <span className="text-[10px] text-slate-400 block font-medium">Standard Patient Fee</span>
                    </div>
                    <div className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600">
                      {isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Parameters Table */}
                {isExpanded && test.parameters && test.parameters.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50/40 p-4">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Parameters & Normal Reference Intervals ({test.parameters.length} Investigations)</span>
                      {test.method && <span className="text-[11px] text-slate-500 font-normal">Method: {test.method}</span>}
                    </div>

                    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                          <tr>
                            <th className="py-2 px-3">Parameter Name</th>
                            <th className="py-2 px-3">Code</th>
                            <th className="py-2 px-3">Unit</th>
                            <th className="py-2 px-3">Reference Interval</th>
                            <th className="py-2 px-3">Auto-Calculation / Panic Rules</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {test.parameters.map((p: any) => (
                            <tr key={p.id} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{p.name}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-500">{p.code || '—'}</td>
                              <td className="py-2.5 px-3 font-mono font-medium text-slate-600">{p.unit || '—'}</td>
                              <td className="py-2.5 px-3 text-slate-700 font-medium">{p.referenceText || '—'}</td>
                              <td className="py-2.5 px-3">
                                {p.calculationFormula && (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                    <Calculator className="h-3 w-3" />
                                    <span>Formula: {p.calculationFormula}</span>
                                  </span>
                                )}
                                {(p.criticalLow !== null || p.criticalHigh !== null) && (
                                  <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-100 ml-1.5">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>Panic: {p.criticalLow ? `<${p.criticalLow}` : ''} {p.criticalHigh ? `>${p.criticalHigh}` : ''}</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Custom Diagnostic Test Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Plus className="h-5 w-5" />
                </span>
                <h3 className="text-lg font-black text-slate-900">Add New Diagnostic Investigation</h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Test Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DENGUE_NS1, URINE_R"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold uppercase focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Test Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dengue NS1 Antigen Rapid Test"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Department</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white"
                  >
                    <option value="BIOCHEMISTRY">Biochemistry</option>
                    <option value="HEMATOLOGY">Hematology</option>
                    <option value="IMMUNOLOGY">Immunology & Serology</option>
                    <option value="CLINICAL_PATHOLOGY">Clinical Pathology</option>
                    <option value="MICROBIOLOGY">Microbiology</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Specimen Tube</label>
                  <input
                    type="text"
                    placeholder="e.g. Serum / EDTA / Urine"
                    value={newSpecimen}
                    onChange={(e) => setNewSpecimen(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Test Fee (₹)</label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Turnaround (Hrs)</label>
                  <input
                    type="number"
                    value={newTat}
                    onChange={(e) => setNewTat(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:bg-white"
                  />
                </div>
              </div>

              {/* Parameter Rows */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-bold text-slate-900 text-xs">
                    Investigation Parameters & Normal Intervals
                  </label>
                  <button
                    type="button"
                    onClick={handleAddParamRow}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                  >
                    <Plus className="h-3 w-3" />
                    <span>Add Parameter</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto p-1">
                  {paramRows.map((row, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div>
                        <input
                          type="text"
                          placeholder="Parameter Name *"
                          value={row.name}
                          onChange={(e) => {
                            const updated = [...paramRows];
                            updated[idx].name = e.target.value;
                            setParamRows(updated);
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Units (e.g. mg/dL)"
                          value={row.unit}
                          onChange={(e) => {
                            const updated = [...paramRows];
                            updated[idx].unit = e.target.value;
                            setParamRows(updated);
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                        />
                      </div>
                      <div className="col-span-2">
                        <input
                          type="text"
                          placeholder="Reference Interval text (e.g. 70 - 110 mg/dL)"
                          value={row.referenceText}
                          onChange={(e) => {
                            const updated = [...paramRows];
                            updated[idx].referenceText = e.target.value;
                            setParamRows(updated);
                          }}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Saving Test...' : 'Save Diagnostic Test'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Printable Test Catalog Modal */}
      <PrintCatalogModal
        isOpen={printCatalogOpen}
        onClose={() => setPrintCatalogOpen(false)}
        tests={tests}
      />
    </div>
  );
}
