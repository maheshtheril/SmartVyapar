/**
 * SmartVyapar Native IndexedDB Offline Store
 * Zero-dependency client-side database for offline POS resilience.
 */

export interface OfflineInvoiceRecord {
  localId: string;
  offlineInvoiceNumber: string;
  createdAt: string;
  syncStatus: "PENDING" | "SYNCING" | "SYNCED" | "FAILED";
  payload: any;
  receiptData?: any;
  serverInvoiceId?: string;
  serverInvoiceNumber?: string;
  syncError?: string;
}

const DB_NAME = "SmartVyapar_OfflineDB";
const DB_VERSION = 1;

const STORES = {
  PRODUCTS: "cached_products",
  BUSINESS: "cached_business",
  INVOICES: "offline_invoices",
};

/**
 * Opens or upgrades the IndexedDB database.
 */
export function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB is not supported in this environment"));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Products store (keyed by product id)
      if (!db.objectStoreNames.contains(STORES.PRODUCTS)) {
        db.createObjectStore(STORES.PRODUCTS, { keyPath: "id" });
      }

      // Business Profile store (keyed by single id "profile")
      if (!db.objectStoreNames.contains(STORES.BUSINESS)) {
        db.createObjectStore(STORES.BUSINESS, { keyPath: "id" });
      }

      // Offline Invoices outbox store (keyed by localId)
      if (!db.objectStoreNames.contains(STORES.INVOICES)) {
        const store = db.createObjectStore(STORES.INVOICES, { keyPath: "localId" });
        store.createIndex("syncStatus", "syncStatus", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Caches products locally for offline search and barcode lookup.
 */
export async function cacheProductsLocally(products: any[]): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORES.PRODUCTS, "readwrite");
    const store = tx.objectStore(STORES.PRODUCTS);

    for (const prod of products) {
      store.put(prod);
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("Failed to cache products in IndexedDB:", err);
  }
}

/**
 * Retrieves cached catalog from IndexedDB when offline.
 */
export async function getCachedProducts(): Promise<any[]> {
  if (typeof window === "undefined") return [];
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORES.PRODUCTS, "readonly");
    const store = tx.objectStore(STORES.PRODUCTS);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Caches business profile locally.
 */
export async function cacheBusinessProfile(profile: any): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORES.BUSINESS, "readwrite");
    const store = tx.objectStore(STORES.BUSINESS);
    store.put({ id: "current_profile", ...profile });
  } catch (err) {
    console.warn("Failed to cache business profile:", err);
  }
}

/**
 * Generates an offline temporary invoice number (e.g. INV-OFFLINE-789012).
 */
export function generateOfflineInvoiceNumber(): string {
  const timestampPart = Date.now().toString().slice(-6);
  const randomSuffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `OFFLINE-${timestampPart}-${randomSuffix}`;
}

/**
 * Enqueues an offline invoice into the outbox.
 */
export async function enqueueOfflineInvoice(
  payload: any,
  receiptData?: any
): Promise<OfflineInvoiceRecord> {
  const db = await openOfflineDb();
  const localId = `off_inv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const offlineInvoiceNumber = generateOfflineInvoiceNumber();

  const record: OfflineInvoiceRecord = {
    localId,
    offlineInvoiceNumber,
    createdAt: new Date().toISOString(),
    syncStatus: "PENDING",
    payload,
    receiptData,
  };

  const tx = db.transaction(STORES.INVOICES, "readwrite");
  const store = tx.objectStore(STORES.INVOICES);
  store.put(record);

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(record);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Returns all invoices pending cloud synchronization.
 */
export async function getPendingOfflineInvoices(): Promise<OfflineInvoiceRecord[]> {
  if (typeof window === "undefined") return [];
  try {
    const db = await openOfflineDb();
    const tx = db.transaction(STORES.INVOICES, "readonly");
    const store = tx.objectStore(STORES.INVOICES);
    const index = store.index("syncStatus");
    const request = index.getAll("PENDING");

    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

/**
 * Updates an offline invoice's sync status.
 */
export async function updateOfflineInvoiceStatus(
  localId: string,
  status: "PENDING" | "SYNCING" | "SYNCED" | "FAILED",
  serverData?: { serverInvoiceId?: string; serverInvoiceNumber?: string },
  syncError?: string
): Promise<void> {
  const db = await openOfflineDb();
  const tx = db.transaction(STORES.INVOICES, "readwrite");
  const store = tx.objectStore(STORES.INVOICES);
  const getReq = store.get(localId);

  return new Promise((resolve, reject) => {
    getReq.onsuccess = () => {
      const record = getReq.result as OfflineInvoiceRecord;
      if (!record) return resolve();

      record.syncStatus = status;
      if (serverData?.serverInvoiceId) record.serverInvoiceId = serverData.serverInvoiceId;
      if (serverData?.serverInvoiceNumber) record.serverInvoiceNumber = serverData.serverInvoiceNumber;
      if (syncError) record.syncError = syncError;

      store.put(record);
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Returns count of unsynchronized offline invoices.
 */
export async function getPendingInvoiceCount(): Promise<number> {
  const pending = await getPendingOfflineInvoices();
  return pending.length;
}
