import { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';
type ResolvedTheme = Exclude<Theme, 'system'>;

type ThemeContext = {
  resolvedTheme: ResolvedTheme;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resetTheme: () => void;
};

const DEFAULT_THEME = 'system';
const THEME_STORAGE_KEY = import.meta.env.VITE_THEME_STORAGE_KEY;

const initialState: ThemeContext = {
  resolvedTheme: 'light',
  theme: DEFAULT_THEME,
  setTheme: () => null,
  resetTheme: () => null,
};

const context = createContext<ThemeContext>(initialState);

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);

  if (storedTheme === 'dark' || storedTheme === 'light' || storedTheme === 'system') {
    return storedTheme;
  }

  return DEFAULT_THEME;
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, _setTheme] = useState<Theme>(getStoredTheme);

  const resolvedTheme = useMemo((): ResolvedTheme => {
    if (theme === 'system') {
      return getSystemTheme();
    }
    return theme as ResolvedTheme;
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = (currentResolvedTheme: ResolvedTheme) => {
      root.classList.remove('light', 'dark');
      root.classList.add(currentResolvedTheme);

      if (theme === 'system') {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', theme);
      }

      root.style.colorScheme = currentResolvedTheme;
    };

    const handleChange = () => {
      if (theme === 'system') {
        const systemTheme = mediaQuery.matches ? 'dark' : 'light';
        applyTheme(systemTheme);
      }
    };

    applyTheme(resolvedTheme);

    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, resolvedTheme]);

  const setTheme = (theme: Theme) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    _setTheme(theme);
  };

  const resetTheme = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(THEME_STORAGE_KEY);
    }
    _setTheme(DEFAULT_THEME);
  };

  const contextValue = {
    resolvedTheme,
    resetTheme,
    theme,
    setTheme,
  };

  return <context.Provider value={contextValue}>{children}</context.Provider>;
}

export const useTheme = () => {
  const ctx = useContext(context);

  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');

  return ctx;
};
