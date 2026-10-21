/**
 * FlexBank color palette.
 *
 * Tone: trustworthy, premium, calm, banking-grade. A deep navy primary with a
 * single warm accent. Neutrals are slightly cool to read as "financial".
 *
 * Do NOT hardcode hex values in screens. Always read from `theme.colors`.
 */

export const palette = {
  // Brand
  navy900: '#0B1F3A',
  navy700: '#13315C',
  navy500: '#1E4E8C',
  navy300: '#4A7BB7',

  // Accent (used sparingly for primary actions / highlights)
  teal600: '#0E8C7F',
  teal500: '#13A594',
  teal100: '#D6F2EE',

  // Status
  green600: '#1F8A4C',
  green100: '#E2F3E8',
  amber600: '#B5820B',
  amber100: '#FBF0D4',
  red600: '#C0392B',
  red100: '#FADBD8',

  // Neutrals
  ink900: '#0F1720',
  ink700: '#2B3642',
  ink500: '#566372',
  ink300: '#8A95A3',
  line200: '#E2E7EC',
  line100: '#EEF1F4',
  surface: '#FFFFFF',
  canvas: '#F4F6F9',
  white: '#FFFFFF',
  black: '#000000',
} as const;

/**
 * Semantic color tokens. Screens and components should reference these
 * rather than raw palette entries, so the palette can change without
 * touching feature code.
 */
export const colors = {
  // Backgrounds
  background: palette.canvas,
  surface: palette.surface,
  surfaceMuted: palette.line100,

  // Brand
  primary: palette.navy700,
  primaryStrong: palette.navy900,
  onPrimary: palette.white,

  accent: palette.teal600,
  accentSoft: palette.teal100,
  onAccent: palette.white,

  // Text
  textPrimary: palette.ink900,
  textSecondary: palette.ink500,
  textMuted: palette.ink300,
  textInverse: palette.white,

  // Lines / borders
  border: palette.line200,
  borderStrong: palette.ink300,

  // Status
  success: palette.green600,
  successSoft: palette.green100,
  warning: palette.amber600,
  warningSoft: palette.amber100,
  danger: palette.red600,
  dangerSoft: palette.red100,

  // Interaction
  focusRing: palette.teal500,
  disabled: palette.line200,
  onDisabled: palette.ink300,
} as const;

export type Colors = typeof colors;
