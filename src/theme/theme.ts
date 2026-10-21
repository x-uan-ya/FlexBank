import type { DisplayMode } from '@/types/preferences';

import { colors, palette, type Colors } from './colors';
import { radius, getSpacing, type Radius, type SpacingScale } from './spacing';
import { shadows, type Shadows } from './shadows';
import { getTypography, type TypographyScale } from './typography';

/**
 * A fully-resolved theme for a given display mode. Everything a component needs
 * to render should come from here, so the UI can adapt to the customer's
 * accessibility preference without feature code changing.
 */
export interface Theme {
  mode: DisplayMode;
  colors: Colors;
  palette: typeof palette;
  typography: TypographyScale;
  spacing: SpacingScale;
  radius: Radius;
  shadows: Shadows;
}

const CACHE: Partial<Record<DisplayMode, Theme>> = {};

/**
 * Build (and memoise) the theme for a display mode. Colors/radius/shadows are
 * shared across modes today; typography and spacing scale per mode.
 */
export function buildTheme(mode: DisplayMode): Theme {
  if (!CACHE[mode]) {
    CACHE[mode] = {
      mode,
      colors,
      palette,
      typography: getTypography(mode),
      spacing: getSpacing(mode),
      radius,
      shadows,
    };
  }
  return CACHE[mode]!;
}

/** Default theme used before any preference is loaded. */
export const defaultTheme = buildTheme('standard');
