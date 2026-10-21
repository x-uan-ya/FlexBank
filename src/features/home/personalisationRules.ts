/**
 * Deterministic home personalisation rules (Developer A).
 *
 * This module is PURE and UI-FREE. It maps EXPLICIT customer preferences to a
 * `HomeConfig` that the home screen reads to decide section order, verbosity,
 * contextual help and emphasis. There is NO AI and NO inference of sensitive
 * characteristics — every rule is transparent and traceable to a choice the
 * customer made.
 *
 * SAFETY: personalisation only changes PRESENTATION and PRIORITISATION. It
 * never removes access to a feature and never changes security behaviour. Every
 * section remains reachable; rules only reorder/emphasise and adjust wording.
 */

import type { CustomerPreferences, Priority } from '@/types/preferences';

/** The ordered content sections the home screen can render. */
export type HomeSection =
  | 'quickActions'
  | 'accounts'
  | 'categories'
  | 'spending'
  | 'goals'
  | 'transactions'
  | 'security';

/** How verbose labels/descriptions should be. */
export type Verbosity = 'concise' | 'standard' | 'detailed';

export interface HomeConfig {
  /** Ordered sections, first = highest on the screen. Always contains all. */
  sectionOrder: HomeSection[];
  verbosity: Verbosity;
  /** Show short contextual explanations under actions/sections. */
  showContextualHelp: boolean;
  /** Add confirmation checkpoints before simulated transactions. */
  showCheckpoints: boolean;
  /** Emphasise money-management content (spending/goals) near the top. */
  emphasiseMoneyManagement: boolean;
  /** Surface a prominent accessibility/settings entry. */
  highlightAccessibility: boolean;
  /** Reduce non-essential explanatory text for speed. */
  minimalChrome: boolean;
}

const BASE_ORDER: HomeSection[] = [
  'quickActions',
  'accounts',
  'categories',
  'transactions',
  'spending',
  'goals',
  'security',
];

/**
 * Move the given sections to the front (preserving their relative order), then
 * append the rest. This guarantees no section is ever dropped.
 */
function promote(order: HomeSection[], front: HomeSection[]): HomeSection[] {
  const set = new Set(front);
  const promoted = front.filter((s) => order.includes(s));
  const rest = order.filter((s) => !set.has(s));
  return [...promoted, ...rest];
}

function hasPriority(prefs: CustomerPreferences, p: Priority): boolean {
  return prefs.priorities.includes(p);
}

/** Priority rank: earlier in the list = more important (0 = top choice). */
function priorityRank(prefs: CustomerPreferences, p: Priority): number {
  const i = prefs.priorities.indexOf(p);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
}

/**
 * Build the deterministic home configuration from explicit preferences.
 */
export function getHomeConfig(prefs: CustomerPreferences): HomeConfig {
  const quick = prefs.guidanceLevel === 'quick';
  const guided = prefs.guidanceLevel === 'guided';

  const config: HomeConfig = {
    sectionOrder: [...BASE_ORDER],
    verbosity: guided ? 'detailed' : quick ? 'concise' : 'standard',
    showContextualHelp: guided || hasPriority(prefs, 'guidance'),
    showCheckpoints: guided || hasPriority(prefs, 'guidance'),
    emphasiseMoneyManagement: hasPriority(prefs, 'moneyManagement'),
    highlightAccessibility:
      hasPriority(prefs, 'accessibility') || prefs.displayMode !== 'standard',
    minimalChrome: quick && !hasPriority(prefs, 'guidance'),
  };

  // --- Ordering rules, applied from lowest to highest precedence so that the
  // customer's TOP priority ends up nearest the top. ---

  // Money management: bring spending + goals up under accounts.
  if (config.emphasiseMoneyManagement) {
    config.sectionOrder = promote(config.sectionOrder, [
      'quickActions',
      'accounts',
      'spending',
      'goals',
    ]);
  }

  // Payments priority (and especially Quick + Payments): quick actions first,
  // accounts right after. Keep it lean.
  if (hasPriority(prefs, 'payments')) {
    config.sectionOrder = promote(config.sectionOrder, ['quickActions', 'accounts']);
  }

  // Guidance priority: keep security/help reminders visible higher up.
  if (hasPriority(prefs, 'guidance')) {
    config.sectionOrder = promote(config.sectionOrder, [
      'quickActions',
      'accounts',
      'security',
    ]);
  }

  // Resolve ties by the customer's explicit priority order: whichever of
  // payments / moneyManagement is ranked first decides whether accounts-centric
  // or spending-centric content leads (after quick actions).
  if (
    hasPriority(prefs, 'moneyManagement') &&
    priorityRank(prefs, 'moneyManagement') < priorityRank(prefs, 'payments')
  ) {
    config.sectionOrder = promote(config.sectionOrder, [
      'quickActions',
      'spending',
      'accounts',
    ]);
  }

  return config;
}

/**
 * Human-readable explanation of why the home screen looks the way it does.
 * Useful for the Settings screen and for transparency (no hidden logic).
 */
export function explainHomeConfig(prefs: CustomerPreferences): string[] {
  const reasons: string[] = [];
  if (prefs.guidanceLevel === 'quick') reasons.push('Quick guidance: fewer steps and less text.');
  if (prefs.guidanceLevel === 'guided')
    reasons.push('Guided: extra explanations and confirmation checkpoints.');
  if (prefs.priorities.includes('payments')) reasons.push('Payments pinned near the top.');
  if (prefs.priorities.includes('moneyManagement'))
    reasons.push('Spending and savings brought forward.');
  if (prefs.priorities.includes('guidance')) reasons.push('Helpful tips kept visible.');
  if (prefs.priorities.includes('accessibility') || prefs.displayMode !== 'standard')
    reasons.push('Accessibility settings highlighted.');
  if (prefs.displayMode === 'largeText') reasons.push('Larger text applied across the app.');
  if (prefs.displayMode === 'highClarity')
    reasons.push('Higher contrast and clearer boundaries applied.');
  return reasons;
}
