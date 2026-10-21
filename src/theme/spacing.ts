import type { DisplayMode } from '@/types/preferences';

/**
 * Spacing scale (4pt grid).
 *
 * Like typography, spacing is display-mode aware: largeText / highClarity get
 * slightly more breathing room so bigger text does not feel cramped. Always
 * read `theme.spacing.md` rather than writing raw numbers in screens.
 */

export type SpacingKey = 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';

export type SpacingScale = Record<SpacingKey, number>;

const BASE: SpacingScale = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

const SCALE_BY_MODE: Record<DisplayMode, number> = {
  standard: 1,
  largeText: 1.1,
  highClarity: 1.15,
};

const CACHE: Partial<Record<DisplayMode, SpacingScale>> = {};

export function getSpacing(mode: DisplayMode): SpacingScale {
  if (!CACHE[mode]) {
    const factor = SCALE_BY_MODE[mode];
    const keys = Object.keys(BASE) as SpacingKey[];
    CACHE[mode] = keys.reduce((acc, key) => {
      acc[key] = Math.round(BASE[key] * factor);
      return acc;
    }, {} as SpacingScale);
  }
  return CACHE[mode]!;
}

/** Border radius tokens (mode-independent). */
export const radius = {
  none: 0,
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export type Radius = typeof radius;
