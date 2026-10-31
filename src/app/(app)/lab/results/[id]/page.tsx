'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import LabNav from '@/components/lab/LabNav';
import { 
  FlaskConical, 
  ArrowLeft, 
  Save, 
  ShieldCheck, 
  AlertTriangle, 
  Calculator, 
  CheckCircle2, 
  Printer, 
  User, 
  Stethoscope, 
  Barcode, 
  Calendar,
  Clock,
  Sparkles
} from 'lucide-react';

interface ResultItem {
  parameterId?: string;
  testName: string;
  parameterName: string;
  parameterCode?: string;
  resultValue: string;
  numericValue?: number | null;
  unit?: string;
  referenceInterval?: string;
  flag: 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL_HIGH' | 'CRITICAL_LOW' | 'ABNORMAL';
  remarks?: string;
  calculationFormula?: string | null;
  maleMin?: number | null;
  maleMax?: number | null;
  femaleMin?: number | null;
  femaleMax?: number | null;
  childMin?: number | null;
  childMax?: number | null;
  generalMin?: number | null;
  generalMax?: number | null;
  criticalLow?: number | null;
  criticalHigh?: number | null;
}

export default function LabResultEntryPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [results, setResults] = useState<ResultItem[]>([]);
  const [pathologistRemarks, setPathologistRemarks] = useState('');
  const [criticalBanner, setCriticalBanner] = useState<string | null>(null);

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const loadOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lab/orders/${orderId}`);
      const data = await res.json();
      if (data.success && data.order) {
        setOrder(data.order);
        setPathologistRemarks(data.order.pathologistRemarks || '');

        // Extract parameters from order items
        const isFemale = data.order.patientGender === 'FEMALE';
        const isChild = (data.order.patientAge || 0) < 12;

        const builtResults: ResultItem[] = [];

        // If existing results already saved, map them
        const existingResultsMap = new Map<string, any>();
        if (data.order.results && data.order.results.length > 0) {
          data.order.results.forEach((r: any) => {
            existingResultsMap.set(r.parameterName, r);
          });
        }

        // Loop through all tests & their parameters
        data.order.items?.forEach((item: any) => {
          const test = item.test;
          test?.parameters?.forEach((p: any) => {
            const existing = existingResultsMap.get(p.name);

            // Determine appropriate reference interval based on age/gender
            let refMin = p.generalMin;
            let refMax = p.generalMax;
            if (isChild && p.childMin !== null) {
              refMin = p.childMin;
              refMax = p.childMax;
            } else if (isFemale && p.femaleMin !== null) {
              refMin = p.femaleMin;
              refMax = p.femaleMax;
            } else if (!isFemale && p.maleMin !== null) {
              refMin = p.maleMin;
              refMax = p.maleMax;
            }

            let refText = p.referenceText;
            if (!refText && refMin !== null && refMax !== null) {
              refText = `${Number(refMin)} - ${Number(refMax)} ${p.unit || ''}`;
            }

            const initialValue = existing?.resultValue ?? '';
            const initialFlag = existing?.flag ?? 'NORMAL';

            builtResults.push({
              parameterId: p.id,
              testName: test.name,
              parameterName: p.name,
              parameterCode: p.code,
              resultValue: initialValue,
              numericValue: existing?.numericValue ?? (initialValue ? Number(initialValue) : null),
              unit: p.unit || '',
              referenceInterval: refText || '',
              flag: initialFlag,
              remarks: existing?.remarks || '',
              calculationFormula: p.calculationFormula,
              maleMin: p.maleMin !== null ? Number(p.maleMin) : null,
              maleMax: p.maleMax !== null ? Number(p.maleMax) : null,
              femaleMin: p.femaleMin !== null ? Number(p.femaleMin) : null,
              femaleMax: p.femaleMax !== null ? Number(p.femaleMax) : null,
              childMin: p.childMin !== null ? Number(p.childMin) : null,
              childMax: p.childMax !== null ? Number(p.childMax) : null,
              generalMin: refMin !== null ? Number(refMin) : null,
              generalMax: refMax !== null ? Number(refMax) : null,
              criticalLow: p.criticalLow !== null ? Number(p.criticalLow) : null,
              criticalHigh: p.criticalHigh !== null ? Number(p.criticalHigh) : null,
            });
          });
        });

        setResults(builtResults);
      }
    } catch (err) {
      console.error('Failed to load lab order:', err);
    } finally {
      setLoading(false);
    }
  };

  // Evaluate flags for a numeric value against patient-specific normal range
  const evaluateFlag = (item: ResultItem, valStr: string): 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL_HIGH' | 'CRITICAL_LOW' | 'ABNORMAL' => {
    if (!valStr || isNaN(Number(valStr))) return 'NORMAL';
    const num = Number(valStr);

    // Critical panic thresholds
    if (item.criticalLow !== null && item.criticalLow !== undefined && num <= item.criticalLow) {
      return 'CRITICAL_LOW';
    }
    if (item.criticalHigh !== null && item.criticalHigh !== undefined && num >= item.criticalHigh) {
      return 'CRITICAL_HIGH';
    }

    // Normal boundaries
    if (item.generalMin !== null && item.generalMin !== undefined && num < item.generalMin) {
      return 'LOW';
    }
    if (item.generalMax !== null && item.generalMax !== undefined && num > item.generalMax) {
      return 'HIGH';
    }

    return 'NORMAL';
  };

  // Handle parameter value change + auto-calculate formulas
  const handleValueChange = (index: number, newVal: string) => {
    const updated = [...results];
    updated[index].resultValue = newVal;
    updated[index].numericValue = newVal && !isNaN(Number(newVal)) ? Number(newVal) : null;
    updated[index].flag = evaluateFlag(updated[index], newVal);

    // AUTO-CALCULATE FORMULAS:
    // 1. Lipid Profile Formulas:
    // LDL = CHOL - HDL - (TRIG / 5)
    // VLDL = TRIG / 5
    // Ratio = CHOL / HDL
    const cholItem = updated.find(r => r.parameterCode === 'CHOL');
    const hdlItem = updated.find(r => r.parameterCode === 'HDL');
    const trigItem = updated.find(r => r.parameterCode === 'TRIG');
    const ldlItem = updated.find(r => r.parameterCode === 'LDL');
    const vldlItem = updated.find(r => r.parameterCode === 'VLDL');
    const ratioItem = updated.find(r => r.parameterCode === 'RATIO');

    const chol = cholItem?.numericValue;
    const hdl = hdlItem?.numericValue;
    const trig = trigItem?.numericValue;

    if (trig && vldlItem) {
      const vldlVal = (trig / 5).toFixed(1);
      vldlItem.resultValue = vldlVal;
      vldlItem.numericValue = Number(vldlVal);
      vldlItem.flag = evaluateFlag(vldlItem, vldlVal);
    }

    if (chol && hdl && trig && ldlItem) {
      const ldlVal = (chol - hdl - (trig / 5)).toFixed(1);
      ldlItem.resultValue = ldlVal;
      ldlItem.numericValue = Number(ldlVal);
      ldlItem.flag = evaluateFlag(ldlItem, ldlVal);
    }

    if (chol && hdl && hdl > 0 && ratioItem) {
      const rVal = (chol / hdl).toFixed(2);
      ratioItem.resultValue = rVal;
      ratioItem.numericValue = Number(rVal);
      ratioItem.flag = evaluateFlag(ratioItem, rVal);
    }

    // 2. LFT Formulas:
    // Globulin = Total Protein (TP) - Albumin (ALB)
    // A/G Ratio = Albumin / Globulin
    const tpItem = updated.find(r => r.parameterCode === 'TP');
    const albItem = updated.find(r => r.parameterCode === 'ALB');
    const globItem = updated.find(r => r.parameterCode === 'GLOB');
    const agRatioItem = updated.find(r => r.parameterCode === 'AG_RATIO');

    const tp = tpItem?.numericValue;
    const alb = albItem?.numericValue;

    if (tp && alb && globItem) {
      const globVal = (tp - alb).toFixed(2);
      globItem.resultValue = globVal;
      globItem.numericValue = Number(globVal);
      globItem.flag = evaluateFlag(globItem, globVal);

      if (Number(globVal) > 0 && agRatioItem) {
        const agVal = (alb / Number(globVal)).toFixed(2);
        agRatioItem.resultValue = agVal;
        agRatioItem.numericValue = Number(agVal);
        agRatioItem.flag = evaluateFlag(agRatioItem, agVal);
      }
    }

    // Check if any critical panic thresholds breached
    const criticals = updated.filter(r => r.flag === 'CRITICAL_HIGH' || r.flag === 'CRITICAL_LOW');
    if (criticals.length > 0) {
      setCriticalBanner(
        `Critical Panic Value Detected: ${criticals.map(c => `${c.parameterName}: ${c.resultValue} ${c.unit} (${c.flag.replace('_', ' ')})`).join(' | ')}`
      );
    } else {
      setCriticalBanner(null);
    }

    setResults(updated);
  };

  const handleSave = async (verify: boolean = false) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/lab/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: verify ? 'VERIFY_AND_SIGN' : 'SAVE_RESULTS',
          results,
          pathologistRemarks,
          isVerified: verify
        })
      });

      const data = await res.json();
      if (data.success) {
        if (verify) {
          router.push(`/lab/report/${orderId}`);
        } else {
          loadOrder();
          alert('Diagnostic test values successfully saved to worklist!');
        }
      } else {
        alert(data.error || 'Failed to save results');
      }
    } catch (err) {
      console.error('Error saving lab results:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
        <FlaskConical className="h-8 w-8 animate-spin mx-auto text-indigo-600 mb-2" />
        <p className="text-xs font-semibold text-slate-500">Loading Diagnostic Worklist & Normal Ranges...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
        <AlertTriangle className="h-8 w-8 text-rose-500 mx-auto" />
        <p className="text-sm font-bold text-slate-900">Lab Order Not Found</p>
        <Link href="/lab/queue" className="text-xs text-indigo-600 underline font-bold">
          Return to Queue
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <LabNav />

      {/* Back Link & Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/lab/queue"
            className="p-2 border border-slate-200 rounded-xl bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Diagnostic Result Worklist
              </h1>
              <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
                {order.orderNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Real-time biological reference interval check & formula evaluation.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-2xs"
          >
            <Save className="h-4 w-4 text-slate-500" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave(true)}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition flex items-center space-x-1.5 shadow-sm"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Authorize & Sign Off</span>
          </button>
        </div>
      </div>

      {/* Critical Panic Alert Banner */}
      {criticalBanner && (
        <div className="p-4 bg-rose-600 text-white rounded-2xl shadow-md flex items-center space-x-3 animate-pulse">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <div className="text-xs">
            <span className="font-black text-sm uppercase block tracking-wider">Statutory Panic Value Warning</span>
            <span>{criticalBanner}</span>
          </div>
        </div>
      )}

      {/* Patient Demographic Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Patient Name</span>
          <span className="font-bold text-slate-900 text-sm">{order.patientName}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Demographics</span>
          <span className="font-bold text-slate-900">
            {order.patientAge} Years / {order.patientGender}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Sample Barcode</span>
          <span className="font-mono font-black text-indigo-600 text-sm">{order.sampleBarcode}</span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Referring Doctor</span>
          <span className="font-bold text-slate-900">{order.referringDoctorName || 'Self / Walk-in'}</span>
        </div>
      </div>

      {/* Test Parameters Entry Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FlaskConical className="h-4 w-4 text-indigo-600" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
              Laboratory Parameter Findings
            </h2>
          </div>
          <span className="text-[11px] font-semibold text-slate-500">
            Target Normal Ranges evaluated for {order.patientGender} ({order.patientAge}y)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/50 border-b border-slate-100 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
              <tr>
                <th className="py-2.5 px-4">Test & Parameter</th>
                <th className="py-2.5 px-4 w-44">Observed Value</th>
                <th className="py-2.5 px-4 w-28">Units</th>
                <th className="py-2.5 px-4">Biological Reference Range</th>
                <th className="py-2.5 px-4 w-32">Evaluation Flag</th>
                <th className="py-2.5 px-4">Notes / Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {results.map((r, idx) => (
                <tr
                  key={idx}
                  className={`transition ${
                    r.flag === 'CRITICAL_HIGH' || r.flag === 'CRITICAL_LOW'
                      ? 'bg-rose-50/70 font-semibold'
                      : r.flag === 'HIGH' || r.flag === 'LOW'
                      ? 'bg-amber-50/30'
                      : 'hover:bg-slate-50/40'
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{r.parameterName}</div>
                    <span className="text-[10px] text-slate-400 font-medium">{r.testName}</span>
                    {r.calculationFormula && (
                      <span className="inline-flex items-center space-x-1 text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded ml-2 font-mono">
                        <Calculator className="h-2.5 w-2.5" />
                        <span>Auto-Calc</span>
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <input
                      type="text"
                      placeholder="Enter value"
                      value={r.resultValue}
                      onChange={(e) => handleValueChange(idx, e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl border text-xs font-mono font-bold transition focus:ring-2 focus:ring-indigo-500 ${
                        r.flag === 'CRITICAL_HIGH' || r.flag === 'CRITICAL_LOW'
                          ? 'border-rose-500 bg-white text-rose-700'
                          : r.flag === 'HIGH'
                          ? 'border-rose-300 bg-white text-rose-600'
                          : r.flag === 'LOW'
                          ? 'border-blue-300 bg-white text-blue-600'
                          : 'border-slate-200 bg-slate-50/50 text-slate-900 focus:bg-white'
                      }`}
                    />
                  </td>

                  <td className="py-3 px-4 font-mono font-medium text-slate-600">{r.unit}</td>

                  <td className="py-3 px-4 text-slate-600 font-medium">
                    {r.referenceInterval || 'Clinical Correlation Required'}
                  </td>

                  <td className="py-3 px-4">
                    {r.flag === 'NORMAL' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700">
                        NORMAL
                      </span>
                    )}
                    {r.flag === 'HIGH' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-700">
                        ▲ HIGH
                      </span>
                    )}
                    {r.flag === 'LOW' && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-blue-100 text-blue-700">
                        ▼ LOW
                      </span>
                    )}
                    {(r.flag === 'CRITICAL_HIGH' || r.flag === 'CRITICAL_LOW') && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-600 text-white animate-pulse">
                        ⚠️ PANIC {r.flag === 'CRITICAL_HIGH' ? 'HIGH' : 'LOW'}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <input
                      type="text"
                      placeholder="Remarks..."
                      value={r.remarks || ''}
                      onChange={(e) => {
                        const updated = [...results];
                        updated[idx].remarks = e.target.value;
                        setResults(updated);
                      }}
                      className="w-full px-2 py-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-indigo-500 text-[11px] text-slate-600 outline-none"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pathologist Clinical Summary & Impression */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center space-x-2">
          <Stethoscope className="h-5 w-5 text-indigo-600" />
          <h3 className="text-sm font-black text-slate-900">
            Consultant Pathologist Impression & Clinical Summary
          </h3>
        </div>
        <textarea
          rows={3}
          placeholder="Enter clinical impression, microscopic findings, recommendations or repeat test intervals (printed directly on final report)..."
          value={pathologistRemarks}
          onChange={(e) => setPathologistRemarks(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="text-slate-500 flex items-center space-x-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>
              Authorized by: <strong>{order.tenant?.labPathologistName || 'Chief Pathologist'}</strong> ({order.tenant?.labPathologistDegree || 'MD Pathology'})
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl transition"
            >
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center space-x-1.5"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Verify & Stamp Digital Signature</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
