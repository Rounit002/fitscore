/**
 * PaywallContent — the inner UI of the premium paywall.
 *
 * Renders the live RevenueCat offering (packages, localized prices) and drives
 * purchase / restore through RevenueCatContext. Kept separate from the modal
 * shell so it can also be embedded inline (e.g. on the Profile upgrade screen).
 */

import { useMemo, useState } from 'react';
import { Check, Loader2, Crown, AlertCircle } from 'lucide-react';
import { useRevenueCat } from '../context/RevenueCatContext';

const PREMIUM_FEATURES = [
  'Unlimited scans',
  'Advanced nutrition analysis',
  'Personalized recommendations',
  'Ad-free experience',
  'Priority support',
];

// Friendly label + ordering hints by RevenueCat packageType.
const PACKAGE_META = {
  ANNUAL: { label: 'Annual', badge: 'Best value', order: 0 },
  SIX_MONTH: { label: '6 Months', order: 1 },
  THREE_MONTH: { label: '3 Months', order: 2 },
  TWO_MONTH: { label: '2 Months', order: 3 },
  MONTHLY: { label: 'Monthly', order: 4 },
  WEEKLY: { label: 'Weekly', order: 5 },
  LIFETIME: { label: 'Lifetime', badge: 'One-time', order: -1 },
};

function metaFor(pkg) {
  return PACKAGE_META[pkg?.packageType] || { label: pkg?.product?.title || 'Premium', order: 99 };
}

export default function PaywallContent({ onClose }) {
  const { offerings, purchase, restore, purchasing, loading, error, purchasesEnabled } =
    useRevenueCat();

  const availablePackages = offerings?.current?.availablePackages;
  const packages = useMemo(() => {
    const list = availablePackages ?? [];
    return [...list].sort((a, b) => metaFor(a).order - metaFor(b).order);
  }, [availablePackages]);

  // Default-select the first (best-value) package.
  const [selectedId, setSelectedId] = useState(null);
  const selected =
    packages.find((p) => p.identifier === selectedId) ?? packages[0] ?? null;

  const handleSubscribe = async () => {
    if (!selected) return;
    const { success } = await purchase(selected);
    if (success && typeof onClose === 'function') onClose();
  };

  const handleRestore = async () => {
    const { success } = await restore();
    if (success && typeof onClose === 'function') onClose();
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-2">
        <div className="w-14 h-14 rounded-2xl bg-amber-400 flex items-center justify-center shadow-lg">
          <Crown className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-2xl font-black tracking-tight">bitezsnap Premium</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
          Unlock unlimited scans and the full nutrition toolkit.
        </p>
      </div>

      {/* Feature list */}
      <ul className="grid gap-2.5">
        {PREMIUM_FEATURES.map((feature) => (
          <li key={feature} className="flex items-center gap-3 text-sm font-medium">
            <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            </span>
            {feature}
          </li>
        ))}
      </ul>

      {/* Offerings */}
      {!purchasesEnabled ? (
        <div className="rounded-2xl bg-gray-50 dark:bg-white/5 p-4 text-center text-sm text-gray-500">
          In-app purchases are only available in the bitezsnap mobile app.
        </div>
      ) : loading && packages.length === 0 ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : packages.length === 0 ? (
        <div className="rounded-2xl bg-gray-50 dark:bg-white/5 p-4 text-center text-sm text-gray-500">
          No subscription plans are available right now. Please try again later.
        </div>
      ) : (
        <div className="grid gap-3">
          {packages.map((pkg) => {
            const meta = metaFor(pkg);
            const active = selected?.identifier === pkg.identifier;
            return (
              <button
                key={pkg.identifier}
                type="button"
                onClick={() => setSelectedId(pkg.identifier)}
                className={[
                  'relative w-full text-left rounded-2xl border-2 p-4 transition-all',
                  active
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-900/20'
                    : 'border-gray-200 dark:border-white/10 hover:border-gray-300',
                ].join(' ')}
              >
                {meta.badge && (
                  <span className="absolute -top-2.5 right-4 text-[10px] font-black uppercase tracking-widest bg-amber-400 text-black px-2 py-0.5 rounded-full">
                    {meta.badge}
                  </span>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black">{meta.label}</p>
                    {pkg.product?.description && (
                      <p className="text-xs text-gray-500">{pkg.product.description}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-black text-lg">{pkg.product?.priceString}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* CTA */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          disabled={!selected || purchasing || !purchasesEnabled}
          onClick={handleSubscribe}
          className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-black tracking-wide flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
        >
          {purchasing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Processing…
            </>
          ) : (
            'Subscribe'
          )}
        </button>

        <button
          type="button"
          disabled={loading || purchasing || !purchasesEnabled}
          onClick={handleRestore}
          className="w-full h-10 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
        >
          Restore purchases
        </button>
      </div>

      <p className="text-[11px] leading-relaxed text-center text-gray-400">
        Subscriptions renew automatically unless cancelled at least 24 hours before
        the end of the period. Manage or cancel anytime in Google Play.
      </p>
    </div>
  );
}
