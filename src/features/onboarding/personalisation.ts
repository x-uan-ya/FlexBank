/**
 * Personalisation feature — PUBLIC CONTRACT (Developer A).
 *
 * This file implements the PersonalisationContract with a SIMPLE, deterministic
 * foundation. Dev A replaces the body of `getPersonalisedHomeLayout` with the
 * real algorithm. Keep the signature so the home screen keeps working.
 *
 * SAFETY (principles 3 & 4): personalisation only REORDERS / re-emphasises
 * widgets based on explicit `priorities`. It must never remove access to core
 * banking features. The baseline layout already contains every feature; this
 * stub only moves widgets matching the customer's chosen priorities to the top.
 */

import type { PersonalisationContract } from '@/types/contracts';
import type { CustomerPreferences, Priority } from '@/types/preferences';
import { DEFAULT_HOME_LAYOUT, type HomeWidget, type HomeWidgetType } from '@/types/home';

/** Which widget types each priority tends to surface. Dev A can refine this. */
const PRIORITY_TO_WIDGETS: Record<Priority, HomeWidgetType[]> = {
  payments: ['paynow', 'recentRecipients', 'transfer'],
  moneyManagement: ['accounts', 'spending', 'bills'],
  guidance: ['concierge', 'help'],
  accessibility: ['help', 'concierge'],
};

/**
 * Foundation implementation: stable sort that boosts widgets matching the
 * customer's top priorities, preserving the default order otherwise. Every
 * widget from DEFAULT_HOME_LAYOUT is always present (no feature removed).
 */
function getPersonalisedHomeLayout(preferences: CustomerPreferences): HomeWidget[] {
  // TODO: PERSONALISATION FEATURE — Dev A: replace with the real algorithm.
  const boost = new Map<HomeWidgetType, number>();
  preferences.priorities.forEach((priority, index) => {
    const weight = (preferences.priorities.length - index) * 10;
    PRIORITY_TO_WIDGETS[priority].forEach((type) => {
      boost.set(type, (boost.get(type) ?? 0) + weight);
    });
  });

  const scored = DEFAULT_HOME_LAYOUT.map((widget) => ({
    widget,
    score: widget.priority + (boost.get(widget.type) ?? 0),
  }));

  scored.sort((a, b) => b.score - a.score);

  return scored.map(({ widget }, position) => ({ ...widget, position }));
}

export const personalisation: PersonalisationContract = {
  getPersonalisedHomeLayout,
};
