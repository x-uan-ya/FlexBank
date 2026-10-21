/**
 * FlexBank design system — public surface.
 *
 * Import everything theme-related from `@/theme`:
 *   import { useTheme, ThemeProvider, type Theme } from '@/theme';
 */

export { ThemeProvider, useTheme } from './ThemeProvider';
export { buildTheme, defaultTheme, type Theme } from './theme';
export { colors, palette, type Colors } from './colors';
export { radius, getSpacing, type Radius, type SpacingKey, type SpacingScale } from './spacing';
export { shadows, type Shadows } from './shadows';
export {
  getTypography,
  type TypographyRole,
  type TypographyScale,
} from './typography';
