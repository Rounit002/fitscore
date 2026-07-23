/**
 * Google Play Billing Service
 * Handles subscription purchases via cordova-plugin-purchase
 * Only active when running inside Cordova (guards with window.cordova check)
 */

// Product IDs (placeholders - replace with real SKUs later)
const PRODUCT_IDS = {
  MONTHLY: 'fitscan_pro_monthly',
  ANNUAL: 'fitscan_pro_annual',
};

let store = null;
let isInitialized = false;
let onSubscriptionActiveCallback = null;

/**
 * Check if we're running inside Cordova
 */
function isCordova() {
  return typeof window !== 'undefined' && window.cordova;
}

/**
 * Initialize the billing service
 * Must be called after deviceready event in Cordova
 */
export async function initBilling() {
  if (!isCordova()) {
    console.log('Not running in Cordova, billing disabled');
    return false;
  }

  if (isInitialized) {
    console.log('Billing already initialized');
    return true;
  }

  try {
    // Access CdvPurchase from the global scope
    const { store: CdvStore, ProductType, Platform } = window.CdvPurchase;
    
    if (!CdvStore) {
      throw new Error('cordova-plugin-purchase not available');
    }

    store = CdvStore;

    // Register subscription products
    store.register([
      {
        id: PRODUCT_IDS.MONTHLY,
        type: ProductType.PAID_SUBSCRIPTION,
        platform: Platform.GOOGLE_PLAY,
      },
      {
        id: PRODUCT_IDS.ANNUAL,
        type: ProductType.PAID_SUBSCRIPTION,
        platform: Platform.GOOGLE_PLAY,
      },
    ]);

    // Set validator URL (backend endpoint)
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
    store.validator = `${API_BASE}/billing/validate`;

    // Listen for approved purchases
    store.when()
      .approved((transaction) => {
        console.log('Purchase approved:', transaction);
        transaction.verify();
      })
      .verified((receipt) => {
        console.log('Purchase verified:', receipt);
        
        // Extract expiry date and call callback
        if (receipt.expiryDate && onSubscriptionActiveCallback) {
          const userId = localStorage.getItem('userId'); // Assuming userId is stored
          onSubscriptionActiveCallback(userId, receipt.expiryDate);
        }
        
        receipt.finish();
      })
      .finished((transaction) => {
        console.log('Purchase finished:', transaction);
      })
      .receiptUpdated((receipt) => {
        console.log('Receipt updated:', receipt);
      });

    // Initialize the store
    await store.initialize([Platform.GOOGLE_PLAY]);

    isInitialized = true;
    console.log('Billing initialized successfully');
    return true;

  } catch (error) {
    console.error('Failed to initialize billing:', error);
    return false;
  }
}

/**
 * Purchase a subscription
 * @param {string} productId - One of PRODUCT_IDS.MONTHLY or PRODUCT_IDS.ANNUAL
 * @returns {Promise<boolean>} - Success or failure
 */
export async function purchaseSubscription(productId) {
  if (!isCordova() || !store || !isInitialized) {
    console.error('Billing not available or not initialized');
    return false;
  }

  try {
    const product = store.get(productId);
    
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    if (!product.canPurchase) {
      throw new Error(`Product ${productId} cannot be purchased`);
    }

    // Attach userId to the purchase for backend validation
    const userId = localStorage.getItem('userId');
    const offer = product.getOffer();
    
    if (!offer) {
      throw new Error('No offer available for this product');
    }

    await offer.order({
      additionalData: {
        userId,
      },
    });

    return true;

  } catch (error) {
    console.error('Purchase failed:', error);
    throw error;
  }
}

/**
 * Restore previous purchases
 * Useful when user reinstalls the app or logs in on a new device
 */
export async function restorePurchases() {
  if (!isCordova() || !store || !isInitialized) {
    console.error('Billing not available or not initialized');
    return false;
  }

  try {
    await store.restorePurchases();
    console.log('Purchases restored successfully');
    return true;
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    return false;
  }
}

/**
 * Get product information (price, title, description)
 * @param {string} productId - Product ID
 * @returns {object|null} - Product info or null
 */
export function getProductInfo(productId) {
  if (!isCordova() || !store || !isInitialized) {
    return null;
  }

  const product = store.get(productId);
  
  if (!product) {
    return null;
  }

  return {
    id: product.id,
    title: product.title,
    description: product.description,
    price: product.pricing?.price || 'N/A',
    currency: product.pricing?.currency || '',
  };
}

/**
 * Set callback for when subscription becomes active
 * @param {Function} callback - Called with (userId, expiryDate)
 */
export function onSubscriptionActive(callback) {
  onSubscriptionActiveCallback = callback;
}

/**
 * Check if user has an active subscription
 * This checks locally cached receipts
 */
export function hasActiveSubscription() {
  if (!isCordova() || !store || !isInitialized) {
    return false;
  }

  const monthlyProduct = store.get(PRODUCT_IDS.MONTHLY);
  const annualProduct = store.get(PRODUCT_IDS.ANNUAL);

  return (monthlyProduct && monthlyProduct.owned) || (annualProduct && annualProduct.owned);
}

export { PRODUCT_IDS };
