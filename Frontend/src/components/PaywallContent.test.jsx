import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaywallContent from './PaywallContent';

const mockContext = {
  offerings: null,
  purchase: jest.fn(),
  restore: jest.fn(),
  purchasing: false,
  loading: false,
  error: null,
  purchasesEnabled: true,
};

jest.mock('../context/RevenueCatContext', () => ({
  useRevenueCat: () => mockContext,
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockContext.offerings = null;
  mockContext.purchasing = false;
  mockContext.loading = false;
  mockContext.error = null;
  mockContext.purchasesEnabled = true;
});

describe('PaywallContent', () => {
  it('shows web message when purchases not enabled', () => {
    mockContext.purchasesEnabled = false;
    render(<PaywallContent onClose={jest.fn()} />);
    expect(screen.getByText(/mobile app|android app/i)).toBeInTheDocument();
  });

  it('shows loading spinner', () => {
    mockContext.loading = true;
    render(<PaywallContent onClose={jest.fn()} />);
    expect(document.querySelector('[class*="animate"]') || document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows no plans message when empty', () => {
    mockContext.offerings = { current: { availablePackages: [] } };
    render(<PaywallContent onClose={jest.fn()} />);
    expect(screen.getByText(/no.*plan|not available/i)).toBeInTheDocument();
  });

  it('shows packages list', () => {
    mockContext.offerings = {
      current: {
        availablePackages: [
          { identifier: 'monthly', packageType: 'MONTHLY', product: { priceString: '$9.99', title: 'Monthly' } },
        ],
      },
    };
    render(<PaywallContent onClose={jest.fn()} />);
    expect(screen.getByText('$9.99')).toBeInTheDocument();
  });

  it('handles purchase flow', async () => {
    mockContext.offerings = {
      current: {
        availablePackages: [
          { identifier: 'monthly', packageType: 'MONTHLY', product: { priceString: '$9.99' } },
        ],
      },
    };
    mockContext.purchase.mockResolvedValue({ success: true });
    render(<PaywallContent onClose={jest.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /subscribe|upgrade|continue/i }));
    await waitFor(() => expect(mockContext.purchase).toHaveBeenCalled());
  });

  it('handles restore flow', async () => {
    mockContext.offerings = {
      current: { availablePackages: [{ identifier: 'monthly', packageType: 'MONTHLY', product: { priceString: '$9.99' } }] },
    };
    mockContext.restore.mockResolvedValue({ success: true });
    render(<PaywallContent onClose={jest.fn()} />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /restore/i }));
    await waitFor(() => expect(mockContext.restore).toHaveBeenCalled());
  });

  it('displays error', () => {
    mockContext.error = 'Something went wrong';
    mockContext.offerings = { current: { availablePackages: [] } };
    render(<PaywallContent onClose={jest.fn()} />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});
