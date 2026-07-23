/**
 * Paywall â€” global premium modal.
 *
 * Rendered once near the app root. Visibility is driven entirely by
 * RevenueCatContext (`isPaywallOpen` / `closePaywall`), so any component can
 * trigger it with `useRevenueCat().openPaywall()`.
 */

import { Dialog, DialogBackdrop, DialogPanel } from '@headlessui/react';
import { X } from 'lucide-react';
import { useRevenueCat } from '../context/RevenueCatContext';
import PaywallContent from './PaywallContent';

export default function Paywall() {
  const { isPaywallOpen, closePaywall, purchasing } = useRevenueCat();

  return (
    <Dialog
      open={isPaywallOpen}
      onClose={() => {
        // Don't let an accidental backdrop tap cancel an in-flight purchase.
        if (!purchasing) closePaywall();
      }}
      className="relative z-[300]"
    >
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 data-[closed]:opacity-0"
      />

      <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <DialogPanel
          transition
          className="relative w-full sm:max-w-md bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white rounded-t-3xl sm:rounded-3xl p-6 pb-8 shadow-2xl max-h-[92vh] overflow-y-auto transition-all duration-200 data-[closed]:translate-y-full sm:data-[closed]:translate-y-4 data-[closed]:opacity-0"
        >
          <button
            type="button"
            onClick={() => !purchasing && closePaywall()}
            aria-label="Close"
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors disabled:opacity-40"
            disabled={purchasing}
          >
            <X className="w-5 h-5" />
          </button>

          <PaywallContent onClose={closePaywall} />
        </DialogPanel>
      </div>
    </Dialog>
  );
}
