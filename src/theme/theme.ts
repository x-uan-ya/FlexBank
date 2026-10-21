import type { DisplayMode, VisualTheme } from '@/types/preferences';

import { getColors, palette, type Colors } from './colors';
import { radius, getSpacing, type Radius, type SpacingScale } from './spacing';
import { shadows, type Shadows } from './shadows';
import { getTypography, type TypographyScale } from './typography';

/**
 * A fully-resolved theme. It combines two independent dimensions:
 *  - `mode` (DisplayMode): accessibility — scales typography/spacing, and in
 *    highClarity strengthens contrast/borders (`clarity === true`).
 *  - `visualTheme` (VisualTheme): cosmetic skin — picks the colour palette.
 *
 * Everything a component needs comes from here, so the UI adapts to both the
 * customer's accessibility preference AND their chosen visual theme without any
 * feature code changing.
 */
export interface Theme {
  mode: DisplayMode;
  visualTheme: VisualTheme;
  /** True when displayMode === 'highClarity'. Components can lean on this. */
  clarity: boolean;
  colors: Colors;
  palette: typeof palette;
  typography: TypographyScale;
  spacing: SpacingScale;
  radius: Radius;
  shadows: Shadows;
}

const CACHE: Partial<Record<string, Theme>> = {};

/**
 * Build (and memoise) a theme for a display mode + visual theme. Typography and
 * spacing scale with the display mode; colours come from the visual theme (with
 * clarity adjustments baked in by getColors).
 */
export function buildTheme(
  mode: DisplayMode,
  visualTheme: VisualTheme = 'classic',
): Theme {
  const key = `${mode}:${visualTheme}`;
  if (!CACHE[key]) {
    CACHE[key] = {
      mode,
      visualTheme,
      clarity: mode === 'highClarity',
      colors: getColors(visualTheme, mode),
      palette,
      typography: getTypography(mode),
      spacing: getSpacing(mode),
      radius,
      shadows,
    };
  }
  return CACHE[key]!;
}

/** Default theme used before any preference is loaded. */
export const defaultTheme = buildTheme('standard', 'classic');
