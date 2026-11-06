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
 * Banking PURPOSE — what the customer mainly uses banking for. This is the
 * PRIMARY driver of home personalisation. Chosen explicitly during
 * registration and editable anytime in Settings. NEVER inferred from age,
 * identity, or behaviour (safety principle 7).
 *
 * Personalisation reorders/surfaces relevant content for these purposes; it
 * never hides or restricts access to any banking feature.
 */
export type BankingPurpose =
  | 'saving'
  | 'fixedDeposits'
  | 'investments'
  | 'everyday'
  | 'managing'
  | 'learning';

export interface BankingPurposeMeta {
  key: BankingPurpose;
  label: string;
  description: string;
  /** Icon name (see components/Icon). */
  icon: string;
  /** Short list of what this purpose surfaces (shown on the card). */
  highlights: string[];
}

export const BANKING_PURPOSES: BankingPurposeMeta[] = [
  {
    key: 'saving',
    label: 'Saving Money',
    description: 'Grow your savings and track goals.',
    icon: 'goal',
    highlights: ['Savings goals', 'Progress tracking', 'Emergency fund'],
  },
  {
    key: 'fixedDeposits',
    label: 'Fixed Deposits',
    description: 'Lock in rates and track maturity.',
    icon: 'accounts',
    highlights: ['Interest rates', 'Tenure & maturity', 'Interest calculator'],
  },
  {
    key: 'investments',
    label: 'Bonds & Investments',
    description: 'Bonds, coupons and your portfolio.',
    icon: 'investments',
    highlights: ['Bond overview', 'Coupon payments', 'Risk explained'],
  },
  {
    key: 'everyday',
    label: 'Everyday Banking',
    description: 'PayNow, transfers and bills.',
    icon: 'paynow',
    highlights: ['PayNow & transfers', 'Bill payments', 'Recent activity'],
  },
  {
    key: 'managing',
    label: 'Managing My Money',
    description: 'Budgets, spending and summaries.',
    icon: 'insights',
    highlights: ['Spending breakdown', 'Monthly budget', 'Expense tracking'],
  },
  {
    key: 'learning',
    label: 'Learning About Financial Products',
    description: 'Plain-language guides and comparisons.',
    icon: 'help',
    highlights: ['Simple explanations', 'Product comparisons', 'Guided learning'],
  },
];

export const BANKING_PURPOSE_LABELS: Record<BankingPurpose, string> =
  BANKING_PURPOSES.reduce(
    (acc, p) => {
      acc[p.key] = p.label;
      return acc;
    },
    {} as Record<BankingPurpose, string>,
  );

export function getPurposeMeta(key: BankingPurpose): BankingPurposeMeta {
  return BANKING_PURPOSES.find((p) => p.key === key)!;
}

/**
 * Optional VISUAL theme (campaign/style skin). This is purely cosmetic: it
 * changes colours and hero artwork only. It MUST NOT change transaction
 * behaviour, account data, or any security decision (see ARCHITECTURE.md).
 *
 * `classic` is the default for the competition demo.
 */
export type VisualTheme = 'classic' | 'nature' | 'playful' | 'seasonal';

export const VISUAL_THEME_LABELS: Record<VisualTheme, string> = {
  classic: 'Classic Banking',
  nature: 'Nature',
  playful: 'Playful',
  seasonal: 'Seasonal',
};

export const VISUAL_THEME_DESCRIPTIONS: Record<VisualTheme, string> = {
  classic: 'Clean white, red and charcoal.',
  nature: 'Soft greens and warm cream.',
  playful: 'Friendly, rounded and cheerful.',
  seasonal: 'Festive campaign accents.',
};

/**
 * The full set of explicit customer preferences.
 */
export interface CustomerPreferences {
  language: Language;
  guidanceLevel: GuidanceLevel;
  displayMode: DisplayMode;
  /**
   * PRIMARY personalisation driver: explicit banking purposes chosen at
   * registration. Ordered; first = most important. Drives the home layout.
   */
  bankingPurposes: BankingPurpose[];
  /**
   * Legacy/derived interest tags. Kept for back-compat with earlier home
   * logic and demo personas. `bankingPurposes` takes precedence.
   */
  priorities: Priority[];
  voiceEnabled: boolean;
  /** Cosmetic visual theme. Never affects banking logic. */
  visualTheme: VisualTheme;
}

/**
 * The neutral "standard" baseline. Reset-to-standard (Dev A) returns here.
 * This is a safe default, NOT an inferred profile.
 */
export const DEFAULT_PREFERENCES: CustomerPreferences = {
  language: 'en',
  guidanceLevel: 'balanced',
  displayMode: 'standard',
  bankingPurposes: ['everyday'],
  priorities: ['payments', 'moneyManagement', 'guidance', 'accessibility'],
  voiceEnabled: false,
  visualTheme: 'classic',
};
