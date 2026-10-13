/**
 * GSTIN utilities (pure, no side effects).
 * Format: 2-digit state code + 10-char PAN + entity number + 'Z' + checksum char.
 */

export const GST_STATE_CODES: Record<string, string> = {
  '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab', '04': 'Chandigarh',
  '05': 'Uttarakhand', '06': 'Haryana', '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
  '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh', '13': 'Nagaland', '14': 'Manipur',
  '15': 'Mizoram', '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam', '19': 'West Bengal',
  '20': 'Jharkhand', '21': 'Odisha', '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
  '26': 'Dadra & Nagar Haveli and Daman & Diu', '27': 'Maharashtra', '29': 'Karnataka', '30': 'Goa',
  '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu', '34': 'Puducherry',
  '35': 'Andaman & Nicobar Islands', '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh',
  '97': 'Other Territory', '99': 'Centre Jurisdiction',
};

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function computeGstinChecksum(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const idx = CHARSET.indexOf(first14[i]);
    if (idx < 0) return '';
    const val = idx * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(val / 36) + (val % 36);
  }
  return CHARSET[(36 - (sum % 36)) % 36];
}

export interface GstinCheck {
  /** true when empty (GSTIN is optional) or fully valid */
  valid: boolean;
  /** true when the user has typed something */
  entered: boolean;
  error?: string;
  stateCode?: string;
  stateName?: string;
}

export function checkGstin(raw: string | null | undefined): GstinCheck {
  const g = (raw || '').trim().toUpperCase();
  if (!g) return { valid: true, entered: false };
  if (g.length !== 15) {
    return { valid: false, entered: true, error: `GSTIN must be 15 characters (${g.length} entered)` };
  }
  if (!GSTIN_REGEX.test(g)) {
    return { valid: false, entered: true, error: 'GSTIN format is invalid' };
  }
  const stateCode = g.substring(0, 2);
  const stateName = GST_STATE_CODES[stateCode];
  if (!stateName) {
    return { valid: false, entered: true, error: `Unknown state code ${stateCode}` };
  }
  if (computeGstinChecksum(g.substring(0, 14)) !== g[14]) {
    return { valid: false, entered: true, error: 'GSTIN checksum failed - please re-check the number' };
  }
  return { valid: true, entered: true, stateCode, stateName };
}

const NOISE_WORDS = new Set([
  'ltd', 'limited', 'pvt', 'private', 'co', 'company', 'corp', 'corporation',
  'inc', 'llp', 'and', 'the', 'traders', 'trading', 'enterprises', 'enterprise',
]);

/** Normalises a supplier name for fuzzy duplicate detection. */
export function normalizeSupplierName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w && !NOISE_WORDS.has(w))
    .join(' ')
    .trim();
}

function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[n];
}

/** True when two supplier names are probably the same business. */
export function isSimilarSupplierName(a: string, b: string): boolean {
  const na = normalizeSupplierName(a);
  const nb = normalizeSupplierName(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length >= 4 && nb.length >= 4 && (na.includes(nb) || nb.includes(na))) return true;
  const maxLen = Math.max(na.length, nb.length);
  return maxLen >= 5 && editDistance(na, nb) / maxLen <= 0.2;
}
