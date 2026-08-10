import '@testing-library/jest-dom';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle, { ThemeModeSelector, useTheme, getThemeMode, resolveTheme } from './ThemeToggle';

jest.mock('lucide-react', () => ({
  Moon: () => <span data-testid="moon-icon" />,
  Sun: () => <span data-testid="sun-icon" />,
  Monitor: () => <span data-testid="monitor-icon" />,
  Check: () => <span data-testid="check-icon" />,
}));

/* matchMedia is not implemented in jsdom, and the theme now genuinely depends on
   it, so it is stubbed per test rather than left undefined. `systemDark` lets a
   test say what the OS is reporting. */
function mockSystemDark(systemDark) {
  const listeners = new Set();
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: query.includes('dark') ? systemDark : false,
    media: query,
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
    dispatchEvent: () => false,
  }));
  return {
    /* Simulates the OS flipping while the app is open. Wrapped in act() because
       this fires a real state update from outside React's event system. */
    emit: (matches) => act(() => listeners.forEach((fn) => fn({ matches }))),
  };
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
  mockSystemDark(false);
});

describe('ThemeToggle', () => {
  it('shows the monitor icon while following the system theme', () => {
    render(<ThemeToggle mode="system" isDark={false} onToggle={() => {}} />);
    expect(screen.getByTestId('monitor-icon')).toBeInTheDocument();
  });

  it('shows the sun icon when explicitly set to light', () => {
    render(<ThemeToggle mode="light" isDark={false} onToggle={() => {}} />);
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
  });

  it('shows the moon icon when explicitly set to dark', () => {
    render(<ThemeToggle mode="dark" isDark onToggle={() => {}} />);
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
  });

  it('names the current mode and the next one for assistive tech', () => {
    render(<ThemeToggle mode="system" isDark={false} onToggle={() => {}} />);
    expect(
      screen.getByRole('button', { name: 'Device default. Switch to Light mode.' })
    ).toBeInTheDocument();
  });

  it('falls back to two-state appearance when no mode is passed', () => {
    render(<ThemeToggle isDark onToggle={() => {}} />);
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
  });

  it('calls onToggle when clicked', async () => {
    const onToggle = jest.fn();
    render(<ThemeToggle mode="system" isDark={false} onToggle={onToggle} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe('ThemeModeSelector', () => {
  it('renders device, dark, and light as accessible icon-only choices', () => {
    render(<ThemeModeSelector mode="system" onChange={() => {}} />);

    const device = screen.getByRole('button', { name: 'Device default' });
    const dark = screen.getByRole('button', { name: 'Dark mode' });
    const light = screen.getByRole('button', { name: 'Light mode' });

    expect(device).toHaveAttribute('aria-pressed', 'true');
    expect(dark).toHaveAttribute('aria-pressed', 'false');
    expect(light).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByTestId('monitor-icon')).toBeInTheDocument();
    expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
    expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
    expect(screen.getByTestId('check-icon')).toBeInTheDocument();
    expect(screen.queryByText('Device default')).not.toBeInTheDocument();
  });

  it('selects a requested theme mode', async () => {
    const onChange = jest.fn();
    render(<ThemeModeSelector mode="system" onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: 'Dark mode' }));
    expect(onChange).toHaveBeenCalledWith('dark');
  });
});

describe('useTheme hook', () => {
  function TestHook() {
    const { isDark, mode, toggle } = useTheme();
    return (
      <div>
        <span data-testid="state">{isDark ? 'dark' : 'light'}</span>
        <span data-testid="mode">{mode}</span>
        <button onClick={toggle}>toggle</button>
      </div>
    );
  }

  it('follows the system theme when nothing is saved', () => {
    mockSystemDark(true);
    render(<TestHook />);
    expect(screen.getByTestId('mode')).toHaveTextContent('system');
    expect(screen.getByTestId('state')).toHaveTextContent('dark');
  });

  it('follows a light system theme when nothing is saved', () => {
    render(<TestHook />);
    expect(screen.getByTestId('mode')).toHaveTextContent('system');
    expect(screen.getByTestId('state')).toHaveTextContent('light');
  });

  it('reads a saved dark preference over the system theme', () => {
    localStorage.setItem('fitscan_theme', 'dark');
    render(<TestHook />);
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(screen.getByTestId('state')).toHaveTextContent('dark');
  });

  it('reads a saved light preference over a dark system theme', () => {
    mockSystemDark(true);
    localStorage.setItem('fitscan_theme', 'light');
    render(<TestHook />);
    expect(screen.getByTestId('state')).toHaveTextContent('light');
  });

  it('cycles system -> light -> dark -> system', async () => {
    render(<TestHook />);
    const button = screen.getByText('toggle');

    expect(screen.getByTestId('mode')).toHaveTextContent('system');

    await userEvent.click(button);
    expect(screen.getByTestId('mode')).toHaveTextContent('light');
    expect(localStorage.getItem('fitscan_theme')).toBe('light');

    await userEvent.click(button);
    expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    expect(localStorage.getItem('fitscan_theme')).toBe('dark');

    /* Back to system, and the stored key is cleared rather than set to a third
       string — "follow the OS" is the same state a fresh install is in. */
    await userEvent.click(button);
    expect(screen.getByTestId('mode')).toHaveTextContent('system');
    expect(localStorage.getItem('fitscan_theme')).toBeNull();
  });

  it('applies the dark class to <html>', () => {
    localStorage.setItem('fitscan_theme', 'dark');
    render(<TestHook />);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('reacts to the OS flipping while open, in system mode', () => {
    const mq = mockSystemDark(false);
    render(<TestHook />);
    expect(screen.getByTestId('state')).toHaveTextContent('light');
    mq.emit(true);
    expect(screen.getByTestId('state')).toHaveTextContent('dark');
  });

  it('ignores the OS flipping when an explicit mode is set', () => {
    const mq = mockSystemDark(false);
    localStorage.setItem('fitscan_theme', 'light');
    render(<TestHook />);
    mq.emit(true);
    expect(screen.getByTestId('state')).toHaveTextContent('light');
  });
});

describe('theme helpers', () => {
  it('treats an unrecognised stored value as system', () => {
    localStorage.setItem('fitscan_theme', 'sepia');
    expect(getThemeMode()).toBe('system');
  });

  it('resolves system against the OS preference', () => {
    mockSystemDark(true);
    expect(resolveTheme('system')).toBe('dark');
    expect(resolveTheme('light')).toBe('light');
  });
});
