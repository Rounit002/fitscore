import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BarcodeScanner from './BarcodeScanner';

const mockClear = jest.fn().mockResolvedValue(undefined);
const mockRender = jest.fn();

jest.mock('html5-qrcode', () => ({
  Html5QrcodeScanner: jest.fn().mockImplementation(() => ({
    render: mockRender,
    clear: mockClear,
  })),
}));

jest.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left" />,
  Barcode: () => <span data-testid="barcode-icon" />,
  ShieldCheck: () => <span data-testid="shield-icon" />,
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('BarcodeScanner', () => {
  it('renders scanner UI elements', () => {
    render(<BarcodeScanner onScan={jest.fn()} onBack={jest.fn()} />);
    expect(screen.getByText('Scanner')).toBeInTheDocument();
    expect(screen.getByText('Barcode Scan')).toBeInTheDocument();
    expect(screen.getByText('Align the code within the frame')).toBeInTheDocument();
    expect(screen.getByText('Powered by bitezsnap AI')).toBeInTheDocument();
  });

  it('initializes Html5QrcodeScanner on mount', () => {
    const { Html5QrcodeScanner } = require('html5-qrcode');
    render(<BarcodeScanner onScan={jest.fn()} onBack={jest.fn()} />);
    expect(Html5QrcodeScanner).toHaveBeenCalledWith('reader', expect.any(Object), false);
    expect(mockRender).toHaveBeenCalled();
  });

  it('calls onScan when barcode is decoded', () => {
    const onScan = jest.fn();
    render(<BarcodeScanner onScan={onScan} onBack={jest.fn()} />);
    const successCallback = mockRender.mock.calls[0][0];
    successCallback('1234567890');
    expect(mockClear).toHaveBeenCalled();
    expect(onScan).toHaveBeenCalledWith('1234567890');
  });

  it('calls onBack when back button clicked', async () => {
    const onBack = jest.fn();
    render(<BarcodeScanner onScan={jest.fn()} onBack={onBack} />);
    await userEvent.click(screen.getByLabelText('Back to scanner'));
    expect(onBack).toHaveBeenCalled();
  });

  it('clears scanner on unmount', () => {
    const { unmount } = render(<BarcodeScanner onScan={jest.fn()} onBack={jest.fn()} />);
    unmount();
    expect(mockClear).toHaveBeenCalled();
  });
});
