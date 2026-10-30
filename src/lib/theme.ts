'use client';

import { useCallback, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

export const THEME_STORAGE_KEY = 'essential_space_theme';

/** Inline script run before paint so the page never flashes the wrong theme. */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_STORAGE_KEY}')||'system';var d=p==='dark'||(p==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var c=document.documentElement.classList;c.remove('light','dark');c.add(d?'dark':'light');}catch(e){}})();`;

function readPreference(): ThemePreference {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    if (v === 'light' || v === 'dark' || v === 'system') return v;
  } catch {
    // storage unavailable
  }
  return 'system';
}

function applyTheme(pref: ThemePreference) {
  const dark =
    pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const cl = document.documentElement.classList;
  cl.remove('light', 'dark');
  cl.add(dark ? 'dark' : 'light');
}

export function useTheme() {
  // null until mounted, so server and first client render match
  const [theme, setThemeState] = useState<ThemePreference | null>(null);

  useEffect(() => {
    setThemeState(readPreference());
  }, []);

  // Apply and, while on "system", follow OS changes live
  useEffect(() => {
    if (!theme) return;
    applyTheme(theme);
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback((pref: ThemePreference) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, pref);
    } catch {
      // ignore
    }
    setThemeState(pref);
  }, []);

  return { theme: theme ?? 'system', setTheme };
}
