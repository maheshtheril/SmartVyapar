'use client';

import React from 'react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { Wifi, WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';

export default function OfflineStatusPill() {
  const { isOnline, pendingCount, isSyncing, syncStatusText, syncPendingInvoices } = useOfflineSync();

  return (
    <div className="flex items-center space-x-2 text-xs font-semibold">
      {!isOnline ? (
        <div className="flex items-center space-x-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 px-3 py-1 text-amber-500 animate-pulse">
          <WifiOff className="h-3.5 w-3.5" />
          <span>Offline Mode</span>
          {pendingCount > 0 && (
            <span className="rounded-full bg-amber-500 text-slate-950 px-1.5 py-0.2 text-[10px] font-bold">
              {pendingCount}
            </span>
          )}
        </div>
      ) : pendingCount > 0 ? (
        <div className="flex items-center space-x-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-indigo-700">
          {isSyncing ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
          ) : (
            <Wifi className="h-3.5 w-3.5 text-emerald-600" />
          )}
          <span>{isSyncing ? 'Syncing...' : `${pendingCount} queued`}</span>
          <button
            type="button"
            disabled={isSyncing}
            onClick={() => syncPendingInvoices()}
            className="ml-1 rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-bold text-white hover:bg-indigo-700 transition disabled:opacity-50 cursor-pointer"
          >
            Sync
          </button>
        </div>
      ) : (
        <div className="hidden sm:flex items-center space-x-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-emerald-700 text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Cloud Sync</span>
        </div>
      )}

      {syncStatusText && (
        <span className="hidden md:inline text-[11px] text-slate-500 italic">
          {syncStatusText}
        </span>
      )}
    </div>
  );
}
