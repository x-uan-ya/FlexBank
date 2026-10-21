import { createContext, useContext, useMemo, type ReactNode } from 'react';

import type { DisplayMode, VisualTheme } from '@/types/preferences';

import { buildTheme, defaultTheme, type Theme } from './theme';

/**
 * ThemeProvider derives the active theme from a display mode + visual theme and
 * exposes it via `useTheme()`. Both values normally come from
 * CustomerPreferences (see SessionProvider), so changing either preference
 * re-themes the whole app automatically.
 *
 * This provider is intentionally "dumb": it does not own preference state. The
 * app wires `mode` and `visualTheme` at the root (see src/app/_layout).
 */

const ThemeContext = createContext<Theme>(defaultTheme);

interface ThemeProviderProps {
  mode?: DisplayMode;
  visualTheme?: VisualTheme;
  children: ReactNode;
}

export function ThemeProvider({
  mode = 'standard',
  visualTheme = 'classic',
  children,
}: ThemeProviderProps) {
  const theme = useMemo(() => buildTheme(mode, visualTheme), [mode, visualTheme]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

/** Access the active theme. Use this in every component instead of raw values. */
export function useTheme(): Theme {
  return useContext(ThemeContext);
}
