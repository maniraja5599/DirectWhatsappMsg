import { useCallback, useEffect, useState } from 'react';

export type ThemeName = 'light' | 'dark';

export const THEME_KEY = 'wa-direct:theme';

export function resolveTheme(stored: string | null, osPrefersDark: boolean): ThemeName {
  if (stored === 'light' || stored === 'dark') return stored;
  return osPrefersDark ? 'dark' : 'light';
}

export function getSystemDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

export function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
}

/** Manual light/dark theme with localStorage persistence. Defaults to the OS setting. */
export function useTheme(): { theme: ThemeName; toggle: () => void } {
  const [theme, setTheme] = useState<ThemeName>(() => {
    try {
      return resolveTheme(localStorage.getItem(THEME_KEY), getSystemDark());
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // Private mode etc. — theme still applies for this session.
    }
  }, [theme]);

  const toggle = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return { theme, toggle };
}
