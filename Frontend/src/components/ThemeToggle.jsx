import { useCallback, useEffect, useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';

const STORAGE_KEY = 'fitscan_theme';

/* ------------------------------------------------------------------ */
/*  Theme: system / light / dark                                       */
/* ------------------------------------------------------------------ */

/* "System" is a real, selectable state, not just the value used before the user
   touches anything. Previously the only stored values were 'light' and 'dark',
   so the very first tap wrote an explicit preference and there was no way back:
   the app stopped following the OS for the rest of the install, and a user who
   had their phone on an automatic day/night schedule silently lost it.

   Three states, one cycle: system -> light -> dark -> system. */

export const THEME_MODES = ['system', 'light', 'dark'];

/** The user's chosen mode. Anything unrecognised (or absent) means 'system'. */
export function getThemeMode() {
  const saved = localStorage.getItem(STORAGE_KEY);
  return saved === 'dark' || saved === 'light' ? saved : 'system';
}

/** Whether the OS currently reports a dark preference. */
function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

/** Resolves a mode to what actually gets painted: 'light' or 'dark'. */
export function resolveTheme(mode) {
  if (mode === 'light' || mode === 'dark') return mode;
  return systemPrefersDark() ? 'dark' : 'light';
}

/** Apply or remove the .dark class on <html>. */
function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

/**
 * Hook that manages the theme.
 * Returns { isDark, mode, toggle, setMode }.
 *
 * `toggle` cycles system -> light -> dark -> system, so the OS setting is
 * reachable again rather than being a one-way door.
 */
export function useTheme() {
  const [mode, setModeState] = useState(getThemeMode);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  const isDark = mode === 'system' ? systemDark : mode === 'dark';

  useEffect(() => {
    applyTheme(isDark ? 'dark' : 'light');
  }, [isDark]);

  /* Tracked unconditionally rather than only while mode === 'system'. The old
     listener bailed out whenever a preference was stored, which meant switching
     back to 'system' left the app painting whatever the OS happened to be at
     load time until the next reload. */
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return undefined;
    const handler = (event) => setSystemDark(event.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const setMode = useCallback((next) => {
    if (!THEME_MODES.includes(next)) return;
    /* 'system' is stored as the absence of a key, so "follow the OS" is also the
       state a fresh install is in — one code path, not two. */
    if (next === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
  }, []);

  const toggle = useCallback(() => {
    setMode(THEME_MODES[(THEME_MODES.indexOf(mode) + 1) % THEME_MODES.length]);
  }, [mode, setMode]);

  return { isDark, mode, toggle, setMode };
}

/** Icon per mode: what the button currently represents, not what it will do. */
export function themeModeIcon(mode, size = 20) {
  if (mode === 'light') return <Sun size={size} />;
  if (mode === 'dark') return <Moon size={size} />;
  return <Monitor size={size} />;
}

const NEXT_LABEL = { system: 'light', light: 'dark', dark: 'system' };

export function themeModeLabel(mode, t) {
  const label = (key, fallback) => (t ? t(key, fallback) : fallback);
  return {
    system: label('theme_system', 'System theme'),
    light: label('theme_light', 'Light mode'),
    dark: label('theme_dark', 'Dark mode'),
  }[mode];
}

/**
 * Compact icon button for nav bars.
 * Shows the mode it is currently in; tapping advances the cycle.
 */
export default function ThemeToggle({ isDark, onToggle, mode, t, className = '' }) {
  /* `mode` is optional so existing call sites that only pass `isDark` keep
     working; without it the button falls back to two-state appearance. */
  const current = mode ?? (isDark ? 'dark' : 'light');
  const next = NEXT_LABEL[current];
  /* `t` is passed in rather than pulled from useTranslation, so this stays a
     presentational component that renders without an initialised i18n instance
     (which is how its tests and any future storybook-style usage mount it). */
  const label = themeModeLabel(current, t);

  return (
    <button
      type="button"
      className={`theme-toggle-btn ${className}`}
      onClick={onToggle}
      aria-label={`${label}. ${t ? t('switch_to', 'Switch to') : 'Switch to'} ${themeModeLabel(next, t)}.`}
      title={label}
    >
      {themeModeIcon(current)}
    </button>
  );
}
