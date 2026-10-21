/**
 * Customer preferences — EXPLICIT customer choices only.
 *
 * SAFETY PRINCIPLE (critical for this problem statement):
 * These values represent choices the customer deliberately made during
 * onboarding (or later changed in Customize). The system must NEVER infer or
 * auto-detect them from behaviour, demographics, or any sensitive signal.
 * Personalisation changes *presentation/prioritisation* only — never which
 * banking features are available and never security requirements.
 *
 * Owner: Developer A (Personalisation). Shared read access for all.
 */

/** Interface language. Concierge (Dev C) uses this for translation. */
export type Language = 'en' | 'zh' | 'ms' | 'ta';

/** Human-readable labels for languages (for UI rendering). */
export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  zh: 'Mandarin',
  ms: 'Malay',
  ta: 'Tamil',
};

/**
 * How much step-by-step guidance the customer wants.
 * - quick:    minimal prompts, fastest path
 * - balanced: sensible defaults with light guidance
 * - guided:   extra explanations and confidence checkpoints
 */
export type GuidanceLevel = 'quick' | 'balanced' | 'guided';

export const GUIDANCE_LABELS: Record<GuidanceLevel, string> = {
  quick: 'Quick',
  balanced: 'Balanced',
  guided: 'Guided',
};

/**
 * Visual presentation mode. Drives the theme (typography + spacing scaling).
 * - standard:    default sizing
 * - largeText:   larger type and spacing
 * - highClarity: largest type, extra spacing, higher-contrast weights
 */
export type DisplayMode = 'standard' | 'largeText' | 'highClarity';

export const DISPLAY_MODE_LABELS: Record<DisplayMode, string> = {
  standard: 'Standard',
  largeText: 'Large text',
  highClarity: 'High clarity',
};

/**
 * What the customer wants to prioritise on their homepage. This is an ordered
 * list of explicit interests — the Personalisation homepage layout is derived
 * from it. It never removes access to features, only reorders emphasis.
 */
export type Priority =
  | 'payments'
  | 'moneyManagement'
  | 'guidance'
  | 'accessibility';

export const PRIORITY_LABELS: Record<Priority, string> = {
  payments: 'Payments',
  moneyManagement: 'Money management',
  guidance: 'Guidance',
  accessibility: 'Accessibility',
};

/**
 * The full set of explicit customer preferences.
 */
export interface CustomerPreferences {
  language: Language;
  guidanceLevel: GuidanceLevel;
  displayMode: DisplayMode;
  /** Ordered list; first = most important. May be empty before onboarding. */
  priorities: Priority[];
  voiceEnabled: boolean;
}

/**
 * The neutral "standard" baseline. Reset-to-standard (Dev A) returns here.
 * This is a safe default, NOT an inferred profile.
 */
export const DEFAULT_PREFERENCES: CustomerPreferences = {
  language: 'en',
  guidanceLevel: 'balanced',
  displayMode: 'standard',
  priorities: ['payments', 'moneyManagement', 'guidance', 'accessibility'],
  voiceEnabled: false,
};
