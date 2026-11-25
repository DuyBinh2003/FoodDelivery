'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  DEFAULT_THEME_MODE,
  THEME_STORAGE_KEY,
  getNextThemeMode,
  resolveThemeMode,
  type ThemeMode,
} from '@/lib/theme-config';

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (next: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: DEFAULT_THEME_MODE,
  setTheme: () => {},
  toggleTheme: () => {},
});

function applyThemeClass(mode: ThemeMode) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (mode === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(DEFAULT_THEME_MODE);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
      const resolved = resolveThemeMode(saved);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setThemeState(resolved);
      applyThemeClass(resolved);
    } catch (err: unknown) {
      console.warn('[ThemeProvider] Unable to read saved theme:', err);
    }
  }, []);

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next);
    applyThemeClass(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch (err: unknown) {
      console.warn('[ThemeProvider] Unable to persist theme:', err);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = getNextThemeMode(prev);
      applyThemeClass(next);
      try {
        window.localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch (err: unknown) {
        console.warn('[ThemeProvider] Unable to persist theme:', err);
      }
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
