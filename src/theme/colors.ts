/**
 * FlexBank colour system.
 *
 * Two independent dimensions drive colour:
 *  1. VISUAL THEME (classic / nature / playful / seasonal) — a cosmetic skin
 *     that picks the brand + hero palette. `classic` is a premium Singapore
 *     banking look: white surfaces, banking red accent, charcoal text.
 *  2. DISPLAY MODE (standard / largeText / highClarity) — accessibility. In
 *     `highClarity` we strengthen borders and contrast.
 *
 * Every theme returns the SAME semantic token shape (`Colors`), so screens and
 * components never change when the palette does. Do NOT hardcode hex values in
 * screens — always read `theme.colors.*`.
 *
 * SAFETY: colour/theme is cosmetic only. It never affects banking logic.
 */

import type { DisplayMode, VisualTheme } from '@/types/preferences';

/** Shared neutral ramp reused across themes. */
const neutral = {
  ink900: '#14181F',
  ink700: '#2B313B',
  ink500: '#5A626E',
  ink300: '#8B93A0',
  line200: '#E6E9EE',
  line100: '#F1F3F6',
  white: '#FFFFFF',
  black: '#000000',
} as const;

/** Status ramp reused across themes (kept stable for trust/consistency). */
const status = {
  success: '#1F8A4C',
  successSoft: '#E4F4EA',
  warning: '#B5820B',
  warningSoft: '#FBF1D6',
  danger: '#C0392B',
  dangerSoft: '#FADBD8',
} as const;

/**
 * Semantic colour tokens. The shape is identical for every visual theme.
 * Extra tokens (hero*, selected*, categoryActive) support the premium home UI.
 */
export interface Colors {
  background: string;
  surface: string;
  surfaceMuted: string;

  primary: string;
  primaryStrong: string;
  onPrimary: string;

  accent: string;
  accentSoft: string;
  onAccent: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  border: string;
  borderStrong: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;

  focusRing: string;
  disabled: string;
  onDisabled: string;

  /** Hero / campaign surface (gradient-free solid used behind greetings). */
  hero: string;
  heroDeep: string;
  onHero: string;
  heroArtTint: string;

  /** Selected / active emphasis used by selectable cards and categories. */
  selectedBg: string;
  selectedBorder: string;
}

/** The brand colours each visual theme contributes. */
interface ThemeBrand {
  background: string;
  surfaceMuted: string;
  primary: string;
  primaryStrong: string;
  accent: string;
  accentSoft: string;
  hero: string;
  heroDeep: string;
  onHero: string;
  heroArtTint: string;
}

const THEME_BRANDS: Record<VisualTheme, ThemeBrand> = {
  // Classic Banking — premium white + banking red + charcoal (demo default).
  classic: {
    background: '#F7F8FA',
    surfaceMuted: '#F1F3F6',
    primary: '#C8102E',
    primaryStrong: '#A00C24',
    accent: '#C8102E',
    accentSoft: '#FBE4E7',
    hero: '#C8102E',
    heroDeep: '#8E0A20',
    onHero: '#FFFFFF',
    heroArtTint: '#F4A9B4',
  },
  // Nature — soft greens and warm cream.
  nature: {
    background: '#F6F7F1',
    surfaceMuted: '#EEF1E6',
    primary: '#2F6E4F',
    primaryStrong: '#234F39',
    accent: '#3E8E62',
    accentSoft: '#DEEEE3',
    hero: '#2F6E4F',
    heroDeep: '#214E39',
    onHero: '#FFFFFF',
    heroArtTint: '#A9D2B9',
  },
  // Playful — friendly, cheerful coral/indigo.
  playful: {
    background: '#FBF7FB',
    surfaceMuted: '#F4EEF6',
    primary: '#6C4BD6',
    primaryStrong: '#523AA6',
    accent: '#FF7A59',
    accentSoft: '#FFE7DF',
    hero: '#6C4BD6',
    heroDeep: '#4E37A0',
    onHero: '#FFFFFF',
    heroArtTint: '#C9BBF2',
  },
  // Seasonal — festive campaign accents (warm amber/berry).
  seasonal: {
    background: '#FBF6F2',
    surfaceMuted: '#F5EBE2',
    primary: '#B23A48',
    primaryStrong: '#8C2B37',
    accent: '#D98324',
    accentSoft: '#FBEBD4',
    hero: '#B23A48',
    heroDeep: '#7F2630',
    onHero: '#FFFFFF',
    heroArtTint: '#E8B6A0',
  },
};

const CACHE: Partial<Record<string, Colors>> = {};

/**
 * Build the semantic colours for a visual theme + display mode. In highClarity
 * we darken borders and text for stronger contrast and clearer boundaries.
 */
export function getColors(visualTheme: VisualTheme, displayMode: DisplayMode): Colors {
  const key = `${visualTheme}:${displayMode}`;
  if (CACHE[key]) return CACHE[key]!;

  const brand = THEME_BRANDS[visualTheme];
  const clarity = displayMode === 'highClarity';

  const colors: Colors = {
    background: brand.background,
    surface: neutral.white,
    surfaceMuted: brand.surfaceMuted,

    primary: brand.primary,
    primaryStrong: brand.primaryStrong,
    onPrimary: neutral.white,

    accent: brand.accent,
    accentSoft: brand.accentSoft,
    onAccent: neutral.white,

    textPrimary: clarity ? neutral.black : neutral.ink900,
    textSecondary: clarity ? neutral.ink700 : neutral.ink500,
    textMuted: clarity ? neutral.ink500 : neutral.ink300,
    textInverse: neutral.white,

    // Stronger, darker borders in high clarity for clearer boundaries.
    border: clarity ? neutral.ink300 : neutral.line200,
    borderStrong: clarity ? neutral.ink700 : neutral.ink300,

    ...status,

    focusRing: brand.accent,
    disabled: neutral.line200,
    onDisabled: neutral.ink300,

    hero: brand.hero,
    heroDeep: brand.heroDeep,
    onHero: brand.onHero,
    heroArtTint: brand.heroArtTint,

    selectedBg: brand.accentSoft,
    selectedBorder: brand.primary,
  };

  CACHE[key] = colors;
  return colors;
}

/**
 * Back-compat: a default `colors` object (classic + standard) so any code that
 * imported the old static export keeps working.
 */
export const colors = getColors('classic', 'standard');

/** Legacy palette alias (kept so existing imports do not break). */
export const palette = {
  ...neutral,
  navy900: '#0B1F3A',
  navy700: '#13315C',
  red600: '#C8102E',
} as const;
