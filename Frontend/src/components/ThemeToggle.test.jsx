import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle, { useTheme } from './ThemeToggle';

jest.mock('lucide-react', () => ({
  Moon: () => <span data-testid="moon-icon" />,
  Sun: () => <span data-testid="sun-icon" />,
}));

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

describe('ThemeToggle', () => {
  it('renders moon icon in light mode', () => {
    render(<ThemeToggle isDark={false} onToggle={() => {}} />);
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to dark mode' })).toBeInTheDocument();
  });

  it('renders sun icon in dark mode', () => {
    render(<ThemeToggle isDark={true} onToggle={() => {}} />);
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();
  });

  it('calls onToggle when clicked', async () => {
    const onToggle = jest.fn();
    render(<ThemeToggle isDark={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe('useTheme hook', () => {
  function TestHook() {
    const { isDark, toggle } = useTheme();
    return (
      <div>
        <span data-testid="state">{isDark ? 'dark' : 'light'}</span>
        <button onClick={toggle}>toggle</button>
      </div>
    );
  }

  it('defaults to light when no saved preference', () => {
    render(<TestHook />);
    expect(screen.getByTestId('state')).toHaveTextContent('light');
  });

  it('reads saved dark preference from localStorage', () => {
    localStorage.setItem('fitscan_theme', 'dark');
    render(<TestHook />);
    expect(screen.getByTestId('state')).toHaveTextContent('dark');
  });

  it('toggles theme and persists to localStorage', async () => {
    render(<TestHook />);
    await userEvent.click(screen.getByText('toggle'));
    expect(screen.getByTestId('state')).toHaveTextContent('dark');
    expect(localStorage.getItem('fitscan_theme')).toBe('dark');
  });
});
