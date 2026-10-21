import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { DisplayMode } from '@/types/preferences';

import { buildTheme, defaultTheme, type Theme } from './theme';

/**
 * ThemeProvider derives the active theme from a display mode and exposes it via
 * `useTheme()`. The display mode normally comes from CustomerPreferences
 * (see SessionProvider), so changing the preference re-themes the whole app.
 *
 * This provider is intentionally "dumb": it does not own preference state. The
 * app wires `mode={preferences.displayMode}` at the root (see src/app/_layout).
 */

const ThemeContext = createContext<Theme>(defaultTheme);

interface ThemeProviderProps {
  mode?: DisplayMode;
  children: ReactNode;
}

export function ThemeProvider({ mode = 'standard', children }: ThemeProviderProps) {
  const theme = useMemo(() => buildTheme(mode), [mode]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** Access the active theme. Use this in every component instead of raw values. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
