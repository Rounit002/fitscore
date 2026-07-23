/**
 * Thin promise-based wrapper around `cordova-plugin-purchases` (RevenueCat).
 *
 * The Cordova plugin exposes a global `window.Purchases` whose methods are
 * callback-based. This module:
 *   - promisifies them,
 *   - guards every call so the web build (no plugin) degrades to safe no-ops,
 *   - centralises the entitlement / config constants.
 *
 * Nothing here talks to our own backend â€” that lives in RevenueCatContext.
 */

import { isCordova, onCordovaReady } from '../utils/platformUtils';

// ---- Config ---------------------------------------------------------------

// Entitlement identifier configured in the RevenueCat dashboard.
export const PREMIUM_ENTITLEMENT_ID =
  import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID || 'premium';

// Public Android SDK key (safe to ship in the client).
const ANDROID_API_KEY = import.meta.env.VITE_REVENUECAT_ANDROID_KEY || '';

// `nutriscan_<userId>` keeps RevenueCat's app-user-id aligned with our backend.
export const APP_USER_ID_PREFIX = 'nutriscan_';

export function buildAppUserId(userId) {
  if (userId === undefined || userId === null || userId === '') return null;
  return `${APP_USER_ID_PREFIX}${userId}`;
}

// ---- Internal helpers -----------------------------------------------------

function getPurchases() {
  return typeof window !== 'undefined' ? window.Purchases : undefined;
}

/** True when the native plugin is actually present and usable. */
export function isPurchasesAvailable() {
  return Boolean(isCordova && getPurchases());
}

/**
 * Promisify a plugin method of shape `fn(...args, onSuccess, onError)`.
 * Resolves to `fallback` (default null) when the plugin is unavailable.
 */
function callPlugin(methodName, args = [], fallback = null) {
  return new Promise((resolve, reject) => {
    const Purchases = getPurchases();
    if (!isCordova || !Purchases || typeof Purchases[methodName] !== 'function') {
      resolve(fallback);
      return;
    }
    try {
      Purchases[methodName](...args, resolve, reject);
    } catch (err) {
      reject(err);
    }
  });
}

// ---- Public API -----------------------------------------------------------

let configured = false;

/**
 * Configure the SDK for a given user. Idempotent-ish: safe to call on login
 * and on app resume. Resolves to the initial CustomerInfo (or null on web).
 *
 * @param {string} appUserId  e.g. "nutriscan_42"
 */
export function configure(appUserId) {
  return new Promise((resolve) => {
    if (!isCordova) {
      resolve(null);
      return;
    }

    onCordovaReady(async () => {
      const Purchases = getPurchases();
      if (!Purchases || typeof Purchases.configureWith !== 'function') {
        resolve(null);
        return;
      }

      try {
        // Verbose logs in dev only.
        if (import.meta.env.DEV && typeof Purchases.setLogLevel === 'function' && Purchases.LOG_LEVEL) {
          Purchases.setLogLevel({ level: Purchases.LOG_LEVEL.DEBUG });
        }

        Purchases.configureWith({
          apiKey: ANDROID_API_KEY,
          appUserID: appUserId || null,
        });
        configured = true;

        const info = await getCustomerInfo();
        resolve(info);
      } catch (err) {
        console.warn('[RevenueCat] configure failed:', err);
        resolve(null);
      }
    });
  });
}

export function isConfigured() {
  return configured;
}

/** Fetch current offerings. Returns the offerings object or null. */
export function getOfferings() {
  return callPlugin('getOfferings', [], null);
}

/** Fetch the current CustomerInfo. Returns it or null. */
export function getCustomerInfo() {
  return callPlugin('getCustomerInfo', [], null);
}

/**
 * Purchase a RevenueCat package.
 * @param {object} aPackage  a `Package` from an offering
 * @returns {Promise<{customerInfo: object, productIdentifier: string} | null>}
 */
export function purchasePackage(aPackage) {
  return callPlugin('purchasePackage', [aPackage], null);
}

/** Restore prior purchases. Returns CustomerInfo or null. */
export function restorePurchases() {
  return callPlugin('restorePurchases', [], null);
}

/** Associate the SDK with a backend user id. Returns CustomerInfo or null. */
export function logIn(appUserId) {
  return callPlugin('logIn', [appUserId], null);
}

/** Reset to an anonymous user (call on sign-out). */
export function logOut() {
  return callPlugin('logOut', [], null);
}

/**
 * Subscribe to live CustomerInfo updates (renewals, billing-retry recovery,
 * purchases made on another device). Returns an unsubscribe function.
 *
 * @param {(info: object) => void} listener
 */
export function addCustomerInfoUpdateListener(listener) {
  const Purchases = getPurchases();
  if (!isCordova || !Purchases || typeof Purchases.addCustomerInfoUpdateListener !== 'function') {
    return () => {};
  }
  Purchases.addCustomerInfoUpdateListener(listener);
  return () => {
    if (typeof Purchases.removeCustomerInfoUpdateListener === 'function') {
      Purchases.removeCustomerInfoUpdateListener(listener);
    }
  };
}

/**
 * Determine whether a CustomerInfo grants the premium entitlement.
 * @param {object|null} customerInfo
 */
export function hasPremiumEntitlement(customerInfo) {
  const active = customerInfo?.entitlements?.active;
  if (!active) return false;
  return Boolean(active[PREMIUM_ENTITLEMENT_ID]);
}
