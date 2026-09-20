/**
 * SmartVyapar Offline-First POS Engine
 * Powered by browser-native IndexedDB for zero-latency local billing & automatic cloud sync
 */

export interface OfflineBillItem {
  productId: string;
  name: string;
  barcode?: string;
  quantity: number;
  unitPrice: number;
  gstRate: number;
  total: number;
}

export interface OfflineBill {
  offlineId: string;
  createdAt: string;
  customerName: string;
  customerPhone?: string;
  customerGstin?: string;
  items: OfflineBillItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod: "CASH" | "UPI" | "CARD" | "SPLIT" | "CREDIT";
  synced: boolean;
  syncedAt?: string;
  serverInvoiceNumber?: string;
  syncError?: string;
}

const DB_NAME = "SmartVyapar_OfflineDB";
const DB_VERSION = 1;
const STORE_PRODUCTS = "products_cache";
const STORE_BILLS = "offline_bills";

/**
 * Helper to generate an offline statutory bill sequence
 * Format: OFF-YYYYMMDD-XXXX
 */
export function generateOfflineBillId(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `OFF-${y}${m}${d}-${rand}`;
}

/**
 * Validates bill structure before local storage or sync
 */
export function validateOfflineBill(bill: Partial<OfflineBill>): { valid: boolean; error?: string } {
  if (!bill.items || !Array.isArray(bill.items) || bill.items.length === 0) {
    return { valid: false, error: "Offline bill must contain at least one item." };
  }
  if (!bill.totalAmount || Number(bill.totalAmount) <= 0) {
    return { valid: false, error: "Total amount must be greater than zero." };
  }
  return { valid: true };
}

/**
 * Opens IndexedDB connection in browser environment
 */
export function openOfflineDatabase(): Promise<IDBDatabase | null> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e: any) => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PRODUCTS)) {
        db.createObjectStore(STORE_PRODUCTS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_BILLS)) {
        const billStore = db.createObjectStore(STORE_BILLS, { keyPath: "offlineId" });
        billStore.createIndex("synced", "synced", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Caches product catalog locally for fast offline barcode scanning
 */
export async function cacheProductsLocally(products: any[]): Promise<boolean> {
  const db = await openOfflineDatabase();
  if (!db) return false;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PRODUCTS, "readwrite");
    const store = tx.objectStore(STORE_PRODUCTS);
    store.clear(); // refresh cache
    for (const item of products) {
      store.put(item);
    }
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Saves a bill locally when offline or when network call fails
 */
export async function queueOfflineBill(billData: Omit<OfflineBill, "offlineId" | "createdAt" | "synced">): Promise<OfflineBill> {
  const offlineBill: OfflineBill = {
    ...billData,
    offlineId: generateOfflineBillId(),
    createdAt: new Date().toISOString(),
    synced: false,
  };

  const validation = validateOfflineBill(offlineBill);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const db = await openOfflineDatabase();
  if (!db) {
    // If running in environment without IndexedDB (e.g. test runner), store in localStorage fallback
    if (typeof window !== "undefined" && window.localStorage) {
      const existing = JSON.parse(window.localStorage.getItem("smartvyapar_offline_bills") || "[]");
      existing.push(offlineBill);
      window.localStorage.setItem("smartvyapar_offline_bills", JSON.stringify(existing));
    }
    return offlineBill;
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BILLS, "readwrite");
    const store = tx.objectStore(STORE_BILLS);
    const req = store.put(offlineBill);
    req.onsuccess = () => resolve(offlineBill);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Retrieves all un-synced offline bills queued locally
 */
export async function getPendingOfflineBills(): Promise<OfflineBill[]> {
  const db = await openOfflineDatabase();
  if (!db) {
    if (typeof window !== "undefined" && window.localStorage) {
      const local = JSON.parse(window.localStorage.getItem("smartvyapar_offline_bills") || "[]");
      return local.filter((b: OfflineBill) => !b.synced);
    }
    return [];
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BILLS, "readonly");
    const store = tx.objectStore(STORE_BILLS);
    const req = store.getAll();
    req.onsuccess = () => {
      const all: OfflineBill[] = req.result || [];
      resolve(all.filter((b) => !b.synced));
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Synchronizes pending offline bills to cloud ERP API
 */
export async function syncOfflineBillsToCloud(
  syncEndpoint: string = "/api/quick-bill"
): Promise<{ syncedCount: number; errors: Array<{ offlineId: string; error: string }> }> {
  const pending = await getPendingOfflineBills();
  if (pending.length === 0) {
    return { syncedCount: 0, errors: [] };
  }

  let syncedCount = 0;
  const errors: Array<{ offlineId: string; error: string }> = [];

  const db = await openOfflineDatabase();

  for (const bill of pending) {
    try {
      const res = await fetch(syncEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: bill.customerName,
          customerPhone: bill.customerPhone,
          customerGstin: bill.customerGstin,
          paymentMethod: bill.paymentMethod,
          items: bill.items.map((i) => ({
            productId: i.productId,
            name: i.name,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            gstRate: i.gstRate,
          })),
          offlineId: bill.offlineId,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      bill.synced = true;
      bill.syncedAt = new Date().toISOString();
      bill.serverInvoiceNumber = data.invoice?.invoiceNumber || data.invoiceNumber;
      syncedCount++;

      // Update in IndexedDB
      if (db) {
        const tx = db.transaction(STORE_BILLS, "readwrite");
        tx.objectStore(STORE_BILLS).put(bill);
      }
    } catch (err: any) {
      errors.push({ offlineId: bill.offlineId, error: err.message });
    }
  }

  return { syncedCount, errors };
}
