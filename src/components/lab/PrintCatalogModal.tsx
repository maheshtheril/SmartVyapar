'use client';

import React from 'react';
import { Printer, X, FlaskConical, ShieldCheck, Clock, FileText } from 'lucide-react';

interface PrintCatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
  tests: any[];
  tenant?: any;
}

export default function PrintCatalogModal({ isOpen, onClose, tests, tenant }: PrintCatalogModalProps) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  // Group tests by department
  const grouped: Record<string, any[]> = {};
  tests.forEach((t) => {
    const dept = t.department || 'GENERAL';
    if (!grouped[dept]) grouped[dept] = [];
    grouped[dept].push(t);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-6 space-y-6">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 no-print">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Printer className="h-5 w-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900">
                Official Diagnostic Investigation Catalog (A4 Ready)
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Standard test menu, specimen requirements, turnaround times & rates
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center space-x-1.5 transition"
            >
              <Printer className="h-4 w-4" />
              <span>Print A4 Catalog</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Printable Sheet */}
        <div className="p-6 border border-slate-200 rounded-2xl bg-white space-y-6 text-slate-900 print:border-none print:p-0">
          {/* Lab Letterhead */}
          <div className="flex items-start justify-between border-b-2 border-indigo-900 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-indigo-900 text-white rounded-lg">
                  <FlaskConical className="h-5 w-5" />
                </span>
                <h1 className="text-xl font-black uppercase text-indigo-950 tracking-tight">
                  {tenant?.businessName || 'Apex Diagnostics & Molecular Pathology Lab'}
                </h1>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1">
                {tenant?.address || 'Medical College Road, Calicut, Kerala - 673008'}
              </p>
              <p className="text-[11px] text-slate-500">
                Phone: {tenant?.phone || '+91 98765 00010'} • Official Demo: zionapos.store
              </p>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 rounded font-black text-[10px] uppercase tracking-wider">
                {tenant?.labAccreditationNo || 'NABL ACCREDITED CLINICAL LAB'}
              </span>
              <p className="text-[10px] text-slate-400 font-mono">ISO 15189:2022 Certified</p>
            </div>
          </div>

          <div className="text-center py-2 bg-slate-50 rounded-xl border border-slate-200">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
              Diagnostic Test Menu & Clinical Investigation Directory
            </h2>
          </div>

          {/* Department Tables */}
          {Object.entries(grouped).map(([dept, items]) => (
            <div key={dept} className="space-y-2">
              <div className="flex items-center space-x-2 border-b border-indigo-200 pb-1">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white">
                  {dept}
                </span>
                <span className="text-xs font-bold text-slate-700">
                  {items.length} {items.length === 1 ? 'Investigation' : 'Investigations'}
                </span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                    <th className="py-2 px-3 w-16">Code</th>
                    <th className="py-2 px-3">Investigation Name & Parameters</th>
                    <th className="py-2 px-3 w-36">Specimen Type</th>
                    <th className="py-2 px-3 w-20 text-center">TAT</th>
                    <th className="py-2 px-3 w-24 text-right">Price (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((test) => (
                    <tr key={test.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-600">
                        {test.code}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{test.name}</div>
                        {test.parameters && test.parameters.length > 0 && (
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Parameters ({test.parameters.length}):{' '}
                            {test.parameters.map((p: any) => p.name).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {test.specimenType || 'Serum'}
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-600 font-medium">
                        {test.tatHours ? `${test.tatHours} hrs` : 'Same Day'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                        ₹{Number(test.price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

          {/* Footer note */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
            <span>Special Instructions: 12-Hour Overnight Fasting mandatory for Lipid & Fasting Glucose.</span>
            <span className="font-bold text-indigo-600">Apex Diagnostics Laboratory</span>
          </div>
        </div>
      </div>
    </div>
  );
}
