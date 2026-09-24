'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Wrench, User, CarFront, FileText, IndianRupee } from 'lucide-react';
import Link from 'next/link';

export default function JobCardDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [jobCard, setJobCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Workflow states
  const [updating, setUpdating] = useState(false);
  const [approvedEstimate, setApprovedEstimate] = useState<string>('');
  
  useEffect(() => {
    fetchJobCard();
  }, [params.id]);

  const fetchJobCard = async () => {
    try {
      const res = await fetch(`/api/job-cards/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setJobCard(data);
        setApprovedEstimate(data.approvedEstimate?.toString() || data.estimatedTotal?.toString() || '0');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try {
      const payload: any = { status: newStatus };
      if (newStatus === 'IN_PROGRESS' || newStatus === 'WORK_IN_PROGRESS') {
        payload.approvedEstimate = Number(approvedEstimate);
      }
      
      const res = await fetch(`/api/job-cards/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        fetchJobCard();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="p-10 text-center text-slate-500">Loading Job Card...</div>;
  if (!jobCard) return <div className="p-10 text-center text-red-500">Job Card not found.</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/garage" className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <ArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {jobCard.jobCardNumber}
            </h1>
            <p className="text-sm text-slate-500 font-medium">Status: {jobCard.status}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Col */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-indigo-600" /> Customer & Vehicle
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase mb-1">Customer</p>
                <p className="font-medium">{jobCard.vehicle?.customer?.name}</p>
                <p className="text-slate-600">{jobCard.vehicle?.customer?.phone}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase mb-1">Vehicle</p>
                <p className="font-medium">{jobCard.vehicle?.make} {jobCard.vehicle?.model}</p>
                <p className="text-slate-600 font-mono">{jobCard.vehicle?.licensePlate}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold flex items-center gap-2 mb-4">
              <Wrench className="h-5 w-5 text-indigo-600" /> Items & Parts
            </h3>
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                <tr>
                  <th className="px-4 py-3 rounded-l-lg">Item</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Price</th>
                  <th className="px-4 py-3 text-right rounded-r-lg">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobCard.items?.map((item: any) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">{item.itemType}</span></td>
                    <td className="px-4 py-3 text-right">{Number(item.quantity)}</td>
                    <td className="px-4 py-3 text-right">₹{Number(item.unitPrice).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">₹{Number(item.lineTotal).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Col */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            <h3 className="font-bold mb-4 border-b border-slate-100 pb-2">Lifecycle Management</h3>
            
            <div className="space-y-4">
              {jobCard.status === 'ESTIMATION' || jobCard.status === 'APPROVAL_PENDING' || jobCard.status === 'OPEN' ? (
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                  <label className="block text-xs font-bold text-orange-800 mb-1">Customer Approved Estimate (₹)</label>
                  <input 
                    type="number" 
                    value={approvedEstimate}
                    onChange={(e) => setApprovedEstimate(e.target.value)}
                    className="w-full rounded-lg border-orange-200 px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500"
                  />
                  <button 
                    onClick={() => handleStatusUpdate('WORK_IN_PROGRESS')}
                    disabled={updating}
                    className="w-full mt-3 bg-orange-600 hover:bg-orange-700 text-white font-bold py-2 rounded-lg text-sm transition-colors"
                  >
                    {updating ? 'Updating...' : 'Approve & Start Work'}
                  </button>
                </div>
              ) : null}

              {(jobCard.status === 'WORK_IN_PROGRESS' || jobCard.status === 'IN_PROGRESS') ? (
                <button 
                  onClick={() => handleStatusUpdate('QUALITY_CHECK')}
                  disabled={updating}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                >
                  Send to Quality Check
                </button>
              ) : null}

              {jobCard.status === 'QUALITY_CHECK' ? (
                <button 
                  onClick={() => handleStatusUpdate('READY_FOR_DELIVERY')}
                  disabled={updating}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl text-sm transition-colors"
                >
                  Mark Ready for Delivery
                </button>
              ) : null}

              {jobCard.status === 'READY_FOR_DELIVERY' ? (
                <button 
                  onClick={() => handleStatusUpdate('COMPLETED')}
                  disabled={updating}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
                >
                  <CheckCircle className="h-4 w-4" /> Complete & Deliver Vehicle
                </button>
              ) : null}

              {jobCard.status === 'COMPLETED' || jobCard.status === 'DELIVERED' ? (
                <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm font-medium border border-emerald-100 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-500" />
                  Vehicle Delivered successfully.
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
