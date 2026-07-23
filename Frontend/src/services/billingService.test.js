let billingService;
let mockStore;

function setupCordovaEnv() {
  const whenChain = { approved: jest.fn().mockReturnThis(), verified: jest.fn().mockReturnThis(), finished: jest.fn().mockReturnThis(), receiptUpdated: jest.fn().mockReturnThis() };
  mockStore = {
    register: jest.fn(),
    when: jest.fn(() => whenChain),
    initialize: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    restorePurchases: jest.fn().mockResolvedValue(undefined),
    validator: null,
  };
  window.cordova = {};
  window.CdvPurchase = {
    store: mockStore,
    ProductType: { PAID_SUBSCRIPTION: 'paid subscription' },
    Platform: { GOOGLE_PLAY: 'android-playstore' },
  };
}

beforeEach(async () => {
  jest.resetModules();
  delete window.cordova;
  delete window.CdvPurchase;
  jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('user123');
  billingService = await import('./billingService.js');
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('initBilling', () => {
  it('returns false when not cordova', async () => {
    expect(await billingService.initBilling()).toBe(false);
  });

  it('returns false when CdvPurchase.store is null', async () => {
    window.cordova = {};
    window.CdvPurchase = { store: null, ProductType: {}, Platform: {} };
    expect(await billingService.initBilling()).toBe(false);
  });

  it('initializes successfully', async () => {
    setupCordovaEnv();
    expect(await billingService.initBilling()).toBe(true);
    expect(mockStore.register).toHaveBeenCalled();
    expect(mockStore.initialize).toHaveBeenCalled();
  });
});

describe('purchaseSubscription', () => {
  it('purchases successfully', async () => {
    setupCordovaEnv();
    await billingService.initBilling();
    const offer = { order: jest.fn().mockResolvedValue(undefined) };
    mockStore.get.mockReturnValue({ canPurchase: true, getOffer: () => offer });
    expect(await billingService.purchaseSubscription(billingService.PRODUCT_IDS.MONTHLY)).toBe(true);
    expect(offer.order).toHaveBeenCalled();
  });

  it('throws when product not found', async () => {
    setupCordovaEnv();
    await billingService.initBilling();
    mockStore.get.mockReturnValue(null);
    await expect(billingService.purchaseSubscription('bad_id')).rejects.toThrow();
  });
});

describe('restorePurchases', () => {
  it('returns false when not initialized', async () => {
    expect(await billingService.restorePurchases()).toBe(false);
  });

  it('restores successfully', async () => {
    setupCordovaEnv();
    await billingService.initBilling();
    expect(await billingService.restorePurchases()).toBe(true);
  });
});

describe('getProductInfo', () => {
  it('returns null when not initialized', () => {
    expect(billingService.getProductInfo('any')).toBeNull();
  });

  it('returns product info', async () => {
    setupCordovaEnv();
    await billingService.initBilling();
    mockStore.get.mockReturnValue({ id: 'p1', title: 'Pro', description: 'Desc', pricing: { price: '$9.99', currency: 'USD' } });
    const info = billingService.getProductInfo(billingService.PRODUCT_IDS.MONTHLY);
    expect(info).toMatchObject({ id: 'p1', title: 'Pro', price: '$9.99' });
  });
});

describe('hasActiveSubscription', () => {
  it('returns false when not initialized', () => {
    expect(billingService.hasActiveSubscription()).toBe(false);
  });

  it('returns true when monthly owned', async () => {
    setupCordovaEnv();
    await billingService.initBilling();
    mockStore.get.mockImplementation((id) => (id === billingService.PRODUCT_IDS.MONTHLY ? { owned: true } : null));
    expect(billingService.hasActiveSubscription()).toBe(true);
  });
});


describe('onSubscriptionActive callback', () => {
  it('invokes callback when verified receipt has expiryDate', async () => {
    setupCordovaEnv();
    const cb = jest.fn();
    billingService.onSubscriptionActive(cb);
    await billingService.initBilling();

    // Get the verified handler from store.when().verified
    const whenChain = mockStore.when();
    const verifiedHandler = whenChain.verified.mock.calls[0][0];

    const receipt = { expiryDate: '2026-12-01', finish: jest.fn() };
    verifiedHandler(receipt);

    expect(cb).toHaveBeenCalledWith('user123', '2026-12-01');
    expect(receipt.finish).toHaveBeenCalled();
  });

  it('does not invoke callback when no expiryDate', async () => {
    setupCordovaEnv();
    const cb = jest.fn();
    billingService.onSubscriptionActive(cb);
    await billingService.initBilling();

    const whenChain = mockStore.when();
    const verifiedHandler = whenChain.verified.mock.calls[0][0];

    const receipt = { finish: jest.fn() };
    verifiedHandler(receipt);

    expect(cb).not.toHaveBeenCalled();
    expect(receipt.finish).toHaveBeenCalled();
  });
});

describe('store.when event handlers', () => {
  it('approved handler calls transaction.verify', async () => {
    setupCordovaEnv();
    await billingService.initBilling();

    const whenChain = mockStore.when();
    const approvedHandler = whenChain.approved.mock.calls[0][0];

    const transaction = { verify: jest.fn() };
    approvedHandler(transaction);
    expect(transaction.verify).toHaveBeenCalled();
  });

  it('finished and receiptUpdated handlers do not throw', async () => {
    setupCordovaEnv();
    await billingService.initBilling();

    const whenChain = mockStore.when();
    const finishedHandler = whenChain.finished.mock.calls[0][0];
    const receiptUpdatedHandler = whenChain.receiptUpdated.mock.calls[0][0];

    expect(() => finishedHandler({ id: 't1' })).not.toThrow();
    expect(() => receiptUpdatedHandler({ id: 'r1' })).not.toThrow();
  });
});

describe('purchaseSubscription - canPurchase false', () => {
  it('throws when canPurchase is false', async () => {
    setupCordovaEnv();
    await billingService.initBilling();
    mockStore.get.mockReturnValue({ canPurchase: false, getOffer: () => ({}) });
    await expect(billingService.purchaseSubscription(billingService.PRODUCT_IDS.MONTHLY)).rejects.toThrow('cannot be purchased');
  });
});

describe('purchaseSubscription - no offer', () => {
  it('throws when getOffer returns null', async () => {
    setupCordovaEnv();
    await billingService.initBilling();
    mockStore.get.mockReturnValue({ canPurchase: true, getOffer: () => null });
    await expect(billingService.purchaseSubscription(billingService.PRODUCT_IDS.MONTHLY)).rejects.toThrow('No offer');
  });
});

describe('initBilling - already initialized', () => {
  it('returns true on second call without re-registering', async () => {
    setupCordovaEnv();
    await billingService.initBilling();
    mockStore.register.mockClear();
    expect(await billingService.initBilling()).toBe(true);
    expect(mockStore.register).not.toHaveBeenCalled();
  });
});

describe('restorePurchases - failure', () => {
  it('returns false when store.restorePurchases rejects', async () => {
    setupCordovaEnv();
    await billingService.initBilling();
    mockStore.restorePurchases.mockRejectedValue(new Error('fail'));
    expect(await billingService.restorePurchases()).toBe(false);
  });
});

describe('getProductInfo - no product', () => {
  it('returns null when product not found', async () => {
    setupCordovaEnv();
    await billingService.initBilling();
    mockStore.get.mockReturnValue(null);
    expect(billingService.getProductInfo('missing')).toBeNull();
  });

  it('returns N/A price when pricing is absent', async () => {
    setupCordovaEnv();
    await billingService.initBilling();
    mockStore.get.mockReturnValue({ id: 'p1', title: 'T', description: 'D' });
    const info = billingService.getProductInfo('p1');
    expect(info.price).toBe('N/A');
    expect(info.currency).toBe('');
  });
});
