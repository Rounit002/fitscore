import { useState } from 'react';
import { X, Check, Loader2, Crown } from 'lucide-react';
import { purchaseSubscription, getProductInfo, PRODUCT_IDS } from '../services/billingService';

const PaywallModal = ({ isOpen, onClose, onSubscribed }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPlan, setSelectedPlan] = useState('monthly');

  if (!isOpen) return null;

  const handlePurchase = async (productId) => {
    setLoading(true);
    setError(null);

    try {
      await purchaseSubscription(productId);
      
      // Success - the billingService will trigger onSubscriptionActive callback
      // which should update the app state
      if (onSubscribed) {
        onSubscribed();
      }
      
      // Close modal after a brief delay
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err) {
      console.error('Purchase error:', err);
      setError(err.message || 'Purchase failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'monthly',
      productId: PRODUCT_IDS.MONTHLY,
      name: 'Monthly',
      price: '$4.99',
      period: 'per month',
      features: [
        'Unlimited scans',
        'Advanced nutrition analysis',
        'Personalized recommendations',
        'Ad-free experience',
        'Priority support',
      ],
      popular: false,
    },
    {
      id: 'annual',
      productId: PRODUCT_IDS.ANNUAL,
      name: 'Annual',
      price: '$49.99',
      period: 'per year',
      savings: 'Save 17%',
      features: [
        'Unlimited scans',
        'Advanced nutrition analysis',
        'Personalized recommendations',
        'Ad-free experience',
        'Priority support',
        'Exclusive features',
      ],
      popular: true,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl mx-4">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
          disabled={loading}
        >
          <X className="w-6 h-6 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Header */}
        <div className="text-center pt-12 pb-8 px-6 bg-emerald-50 dark:bg-gray-900">
          <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-ns-primary rounded-full">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Upgrade to Pro
          </h2>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Unlock unlimited scans and premium features to take your nutrition tracking to the next level
          </p>
        </div>

        {/* Plans */}
        <div className="grid md:grid-cols-2 gap-6 p-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-xl border-2 p-6 transition-all cursor-pointer ${
                selectedPlan === plan.id
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg scale-105'
                  : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
              }`}
              onClick={() => setSelectedPlan(plan.id)}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-ns-primary text-white text-sm font-semibold rounded-full">
                  Most Popular
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  {plan.name}
                </h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-gray-900 dark:text-white">
                    {plan.price}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {plan.period}
                  </span>
                </div>
                {plan.savings && (
                  <div className="mt-2 inline-block px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-semibold rounded-full">
                    {plan.savings}
                  </div>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePurchase(plan.productId);
                }}
                disabled={loading}
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all ${
                  selectedPlan === plan.id
                    ? 'bg-ns-primary text-white hover:shadow-lg'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  'Subscribe Now'
                )}
              </button>
            </div>
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-8 mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-center">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-8 pb-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Subscriptions will be charged to your Google Play account. Cancel anytime from your Google Play subscriptions.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PaywallModal;
