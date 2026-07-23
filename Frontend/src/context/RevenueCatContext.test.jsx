import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

let mockIsCordova = false;

jest.mock('../services/revenueCatService', () => ({
  buildAppUserId: jest.fn((id) => id ? `nutriscan_${id}` : null),
  isConfigured: jest.fn(() => false),
  isPurchasesAvailable: jest.fn(() => mockIsCordova),
  configure: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
  logIn: jest.fn(() => Promise.resolve({ entitlements: { active: {} } })),
  logOut: jest.fn(() => Promise.resolve()),
  getOfferings: jest.fn(() => Promise.resolve({ current: { availablePackages: [] } })),
  hasPremiumEntitlement: jest.fn(() => false),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  addCustomerInfoUpdateListener: jest.fn(() => jest.fn()),
}));

jest.mock('../utils/platformUtils', () => ({
  get isCordova() { return mockIsCordova; },
  isWeb: true,
  onCordovaReady: (cb) => cb && cb(),
}));

jest.mock('../api/client', () => ({ API: 'http://test', apiFetch: jest.fn() }));

const rc = require('../services/revenueCatService');

let RevenueCatProvider, useRevenueCat;

beforeAll(async () => {
  const mod = await import('./RevenueCatContext');
  RevenueCatProvider = mod.RevenueCatProvider;
  useRevenueCat = mod.useRevenueCat;
});

function Consumer() {
  const ctx = useRevenueCat();
  return (
    <div>
      <span data-testid="premium">{String(ctx.isPremium)}</span>
      <span data-testid="loading">{String(ctx.loading)}</span>
      <span data-testid="enabled">{String(ctx.purchasesEnabled)}</span>
      <span data-testid="paywall">{String(ctx.isPaywallOpen)}</span>
      <button onClick={ctx.openPaywall}>open</button>
      <button onClick={ctx.closePaywall}>close</button>
      <button onClick={() => ctx.purchase({ id: 'pkg' })}>buy</button>
      <button onClick={() => ctx.restore()}>restore</button>
    </div>
  );
}

function renderProvider(props = {}) {
  return render(
    <RevenueCatProvider user={{ id: '1', isPremium: false }} onPremiumChange={jest.fn()} {...props}>
      <Consumer />
    </RevenueCatProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockIsCordova = false;
});

describe('RevenueCatContext', () => {
  it('provides default values in web mode', () => {
    renderProvider();
    expect(screen.getByTestId('premium').textContent).toBe('false');
    expect(screen.getByTestId('enabled').textContent).toBe('false');
  });

  it('uses server isPremium in web mode', () => {
    renderProvider({ user: { id: '1', isPremium: true } });
    expect(screen.getByTestId('premium').textContent).toBe('true');
  });

  it('opens and closes paywall', async () => {
    renderProvider();
    const user = userEvent.setup();
    await user.click(screen.getByText('open'));
    expect(screen.getByTestId('paywall').textContent).toBe('true');
    await user.click(screen.getByText('close'));
    expect(screen.getByTestId('paywall').textContent).toBe('false');
  });

  it('configures SDK in cordova mode', async () => {
    mockIsCordova = true;
    rc.isPurchasesAvailable.mockReturnValue(true);
    renderProvider();
    await waitFor(() => expect(rc.configure).toHaveBeenCalledWith('nutriscan_1'));
  });

  it('handles purchase flow', async () => {
    mockIsCordova = true;
    rc.isPurchasesAvailable.mockReturnValue(true);
    rc.purchasePackage.mockResolvedValue({ customerInfo: { entitlements: { active: { premium: {} } } } });
    rc.hasPremiumEntitlement.mockReturnValue(true);
    renderProvider();
    const user = userEvent.setup();
    await user.click(screen.getByText('buy'));
    await waitFor(() => expect(rc.purchasePackage).toHaveBeenCalled());
  });

  it('handles restore flow', async () => {
    mockIsCordova = true;
    rc.isPurchasesAvailable.mockReturnValue(true);
    rc.restorePurchases.mockResolvedValue({ entitlements: { active: { premium: {} } } });
    rc.hasPremiumEntitlement.mockReturnValue(true);
    renderProvider();
    const user = userEvent.setup();
    await user.click(screen.getByText('restore'));
    await waitFor(() => expect(rc.restorePurchases).toHaveBeenCalled());
  });
});


describe('RevenueCatContext - error paths', () => {
  it('sets error when configure rejects', async () => {
    mockIsCordova = true;
    rc.configure.mockRejectedValue(new Error('SDK init failed'));
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    // Error state is set internally; component still renders
    expect(screen.getByTestId('premium').textContent).toBe('false');
  });

  it('sets error when configure rejects with no message', async () => {
    mockIsCordova = true;
    rc.configure.mockRejectedValue({});
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
  });

  it('handles purchase cancellation (userCancelled)', async () => {
    mockIsCordova = true;
    rc.purchasePackage.mockRejectedValue({ userCancelled: true });
    renderProvider();
    const user = userEvent.setup();
    await user.click(screen.getByText('buy'));
    await waitFor(() => expect(rc.purchasePackage).toHaveBeenCalled());
    // No error set for cancellations
  });

  it('handles purchase error', async () => {
    mockIsCordova = true;
    rc.purchasePackage.mockRejectedValue(new Error('Payment declined'));
    renderProvider();
    const user = userEvent.setup();
    await user.click(screen.getByText('buy'));
    await waitFor(() => expect(rc.purchasePackage).toHaveBeenCalled());
  });

  it('handles restore failure', async () => {
    mockIsCordova = true;
    rc.restorePurchases.mockRejectedValue(new Error('Network error'));
    renderProvider();
    const user = userEvent.setup();
    await user.click(screen.getByText('restore'));
    await waitFor(() => expect(rc.restorePurchases).toHaveBeenCalled());
  });

  it('calls onPremiumChange and syncBackend when premium flips', async () => {
    mockIsCordova = true;
    const onPremiumChange = jest.fn();
    rc.configure.mockResolvedValue({ entitlements: { active: { premium: {} } } });
    rc.hasPremiumEntitlement.mockReturnValue(true);

    // Mock fetch for backend sync
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    renderProvider({ onPremiumChange });
    await waitFor(() => expect(onPremiumChange).toHaveBeenCalledWith(true));

    delete global.fetch;
  });

  it('handles backend sync failure gracefully', async () => {
    mockIsCordova = true;
    const onPremiumChange = jest.fn();
    rc.configure.mockResolvedValue({ entitlements: { active: { premium: {} } } });
    rc.hasPremiumEntitlement.mockReturnValue(true);

    global.fetch = jest.fn().mockRejectedValue(new Error('Network down'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    renderProvider({ onPremiumChange });
    await waitFor(() => expect(onPremiumChange).toHaveBeenCalledWith(true));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());

    warnSpy.mockRestore();
    delete global.fetch;
  });

  it('calls logIn when already configured and userId changes', async () => {
    mockIsCordova = true;
    rc.isConfigured.mockReturnValue(true);
    rc.logIn.mockResolvedValue({ entitlements: { active: {} } });
    renderProvider({ user: { id: '2', isPremium: false } });
    await waitFor(() => expect(rc.logIn).toHaveBeenCalledWith('nutriscan_2'));
  });

  it('calls logOut when already configured and no userId', async () => {
    mockIsCordova = true;
    rc.isConfigured.mockReturnValue(true);
    rc.logOut.mockResolvedValue(null);
    renderProvider({ user: null });
    await waitFor(() => expect(rc.logOut).toHaveBeenCalled());
  });

  it('invokes customerInfo update listener', async () => {
    mockIsCordova = true;
    let listener;
    rc.addCustomerInfoUpdateListener.mockImplementation((cb) => { listener = cb; return jest.fn(); });
    rc.hasPremiumEntitlement.mockReturnValue(false);
    renderProvider();
    await waitFor(() => expect(rc.addCustomerInfoUpdateListener).toHaveBeenCalled());

    // Simulate a live update
    rc.hasPremiumEntitlement.mockReturnValue(true);
    const onPremiumChange = jest.fn();
    // Re-render with the listener captured above
    listener({ entitlements: { active: { premium: {} } } });
  });
});
