/**
 * ZionaPOS Feature Gate — Single source of truth for all tier/plan entitlement checks.
 * Every feature access check in the app must go through these helpers.
 * Never use raw `tenant.subscriptionTier === 'PRO'` comparisons in UI or API code.
 */

export type SubscriptionTier = 'FREE' | 'PRO' | 'ENTERPRISE';
export type RestaurantPlan = 'NONE' | 'STARTER' | 'PRO' | 'CHAIN';

export interface TenantEntitlement {
  subscriptionTier: SubscriptionTier;
  restaurantPlan?: RestaurantPlan | string;
  businessType?: string;
}

// ─── Base Tier Gates ──────────────────────────────────────────────────────────

/** Is the tenant on any paid plan? */
export function isPaidTier(tenant: TenantEntitlement): boolean {
  return tenant.subscriptionTier !== 'FREE';
}

/** Is the tenant on Enterprise? */
export function isEnterprise(tenant: TenantEntitlement): boolean {
  return tenant.subscriptionTier === 'ENTERPRISE';
}

// ─── Restaurant Module Gates ──────────────────────────────────────────────────

/** Can this tenant access the Restaurant & KOT module at all?
 *  FREE restaurant tenants get basic tables + KOT (STARTER level). */
export function canUseRestaurant(tenant: TenantEntitlement): boolean {
  return tenant.businessType === 'RESTAURANT';
}

/** Can use KOT printing + basic floor plan — FREE for RESTAURANT businessType */
export function canUseBasicKOT(tenant: TenantEntitlement): boolean {
  return tenant.businessType === 'RESTAURANT';
}

/** Can use Recipe BOM depletion & ingredient-level inventory (Restaurant PRO or above) */
export function canUseRecipeBOM(tenant: TenantEntitlement): boolean {
  if (!isPaidTier(tenant)) return false;
  const rp = tenant.restaurantPlan || 'NONE';
  return ['PRO', 'CHAIN'].includes(rp);
}

/** Can use multi-section multi-printer KOT routing (Restaurant PRO or above) */
export function canUseMultiPrinterKOT(tenant: TenantEntitlement): boolean {
  const rp = tenant.restaurantPlan || 'NONE';
  return ['PRO', 'CHAIN'].includes(rp);
}

/** Can use Kitchen Display System (KDS) tablet mode — CHAIN only */
export function canUseKDS(tenant: TenantEntitlement): boolean {
  return tenant.restaurantPlan === 'CHAIN';
}

/** Can use Central Menu Management across outlets — CHAIN only */
export function canUseCentralMenu(tenant: TenantEntitlement): boolean {
  return tenant.restaurantPlan === 'CHAIN';
}

/** Can use 3rd-party delivery API integrations (Zomato, Swiggy, ONDC) — CHAIN only */
export function canUseDeliveryAPI(tenant: TenantEntitlement): boolean {
  return tenant.restaurantPlan === 'CHAIN';
}

/** Can use live table occupancy TV dashboard (Restaurant PRO or above) */
export function canUseTVDashboard(tenant: TenantEntitlement): boolean {
  const rp = tenant.restaurantPlan || 'NONE';
  return ['PRO', 'CHAIN'].includes(rp);
}

// ─── General Pro Feature Gates ────────────────────────────────────────────────

/** AI Purchase Bill Scanner (Gemini Vision) — PRO or above */
export function canUseAIScanner(tenant: TenantEntitlement): boolean {
  return isPaidTier(tenant);
}

/** E-Way Bill generation — PRO or above */
export function canUseEWayBill(tenant: TenantEntitlement): boolean {
  return isPaidTier(tenant);
}

/** GSTR-2B ITC Matcher — PRO or above */
export function canUseGSTR2BMatcher(tenant: TenantEntitlement): boolean {
  return isPaidTier(tenant);
}

/** Multi-Warehouse Stock Transfers — PRO or above */
export function canUseMultiWarehouse(tenant: TenantEntitlement): boolean {
  return isPaidTier(tenant);
}

/** Delivery Challans (GST Rule 55) — PRO or above */
export function canUseDeliveryChallans(tenant: TenantEntitlement): boolean {
  return isPaidTier(tenant);
}

/** Unlimited invoices — PRO or above. FREE is capped at 100/month */
export function hasUnlimitedInvoices(tenant: TenantEntitlement): boolean {
  return isPaidTier(tenant);
}

/** Unlimited team users — PRO or above. FREE allows 1 user only */
export function hasUnlimitedUsers(tenant: TenantEntitlement): boolean {
  return isPaidTier(tenant);
}

// ─── Upgrade CTA helpers ──────────────────────────────────────────────────────

export interface UpgradeRequirement {
  required: boolean;
  minTier?: SubscriptionTier;
  minRestaurantPlan?: RestaurantPlan;
  ctaMessage: string;
  upgradeHref: string;
}

/** Returns what the tenant needs to upgrade to in order to unlock a given feature */
export function getUpgradeRequirement(
  featureName: string,
  tenant: TenantEntitlement
): UpgradeRequirement {
  if (!isPaidTier(tenant)) {
    return {
      required: true,
      minTier: 'PRO',
      ctaMessage: `${featureName} requires Ziona POS Pro (₹499/month). Upgrade to unlock.`,
      upgradeHref: '/settings?tab=billing',
    };
  }
  const rp = tenant.restaurantPlan || 'NONE';
  if (rp === 'NONE' && tenant.businessType === 'RESTAURANT') {
    return {
      required: true,
      minRestaurantPlan: 'PRO',
      ctaMessage: `${featureName} requires the Restaurant Pro add-on (₹300/month extra). Upgrade to unlock.`,
      upgradeHref: '/settings?tab=billing',
    };
  }
  return { required: false, ctaMessage: '', upgradeHref: '' };
}
