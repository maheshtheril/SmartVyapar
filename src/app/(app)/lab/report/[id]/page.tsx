'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Printer, 
  ArrowLeft, 
  ShieldCheck, 
  FlaskConical, 
  Calendar, 
  Clock, 
  User, 
  Stethoscope, 
  Barcode, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import LabNav from '@/components/lab/LabNav';

export default function LabReportPrintPage() {
  const params = useParams();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/lab/orders/${orderId}`);
        const data = await res.json();
        if (data.success) {
          setOrder(data.order);
        }
      } catch (err) {
        console.error('Failed to load report:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [orderId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <FlaskConical className="h-8 w-8 animate-spin mx-auto text-indigo-600 mb-2" />
        <p className="text-xs font-semibold text-slate-500">Generating Official Diagnostic Report...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
        <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
        <p className="text-sm font-bold text-slate-900">Diagnostic Report Not Found</p>
        <Link href="/lab/queue" className="text-xs text-indigo-600 underline font-bold">
          Return to Queue
        </Link>
      </div>
    );
  }

  const tenant = order.tenant;
  const isAbnormal = order.results?.some((r: any) => r.flag && r.flag !== 'NORMAL');

  // Group results by Test Name
  const resultsByTest: Record<string, any[]> = {};
  order.results?.forEach((r: any) => {
    if (!resultsByTest[r.testName]) {
      resultsByTest[r.testName] = [];
    }
    resultsByTest[r.testName].push(r);
  });

  return (
    <div className="space-y-6">
      <div className="no-print">
        <LabNav />
      </div>

      {/* Screen-only Action Bar */}
      <div className="flex items-center justify-between no-print bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <Link
          href="/lab/queue"
          className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Lab Queue</span>
        </Link>

        <div className="flex items-center space-x-2">
          <Link
            href={`/lab/results/${order.id}`}
            className="px-3.5 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition"
          >
            Edit Values
          </Link>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center space-x-1.5"
          >
            <Printer className="h-4 w-4" />
            <span>Print Official Report (A4)</span>
          </button>
        </div>
      </div>

      {/* A4 Medical Diagnostic Report Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg max-w-4xl mx-auto p-8 sm:p-12 print:p-0 print:border-none print:shadow-none print:max-w-none text-slate-900 font-sans space-y-6">
        
        {/* Lab Header */}
        <div className="border-b-2 border-indigo-950 pb-4">
          <div className="flex justify-between items-start gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-indigo-900 text-white rounded-lg">
                  <FlaskConical className="h-6 w-6" />
                </span>
                <h1 className="text-xl font-black uppercase tracking-tight text-indigo-950">
                  {tenant?.businessName || 'Apex Diagnostics Laboratory'}
                </h1>
              </div>
              <p className="text-[11px] font-semibold text-slate-600 mt-1">
                {tenant?.legalName} • {tenant?.address}
              </p>
              <div className="flex items-center space-x-3 text-[10px] text-slate-500 font-medium mt-0.5">
                <span>Phone: {tenant?.phone}</span>
                <span>•</span>
                <span>GSTIN: {tenant?.gstin || 'EXEMPT'}</span>
              </div>
            </div>

            <div className="text-right space-y-1">
              <span className="inline-block px-2.5 py-1 rounded bg-indigo-50 border border-indigo-200 text-[10px] font-black text-indigo-900 uppercase tracking-wider">
                {tenant?.labAccreditationNo || 'NABL ACCREDITED MOLECULAR LAB'}
              </span>
              <div className="text-[10px] font-mono text-slate-400">
                ISO 15189:2022 Quality Standard
              </div>
            </div>
          </div>
        </div>

        {/* Patient Demographic & Accession Bar */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs leading-snug">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Patient Name</span>
            <span className="font-bold text-slate-900 text-sm">{order.patientName}</span>
            <span className="text-[11px] text-slate-500 block">
              {order.patientAge} Years / {order.patientGender}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Accession / Order No</span>
            <span className="font-mono font-bold text-slate-900">{order.orderNumber}</span>
            <span className="text-[10px] text-slate-500 font-mono block">Barcode: {order.sampleBarcode}</span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Specimen Details</span>
            <span className="font-semibold text-slate-900">{order.sampleType || 'EDTA Blood / Serum'}</span>
            <span className="text-[10px] text-slate-500 block">
              Drawn: {order.collectedAt ? new Date(order.collectedAt).toLocaleDateString() : 'Today'}
            </span>
          </div>

          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Referring Clinician</span>
            <span className="font-bold text-slate-900">{order.referringDoctorName || 'Self / Walk-In'}</span>
            <span className="text-[10px] text-slate-500 block">
              Reported: {order.verifiedAt ? new Date(order.verifiedAt).toLocaleDateString() : 'Today'}
            </span>
          </div>
        </div>

        {/* Grouped Test Findings Table */}
        <div className="space-y-6">
          {Object.entries(resultsByTest).map(([testName, testResults]) => (
            <div key={testName} className="space-y-2">
              <div className="bg-slate-100/80 px-3 py-1.5 rounded-lg border-l-4 border-indigo-900 flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                  {testName}
                </h3>
                <span className="text-[10px] font-semibold text-slate-500 italic">
                  Primary Specimen Test
                </span>
              </div>

              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-1.5 px-2">Investigation Parameter</th>
                    <th className="py-1.5 px-2 w-32">Observed Result</th>
                    <th className="py-1.5 px-2 w-24">Units</th>
                    <th className="py-1.5 px-2">Biological Reference Interval</th>
                    <th className="py-1.5 px-2 w-12 text-center">Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {testResults.map((r: any) => {
                    const isHigh = r.flag === 'HIGH' || r.flag === 'CRITICAL_HIGH';
                    const isLow = r.flag === 'LOW' || r.flag === 'CRITICAL_LOW';
                    const isCritical = r.flag === 'CRITICAL_HIGH' || r.flag === 'CRITICAL_LOW';

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="py-2 px-2 font-medium text-slate-900">
                          {r.parameterName}
                          {r.remarks && (
                            <span className="text-[10px] text-slate-400 block italic">{r.remarks}</span>
                          )}
                        </td>

                        <td className="py-2 px-2 font-mono">
                          <span
                            className={`px-1.5 py-0.5 rounded ${
                              isCritical
                                ? 'bg-rose-100 text-rose-800 font-black'
                                : isHigh
                                ? 'text-rose-600 font-bold'
                                : isLow
                                ? 'text-blue-600 font-bold'
                                : 'text-slate-900 font-medium'
                            }`}
                          >
                            {r.resultValue}
                          </span>
                        </td>

                        <td className="py-2 px-2 font-mono text-slate-500">{r.unit}</td>

                        <td className="py-2 px-2 text-slate-600 font-medium">
                          {r.referenceInterval || '—'}
                        </td>

                        <td className="py-2 px-2 text-center font-bold text-[11px]">
                          {isHigh && <span className="text-rose-600 font-black">H</span>}
                          {isLow && <span className="text-blue-600 font-black">L</span>}
                          {!isHigh && !isLow && <span className="text-slate-300">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Pathologist Clinical Impression / Remarks */}
        {order.pathologistRemarks && (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-1 text-xs">
            <span className="font-bold text-slate-900 uppercase text-[10px] tracking-wider block">
              Consultant Pathologist Impression / Recommendations:
            </span>
            <p className="text-slate-700 leading-relaxed font-medium">
              {order.pathologistRemarks}
            </p>
          </div>
        )}

        {/* End of Report Bar */}
        <div className="text-center py-2 text-[10px] text-slate-400 uppercase tracking-widest font-bold border-y border-dashed border-slate-200">
          *** End of Medical Diagnostic Report ***
        </div>

        {/* Verification Signatures & Authenticity QR Footer */}
        <div className="pt-4 flex items-end justify-between gap-6">
          {/* Dynamic Authenticity QR Code */}
          <div className="flex items-center space-x-3">
            <div className="p-1 bg-white border border-slate-200 rounded-lg shadow-2xs">
              <QRCodeSVG
                value={`https://zionapos.com/verify/lab/${order.id}`}
                size={70}
                level="M"
              />
            </div>
            <div className="text-[10px] text-slate-500 leading-tight">
              <span className="font-bold text-slate-900 block">Scan to Verify Report</span>
              <span>Authentic Digital Record</span>
              <span className="font-mono text-[9px] block text-slate-400 mt-0.5">{order.sampleBarcode}</span>
            </div>
          </div>

          {/* Technologist & Pathologist Sign-Off Block */}
          <div className="flex items-end space-x-8 text-right text-xs">
            <div>
              <div className="h-10 border-b border-slate-300 w-32 flex items-end justify-center pb-1">
                <span className="text-[10px] font-mono text-slate-400 italic">Rahul Kumar</span>
              </div>
              <span className="text-[10px] font-bold text-slate-600 mt-1 block">Medical Lab Tech</span>
              <span className="text-[9px] text-slate-400 block">Tested & Validated</span>
            </div>

            <div>
              {/* Doctor Digital Stamp */}
              <div className="h-10 border-b-2 border-indigo-900 w-44 flex items-end justify-center pb-1">
                <div className="text-center">
                  <span className="text-indigo-900 font-serif italic font-bold text-xs block">
                    Dr. Ananya Nair
                  </span>
                </div>
              </div>
              <span className="text-[11px] font-black text-indigo-950 mt-1 block">
                {tenant?.labPathologistName || 'Dr. Ananya Nair, MD'}
              </span>
              <span className="text-[10px] font-semibold text-slate-600 block">
                {tenant?.labPathologistDegree || 'MD (Pathology), DCP'}
              </span>
              <span className="text-[9px] font-mono text-slate-400 block">
                {tenant?.labPathologistRegNo || 'Reg: TCMC 49182'}
              </span>
            </div>
          </div>
        </div>

        {/* Standard Disclaimer Footer */}
        <div className="text-[9px] text-slate-400 text-center pt-4 border-t border-slate-100">
          Note: Medical diagnostic reports are intended to assist registered medical clinicians and should be clinically correlated. In case of unexpected findings, a repeat sample is recommended.
        </div>
      </div>
    </div>
  );
}
