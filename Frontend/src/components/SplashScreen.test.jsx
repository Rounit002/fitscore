import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import SplashScreen, { BRAND_NAME } from './SplashScreen';

describe('SplashScreen', () => {
  it('shows the bitezsnap wordmark', () => {
    render(<SplashScreen />);
    expect(screen.getByText('bitezsnap')).toBeInTheDocument();
  });

  it('shows the bitezsnap loading copy', () => {
    render(<SplashScreen />);
    expect(screen.getByText('Loading bitezsnap...')).toBeInTheDocument();
  });

  it('carries no trace of the previous brand name', () => {
    const { container } = render(<SplashScreen />);
    expect(container.textContent).not.toMatch(/nutri/i);
  });

  it('exports bitezsnap as the brand name', () => {
    expect(BRAND_NAME).toBe('bitezsnap');
  });

  it('renders the generated brand icon, not an inline glyph', () => {
    const { container } = render(<SplashScreen />);
    const img = container.querySelector('img');
    // Absolute so it resolves on any route in both the web build (origin root)
    // and the Cordova shell (https://localhost/).
    expect(img).toHaveAttribute('src', '/icons/icon-192.png');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('announces itself as a busy status region', () => {
    render(<SplashScreen />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    // The mark is decorative; the visible text carries the meaning, so the img
    // must not be announced twice.
    expect(status.querySelector('img')).toHaveAttribute('alt', '');
  });
});
