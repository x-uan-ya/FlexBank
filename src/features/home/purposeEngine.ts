/**
 * Purpose-based home personalisation engine (PRIMARY).
 *
 * PURE and UI-FREE. Maps the customer's EXPLICIT banking purposes to an ordered
 * list of home sections, each with a plain-language "why am I seeing this?"
 * explanation. This is the core FlexBank innovation and it is fully
 * deterministic — no AI, no behavioural profiling, no inference from age or
 * identity (safety principle 7).
 *
 * INVARIANTS (never violated):
 * - Every "core" banking section is always present and reachable. Purposes only
 *   REORDER and SURFACE relevant content; they never remove or restrict access.
 * - Security reminders always remain visible.
 * - The engine is explainable: `explanationFor(section)` says which purpose (or
 *   default rule) put it there.
 */

import type { BankingPurpose, CustomerPreferences } from '@/types/preferences';
import { BANKING_PURPOSE_LABELS } from '@/types/preferences';

/** Every home section the app can render. */
export type PurposeSection =
  | 'quickActions'
  | 'accounts'
  | 'savings'
  | 'fixedDeposits'
  | 'bonds'
  | 'everyday'
  | 'managing'
  | 'learning'
  | 'security';

/** Sections always shown regardless of purpose (core access + safety). */
const CORE_SECTIONS: PurposeSection[] = ['quickActions', 'accounts', 'security'];

/** Which sections each purpose surfaces, in priority order. */
const PURPOSE_SECTIONS: Record<BankingPurpose, PurposeSection[]> = {
  saving: ['savings'],
  fixedDeposits: ['fixedDeposits'],
  investments: ['bonds'],
  everyday: ['everyday'],
  managing: ['managing'],
  learning: ['learning'],
};

/** Full catalogue order used to place any section not driven by a purpose. */
const CATALOGUE_ORDER: PurposeSection[] = [
  'quickActions',
  'accounts',
  'savings',
  'fixedDeposits',
  'bonds',
  'everyday',
  'managing',
  'learning',
  'security',
];

export interface PurposeHome {
  /** Ordered sections to render top-to-bottom. Contains every section. */
  sections: PurposeSection[];
  /** section -> "why am I seeing this?" explanation. */
  explanations: Record<PurposeSection, string>;
}

/**
 * Build the ordered home + explanations from the customer's purposes.
 */
export function getPurposeHome(prefs: CustomerPreferences): PurposeHome {
  const purposes = prefs.bankingPurposes;

  // 1. Quick actions always lead (fast access to core banking).
  const ordered: PurposeSection[] = ['quickActions'];
  const explanations = {} as Record<PurposeSection, string>;
  explanations.quickActions = 'Quick access to everyday banking is always kept at the top.';

  // 2. Accounts next — your money at a glance, shown for everyone.
  ordered.push('accounts');
  explanations.accounts = 'Your accounts are always shown so your money is one tap away.';

  // 3. Purpose-driven sections, in the order the customer ranked their purposes.
  purposes.forEach((purpose) => {
    PURPOSE_SECTIONS[purpose].forEach((section) => {
      if (!ordered.includes(section)) {
        ordered.push(section);
        explanations[section] = whyForPurpose(purpose);
      }
    });
  });

  // 4. Any remaining sections (purposes not chosen) still appear, lower down,
  //    so no banking feature is ever hidden. Security sits at the end but is
  //    always present.
  CATALOGUE_ORDER.forEach((section) => {
    if (!ordered.includes(section) && section !== 'security') {
      ordered.push(section);
      explanations[section] = 'Always available — you can use this anytime, even if you didn’t pick it.';
    }
  });

  // 5. Security reminders always remain visible (never removed).
  ordered.push('security');
  explanations.security = 'Security tips are always shown to help keep your money safe.';

  return { sections: ordered, explanations };
}

function whyForPurpose(purpose: BankingPurpose): string {
  const label = BANKING_PURPOSE_LABELS[purpose];
  return `You chose “${label}” during registration, so we placed this near the top of your home.`;
}

/** Is this section one that a purpose elevated (vs. a core/always section)? */
export function isCoreSection(section: PurposeSection): boolean {
  return CORE_SECTIONS.includes(section);
}
