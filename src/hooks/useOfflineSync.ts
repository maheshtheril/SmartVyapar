'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getPendingOfflineInvoices,
  updateOfflineInvoiceStatus,
  getPendingInvoiceCount,
  type OfflineInvoiceRecord,
} from '@/lib/offline-db';

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [syncStatusText, setSyncStatusText] = useState<string>('');

  // Refresh pending queue count
  const refreshPendingCount = useCallback(async () => {
    if (typeof window === 'undefined') return;
    try {
      const count = await getPendingInvoiceCount();
      setPendingCount(count);
    } catch {
      // Ignore in non-browser context
    }
  }, []);

  // Sync all pending offline invoices to server
  const syncPendingInvoices = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.onLine) return;

    try {
      setIsSyncing(true);
      setSyncStatusText('Checking offline queue...');
      const pendingInvoices = await getPendingOfflineInvoices();

      if (pendingInvoices.length === 0) {
        setPendingCount(0);
        setIsSyncing(false);
        return;
      }

      let syncedCount = 0;
      let failedCount = 0;

      for (const inv of pendingInvoices) {
        await updateOfflineInvoiceStatus(inv.localId, 'SYNCING');
        setSyncStatusText(`Syncing bill ${inv.offlineInvoiceNumber}...`);

        try {
          const res = await fetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inv.payload),
          });

          const result = await res.json();
          if (!res.ok || !result.success) {
            throw new Error(result.error || `HTTP ${res.status}`);
          }

          // Mark as synced with server details
          await updateOfflineInvoiceStatus(
            inv.localId,
            'SYNCED',
            {
              serverInvoiceId: result.invoice?.id,
              serverInvoiceNumber: result.invoice?.invoiceNumber,
            }
          );
          syncedCount++;
        } catch (err: any) {
          console.error(`Failed to sync invoice ${inv.offlineInvoiceNumber}:`, err);
          await updateOfflineInvoiceStatus(inv.localId, 'FAILED', undefined, err.message);
          failedCount++;
        }
      }

      setLastSyncTime(new Date());
      await refreshPendingCount();

      if (failedCount > 0) {
        setSyncStatusText(`Synced ${syncedCount}, failed ${failedCount}`);
      } else {
        setSyncStatusText(`Successfully synced ${syncedCount} bill(s)`);
      }
    } catch (err: any) {
      console.error('Offline sync routine error:', err);
      setSyncStatusText('Sync interrupted');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusText(''), 5000);
    }
  }, [refreshPendingCount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Set initial online state
    setIsOnline(navigator.onLine);
    refreshPendingCount();

    const handleOnline = () => {
      setIsOnline(true);
      // Auto-trigger sync when returning online
      syncPendingInvoices();
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshPendingCount();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 30s
    const interval = setInterval(() => {
      refreshPendingCount();
      if (navigator.onLine) {
        syncPendingInvoices();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [refreshPendingCount, syncPendingInvoices]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncTime,
    syncStatusText,
    syncPendingInvoices,
    refreshPendingCount,
  };
}
