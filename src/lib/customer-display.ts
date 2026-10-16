/**
 * Customer-Facing Pole Display & Dual-Screen Broadcast Engine
 * Enables zero-latency local screen synchronization via BroadcastChannel & localStorage fallback.
 */

export interface CustomerDisplayItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface CustomerDisplayPayload {
  storeName: string;
  counterName?: string;
  status: 'IDLE' | 'BILLING' | 'PAYMENT' | 'COMPLETED';
  items: CustomerDisplayItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  totalSavings: number;
  customerName?: string;
  paymentMode?: string;
  upiUri?: string;
  changeReturned?: number;
  promoMessage?: string;
  updatedAt: number;
}

const CHANNEL_NAME = 'zionapos_customer_display';
const STORAGE_KEY = 'zionapos_customer_display_payload';

let broadcastChannel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  if (!broadcastChannel && 'BroadcastChannel' in window) {
    try {
      broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      broadcastChannel = null;
    }
  }
  return broadcastChannel;
}

/**
 * Broadcasts customer display updates to secondary monitor / pole display
 */
export function sendCustomerDisplayUpdate(payload: CustomerDisplayPayload): void {
  if (typeof window === 'undefined') return;

  const data: CustomerDisplayPayload = {
    ...payload,
    updatedAt: Date.now(),
  };

  // 1. Post to BroadcastChannel
  const ch = getChannel();
  if (ch) {
    try {
      ch.postMessage(data);
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }
  }

  // 2. Write to localStorage for cross-window / tab fallback
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    // Ignore quota errors
  }
}

/**
 * Subscribes to live updates on the customer display secondary screen
 */
export function listenCustomerDisplayUpdate(
  callback: (payload: CustomerDisplayPayload) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  // Check initial cached state
  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && parsed.status) {
        callback(parsed);
      }
    }
  } catch {
    // Ignore
  }

  // 1. Listen on BroadcastChannel
  const ch = getChannel();
  const handleBcMessage = (event: MessageEvent) => {
    if (event.data && event.data.status) {
      callback(event.data as CustomerDisplayPayload);
    }
  };

  if (ch) {
    ch.addEventListener('message', handleBcMessage);
  }

  // 2. Listen to storage events as secondary fallback
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        if (parsed && parsed.status) {
          callback(parsed);
        }
      } catch {
        // Ignore
      }
    }
  };

  window.addEventListener('storage', handleStorage);

  return () => {
    if (ch) {
      ch.removeEventListener('message', handleBcMessage);
    }
    window.removeEventListener('storage', handleStorage);
  };
}
