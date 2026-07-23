import { useCallback, useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'fitscan_theme';

/**
 * Reads the effective theme: 'light' or 'dark'.
 * Priority: localStorage â†’ system preference â†’ light.
 */
function getEffectiveTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'dark' || saved === 'light') return saved;
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

/** Apply or remove the .dark class on <html> */
function applyTheme(theme) {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Hook that manages dark/light theme state.
 * Returns { isDark, toggle }.
 */
export function useTheme() {
  const [isDark, setIsDark] = useState(() => getEffectiveTheme() === 'dark');

  // Apply on mount and whenever isDark changes
  useEffect(() => {
    applyTheme(isDark ? 'dark' : 'light');
  }, [isDark]);

  // Listen for system preference changes (only matters if no saved pref)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;

    const handler = (e) => {
      // Only respond if user hasn't explicitly chosen
      if (!localStorage.getItem(STORAGE_KEY)) {
        setIsDark(e.matches);
      }
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggle = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
      return next;
    });
  }, []);

  return { isDark, toggle };
}

/**
 * Compact icon button for nav bars.
 * Shows a moon icon in light mode, sun icon in dark mode.
 */
export default function ThemeToggle({ isDark, onToggle, className = '' }) {
  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
