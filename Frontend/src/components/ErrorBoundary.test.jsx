import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from './ErrorBoundary';

jest.mock('lucide-react', () => ({
  RefreshCw: () => <span data-testid="refresh-icon" />,
  Home: () => <span data-testid="home-icon" />,
}));

const ThrowError = ({ shouldThrow }) => {
  if (shouldThrow) throw new Error('Test error');
  return <div>Child content</div>;
};

beforeEach(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => {
  console.error.mockRestore();
});

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(<ErrorBoundary><ThrowError shouldThrow={false} /></ErrorBoundary>);
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('renders default fallback on error', () => {
    render(<ErrorBoundary><ThrowError shouldThrow={true} /></ErrorBoundary>);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('renders custom fallback function', () => {
    const fallback = (error, reset) => <div>Custom: {error.message}<button onClick={reset}>Reset</button></div>;
    render(<ErrorBoundary fallback={fallback}><ThrowError shouldThrow={true} /></ErrorBoundary>);
    expect(screen.getByText('Custom: Test error')).toBeInTheDocument();
  });

  it('resets error state on Try again click', async () => {
    const onReset = jest.fn();
    const { rerender } = render(
      <ErrorBoundary onReset={onReset}><ThrowError shouldThrow={true} /></ErrorBoundary>
    );
    await userEvent.click(screen.getByText('Try again'));
    expect(onReset).toHaveBeenCalled();
  });

  it('has Go to Dashboard button in error state', () => {
    render(<ErrorBoundary><ThrowError shouldThrow={true} /></ErrorBoundary>);
    expect(screen.getByText('Go to Dashboard')).toBeInTheDocument();
  });
});
