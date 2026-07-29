/**
 * RevenueCatProvider â€” app-wide subscription state for the Android (Cordova) build.
 *
 * Responsibilities:
 *   - configure / logIn / logOut the SDK as the logged-in user changes,
 *   - expose `isPremium`, offerings, and `purchase` / `restore` actions,
 *   - keep a live entitlement via the CustomerInfo update listener,
 *   - notify the host app (`onPremiumChange`) and our backend when premium flips,
 *   - own the global paywall modal open/close state.
 *
 * On the web build everything degrades to safe no-ops; `isPremium` falls back to
 * the server-provided `user.isPremium` (Razorpay path is unaffected).
 */

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { API } from '../api/client';
import { isCordova } from '../utils/platformUtils';
import * as rc from '../services/revenueCatService';

const RevenueCatContext = createContext(null);

export function RevenueCatProvider({ user, onPremiumChange, children }) {
  const userId = user?.id ?? null;
  const serverPremium = Boolean(user?.isPremium);

  const [rcPremium, setRcPremium] = useState(false);
  const [offerings, setOfferings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [error, setError] = useState(null);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  // Avoid re-firing onPremiumChange / backend sync for an unchanged value.
  const lastSyncedPremium = useRef(serverPremium);

  // Premium if EITHER RevenueCat grants the entitlement OR the server says so.
  const isPremium = rcPremium || serverPremium;

  // ---- backend + host notification ---------------------------------------

  const syncBackend = useCallback(
    async (customerInfo) => {
      if (!userId) return;
      try {
        await fetch(`${API}/api/subscriptions/revenuecat/sync`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          // CustomerInfo is intentionally not trusted or sent. The backend
          // re-fetches the entitlement from RevenueCat using its secret key.
          body: JSON.stringify({ appUserId: rc.buildAppUserId(userId) }),
        });
      } catch (err) {
        // Non-fatal: the entitlement already unlocked client-side.
        console.warn('[RevenueCat] backend sync failed:', err);
      }
    },
    [userId],
  );

  const applyCustomerInfo = useCallback(
    (customerInfo, { sync = true } = {}) => {
      const premium = rc.hasPremiumEntitlement(customerInfo);
      setRcPremium(premium);

      if (premium !== lastSyncedPremium.current) {
        lastSyncedPremium.current = premium;
        if (typeof onPremiumChange === 'function') onPremiumChange(premium);
        if (sync && premium) syncBackend(customerInfo);
      }
      return premium;
    },
    [onPremiumChange, syncBackend],
  );

  // ---- configure / identity lifecycle ------------------------------------

  useEffect(() => {
    if (!isCordova) return undefined;

    let cancelled = false;

    async function setup() {
      setLoading(true);
      try {
        const appUserId = rc.buildAppUserId(userId);

        // Configure once; on subsequent user changes just re-identify.
        let info;
        if (!rc.isConfigured()) {
          info = await rc.configure(appUserId);
        } else if (appUserId) {
          info = await rc.logIn(appUserId);
        } else {
          info = await rc.logOut();
        }

        if (cancelled) return;
        if (info) applyCustomerInfo(info);

        const offs = await rc.getOfferings();
        if (!cancelled && offs) setOfferings(offs);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to initialise purchases');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    setup();

    // Live updates: renewals, billing recovery, cross-device purchases.
    const unsubscribe = rc.addCustomerInfoUpdateListener((info) =>
      applyCustomerInfo(info),
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [userId, applyCustomerInfo]);

  // Keep the sync baseline aligned when the server value changes externally.
  useEffect(() => {
    lastSyncedPremium.current = isPremium;
  }, [isPremium]);

  // ---- actions ------------------------------------------------------------

  const purchase = useCallback(
    async (aPackage) => {
      setError(null);
      setPurchasing(true);
      try {
        const result = await rc.purchasePackage(aPackage);
        const premium = applyCustomerInfo(result?.customerInfo);
        if (premium) setIsPaywallOpen(false);
        return { success: premium };
      } catch (err) {
        // RevenueCat sets userCancelled on deliberate dismissals.
        if (err && err.userCancelled) return { success: false, cancelled: true };
        setError(err?.message || 'Purchase failed');
        return { success: false, error: err };
      } finally {
        setPurchasing(false);
      }
    },
    [applyCustomerInfo],
  );

  const restore = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const info = await rc.restorePurchases();
      const premium = applyCustomerInfo(info);
      if (premium) setIsPaywallOpen(false);
      return { success: premium };
    } catch (err) {
      setError(err?.message || 'Restore failed');
      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, [applyCustomerInfo]);

  const openPaywall = useCallback(() => setIsPaywallOpen(true), []);
  const closePaywall = useCallback(() => setIsPaywallOpen(false), []);

  const value = useMemo(
    () => ({
      isPremium,
      rcPremium,
      offerings,
      loading,
      purchasing,
      error,
      isPaywallOpen,
      openPaywall,
      closePaywall,
      purchase,
      restore,
      // True only when native purchases can actually run.
      purchasesEnabled: isCordova,
    }),
    [
      isPremium,
      rcPremium,
      offerings,
      loading,
      purchasing,
      error,
      isPaywallOpen,
      openPaywall,
      closePaywall,
      purchase,
      restore,
    ],
  );

  return (
    <RevenueCatContext.Provider value={value}>
      {children}
    </RevenueCatContext.Provider>
  );
}

export function useRevenueCat() {
  const ctx = useContext(RevenueCatContext);
  if (!ctx) {
    throw new Error('useRevenueCat must be used within a RevenueCatProvider');
  }
  return ctx;
}

/** Convenience hook for the common "am I premium?" check. */
export function usePremium() {
  return useRevenueCat().isPremium;
}
