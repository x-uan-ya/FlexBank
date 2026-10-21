import type { TextStyle } from 'react-native';

import type { DisplayMode } from '@/types/preferences';

/**
 * Typography system.
 *
 * IMPORTANT (Accessibility foundation):
 * Never hardcode `fontSize` in screens. Read a named role from the active
 * theme, e.g. `theme.typography.body`. Because typography is derived from the
 * customer's `displayMode`, the Personalisation / Safety developers can switch
 * the whole app between `standard`, `largeText`, and `highClarity` at runtime
 * and every screen responds automatically.
 */

export type TypographyRole =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'label'
  | 'caption'
  | 'mono';

export type TypographyScale = Record<TypographyRole, TextStyle>;

/**
 * Per-mode scaling. Rather than redefining every role three times, we define a
 * base scale once and apply a multiplier + letter-spacing/weight tweaks per
 * display mode. This keeps roles consistent and easy to extend.
 */
const BASE: Record<TypographyRole, { fontSize: number; lineHeight: number; fontWeight: TextStyle['fontWeight'] }> = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 26, fontWeight: '600' },
  subheading: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, fontWeight: '400' },
  bodyStrong: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  label: { fontSize: 14, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  mono: { fontSize: 16, lineHeight: 22, fontWeight: '500' },
};

interface ModeConfig {
  /** Multiplies every fontSize + lineHeight. */
  scale: number;
  /** Extra letter spacing (helps clarity mode legibility). */
  letterSpacing: number;
  /** Bumps all weights up one step for higher contrast reading. */
  boldenBody: boolean;
}

const MODE_CONFIG: Record<DisplayMode, ModeConfig> = {
  standard: { scale: 1, letterSpacing: 0, boldenBody: false },
  largeText: { scale: 1.2, letterSpacing: 0, boldenBody: false },
  highClarity: { scale: 1.28, letterSpacing: 0.2, boldenBody: true },
};

function bolden(weight: TextStyle['fontWeight']): TextStyle['fontWeight'] {
  switch (weight) {
    case '400':
      return '500';
    case '500':
      return '600';
    case '600':
      return '700';
    default:
      return weight;
  }
}

function buildScale(mode: DisplayMode): TypographyScale {
  const cfg = MODE_CONFIG[mode];
  const roles = Object.keys(BASE) as TypographyRole[];

  return roles.reduce((acc, role) => {
    const base = BASE[role];
    acc[role] = {
      fontSize: Math.round(base.fontSize * cfg.scale),
      lineHeight: Math.round(base.lineHeight * cfg.scale),
      fontWeight: cfg.boldenBody ? bolden(base.fontWeight) : base.fontWeight,
      letterSpacing: cfg.letterSpacing,
      ...(role === 'mono' ? { fontFamily: monoFamily } : null),
    };
    return acc;
  }, {} as TypographyScale);
}

// Platform default monospace is fine for a prototype (masked numbers, amounts).
const monoFamily = 'Courier';

/** Memoised scales so re-renders don't rebuild the objects. */
const CACHE: Partial<Record<DisplayMode, TypographyScale>> = {};

export function getTypography(mode: DisplayMode): TypographyScale {
  if (!CACHE[mode]) {
    CACHE[mode] = buildScale(mode);
  }
  return CACHE[mode]!;
}
