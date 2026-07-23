// Set env vars BEFORE imports (babel transforms import.meta.env â†’ process.env)
process.env.VITE_REVENUECAT_ENTITLEMENT_ID = 'premium';
process.env.VITE_REVENUECAT_ANDROID_KEY = 'test_key';
process.env.DEV = '';

jest.mock('../utils/platformUtils', () => ({
  __esModule: true,
  get isCordova() { return global.__TEST_IS_CORDOVA__; },
  onCordovaReady: jest.fn((cb) => cb && cb()),
}));

import {
  buildAppUserId,
  isPurchasesAvailable,
  configure,
  getOfferings,
  purchasePackage,
  restorePurchases,
  logIn,
  logOut,
  hasPremiumEntitlement,
  addCustomerInfoUpdateListener,
} from './revenueCatService';

function mockPurchases(overrides = {}) {
  window.Purchases = {
    configureWith: jest.fn(),
    setLogLevel: jest.fn(),
    LOG_LEVEL: { DEBUG: 'DEBUG' },
    getOfferings: jest.fn((ok) => ok({ current: {} })),
    getCustomerInfo: jest.fn((ok) => ok({ entitlements: { active: {} } })),
    purchasePackage: jest.fn((pkg, ok) => ok({ customerInfo: {}, productIdentifier: 'prod' })),
    restorePurchases: jest.fn((ok) => ok({})),
    logIn: jest.fn((id, ok) => ok({})),
    logOut: jest.fn((ok) => ok({})),
    addCustomerInfoUpdateListener: jest.fn(),
    removeCustomerInfoUpdateListener: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  delete window.Purchases;
  global.__TEST_IS_CORDOVA__ = false;
});

describe('buildAppUserId', () => {
  test('returns null for null/undefined/empty', () => {
    expect(buildAppUserId(null)).toBeNull();
    expect(buildAppUserId(undefined)).toBeNull();
    expect(buildAppUserId('')).toBeNull();
  });

  test('returns prefixed id', () => {
    expect(buildAppUserId('42')).toBe('nutriscan_42');
  });
});

describe('isPurchasesAvailable', () => {
  test('returns false on web', () => {
    expect(isPurchasesAvailable()).toBe(false);
  });

  test('returns true when cordova + Purchases exist', () => {
    global.__TEST_IS_CORDOVA__ = true;
    mockPurchases();
    expect(isPurchasesAvailable()).toBe(true);
  });
});

describe('configure', () => {
  test('resolves null on web', async () => {
    expect(await configure('nutriscan_1')).toBeNull();
  });

  test('configures on cordova', async () => {
    global.__TEST_IS_CORDOVA__ = true;
    mockPurchases();
    const info = await configure('nutriscan_1');
    expect(window.Purchases.configureWith).toHaveBeenCalledWith(
      expect.objectContaining({ appUserID: 'nutriscan_1' })
    );
    expect(info).toEqual({ entitlements: { active: {} } });
  });
});

describe('getOfferings', () => {
  test('resolves null on web', async () => {
    expect(await getOfferings()).toBeNull();
  });

  test('returns offerings on cordova', async () => {
    global.__TEST_IS_CORDOVA__ = true;
    mockPurchases();
    expect(await getOfferings()).toEqual({ current: {} });
  });
});

describe('purchasePackage', () => {
  test('resolves null on web', async () => {
    expect(await purchasePackage({})).toBeNull();
  });

  test('calls plugin on cordova', async () => {
    global.__TEST_IS_CORDOVA__ = true;
    mockPurchases();
    const r = await purchasePackage({ id: 'pkg' });
    expect(r).toEqual({ customerInfo: {}, productIdentifier: 'prod' });
  });
});

describe('restorePurchases', () => {
  test('resolves null on web', async () => {
    expect(await restorePurchases()).toBeNull();
  });

  test('calls plugin on cordova', async () => {
    global.__TEST_IS_CORDOVA__ = true;
    mockPurchases();
    expect(await restorePurchases()).toEqual({});
  });
});

describe('logIn/logOut', () => {
  test('logIn on cordova', async () => {
    global.__TEST_IS_CORDOVA__ = true;
    mockPurchases();
    expect(await logIn('nutriscan_1')).toEqual({});
  });

  test('logOut on cordova', async () => {
    global.__TEST_IS_CORDOVA__ = true;
    mockPurchases();
    expect(await logOut()).toEqual({});
  });
});

describe('hasPremiumEntitlement', () => {
  test('returns false for null', () => {
    expect(hasPremiumEntitlement(null)).toBe(false);
  });

  test('returns false when no matching entitlement', () => {
    expect(hasPremiumEntitlement({ entitlements: { active: {} } })).toBe(false);
  });

  test('returns true when premium active', () => {
    expect(hasPremiumEntitlement({ entitlements: { active: { premium: { isActive: true } } } })).toBe(true);
  });
});

describe('addCustomerInfoUpdateListener', () => {
  test('returns noop on web', () => {
    const unsub = addCustomerInfoUpdateListener(jest.fn());
    expect(typeof unsub).toBe('function');
  });

  test('registers listener on cordova', () => {
    global.__TEST_IS_CORDOVA__ = true;
    mockPurchases();
    const listener = jest.fn();
    const unsub = addCustomerInfoUpdateListener(listener);
    expect(window.Purchases.addCustomerInfoUpdateListener).toHaveBeenCalledWith(listener);
    unsub();
    expect(window.Purchases.removeCustomerInfoUpdateListener).toHaveBeenCalledWith(listener);
  });
});
