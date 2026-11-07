import { DEFAULT_HOME_LAYOUT, type HomeWidget } from '@/types/home';
import type {
  CustomerPreferences,
  GuidanceLevel,
  Priority,
} from '@/types/preferences';

export interface WidgetRecommendation {
  widgetId: string;
  reason: string;
}

export interface GuidanceModeSuggestion {
  mode: GuidanceLevel;
  reason: string;
}

export interface HomeRecommendation {
  source: 'rules';
  widgetOrder: string[];
  widgets: WidgetRecommendation[];
  guidanceSuggestion?: GuidanceModeSuggestion;
  reasons: string[];
}

export interface HomeRecommendationInput {
  preferences: CustomerPreferences;
  approvedWidgetIds: string[];
  existingLayout?: HomeWidget[];
}

interface WidgetRule {
  widgetId: string;
  boost: number;
  reason: string;
}

const PRIORITY_RULES: Record<Priority, WidgetRule[]> = {
  payments: [
    { widgetId: 'w-paynow', boost: 60, reason: 'PayNow is prioritised because payments are important to you.' },
    { widgetId: 'w-recent', boost: 45, reason: 'Recent recipients support faster repeat payments.' },
    { widgetId: 'w-transfer', boost: 40, reason: 'Transfers are kept close to your payment shortcuts.' },
    { widgetId: 'w-bills', boost: 30, reason: 'Bill payment is included with your payment tools.' },
  ],
  moneyManagement: [
    { widgetId: 'w-accounts', boost: 60, reason: 'Accounts are prioritised for an at-a-glance balance view.' },
    { widgetId: 'w-spending', boost: 50, reason: 'Spending insights support your money-management priority.' },
    { widgetId: 'w-bills', boost: 25, reason: 'Bills are surfaced to help plan regular outgoings.' },
  ],
  guidance: [
    { widgetId: 'w-concierge', boost: 60, reason: 'Banking Concierge is prioritised for plain-language guidance.' },
    { widgetId: 'w-help', boost: 50, reason: 'Help and assistance stays easy to find.' },
  ],
  accessibility: [
    { widgetId: 'w-help', boost: 60, reason: 'Assistance is prioritised from your explicit accessibility preference.' },
    { widgetId: 'w-concierge', boost: 35, reason: 'Plain-language support is kept easy to reach.' },
  ],
};

const VALID_WIDGET_IDS = new Set(DEFAULT_HOME_LAYOUT.map((widget) => widget.id));

/**
 * Pure deterministic recommendation rules based only on explicit preferences.
 * Invalid or unapproved widget IDs are never returned.
 */
export function recommendHomeExperience({
  preferences,
  approvedWidgetIds,
  existingLayout = DEFAULT_HOME_LAYOUT,
}: HomeRecommendationInput): HomeRecommendation {
  const approved = [...new Set(approvedWidgetIds)].filter((id) =>
    VALID_WIDGET_IDS.has(id),
  );
  const existingPosition = new Map(
    [...existingLayout]
      .sort((a, b) => a.position - b.position)
      .map((widget, index) => [widget.id, index]),
  );
  const scores = new Map(approved.map((id) => [id, 0]));
  const reasons = new Map<string, string>();

  preferences.priorities.forEach((priority, index) => {
    const priorityMultiplier = preferences.priorities.length - index;
    PRIORITY_RULES[priority].forEach((rule) => {
      if (!scores.has(rule.widgetId)) return;
      scores.set(
        rule.widgetId,
        (scores.get(rule.widgetId) ?? 0) + rule.boost * priorityMultiplier,
      );
      if (!reasons.has(rule.widgetId)) reasons.set(rule.widgetId, rule.reason);
    });
  });

  if (preferences.guidanceLevel === 'quick') {
    addBoost(scores, 'w-paynow', 12);
    addBoost(scores, 'w-recent', 8);
  } else if (preferences.guidanceLevel === 'guided') {
    addBoost(scores, 'w-concierge', 12);
    addBoost(scores, 'w-help', 10);
  }

  if (preferences.displayMode !== 'standard') {
    addBoost(scores, 'w-help', 8);
    addBoost(scores, 'w-concierge', 4);
  }

  const widgetOrder = [...approved].sort((a, b) => {
    const scoreDifference = (scores.get(b) ?? 0) - (scores.get(a) ?? 0);
    if (scoreDifference !== 0) return scoreDifference;
    const aPosition = existingPosition.get(a) ?? Number.MAX_SAFE_INTEGER;
    const bPosition = existingPosition.get(b) ?? Number.MAX_SAFE_INTEGER;
    if (aPosition !== bPosition) return aPosition - bPosition;
    return a.localeCompare(b);
  });

  const guidanceSuggestion = getGuidanceSuggestion(preferences);
  const topPriorities = preferences.priorities.slice(0, 2);

  return {
    source: 'rules',
    widgetOrder,
    widgets: widgetOrder.map((widgetId) => ({
      widgetId,
      reason:
        reasons.get(widgetId) ??
        'Kept available using your current homepage arrangement.',
    })),
    guidanceSuggestion,
    reasons: topPriorities.map(
      (priority) => `Your ${priorityLabel(priority)} priority influences this order.`,
    ),
  };
}

/** Applies order only; visibility and every other manual widget setting survive. */
export function applyRecommendedWidgetOrder(
  existingLayout: HomeWidget[],
  widgetOrder: string[],
): HomeWidget[] {
  const byId = new Map(existingLayout.map((widget) => [widget.id, widget]));
  const recommended = widgetOrder
    .map((id) => byId.get(id))
    .filter((widget): widget is HomeWidget => widget !== undefined);
  const recommendedIds = new Set(recommended.map((widget) => widget.id));
  const remaining = [...existingLayout]
    .sort((a, b) => a.position - b.position)
    .filter((widget) => !recommendedIds.has(widget.id));

  return [...recommended, ...remaining].map((widget, position) => ({
    ...widget,
    position,
  }));
}

function addBoost(scores: Map<string, number>, widgetId: string, boost: number) {
  if (!scores.has(widgetId)) return;
  scores.set(widgetId, (scores.get(widgetId) ?? 0) + boost);
}

function getGuidanceSuggestion(
  preferences: CustomerPreferences,
): GuidanceModeSuggestion | undefined {
  const firstPriority = preferences.priorities[0];
  if (firstPriority === 'guidance' && preferences.guidanceLevel !== 'guided') {
    return {
      mode: 'guided',
      reason: 'Guided Mode may suit your choice to prioritise explanations.',
    };
  }
  if (firstPriority === 'payments' && preferences.guidanceLevel === 'balanced') {
    return {
      mode: 'quick',
      reason: 'Quick Mode may suit your choice to prioritise payment shortcuts.',
    };
  }
  return undefined;
}

function priorityLabel(priority: Priority): string {
  switch (priority) {
    case 'moneyManagement':
      return 'money management';
    case 'accessibility':
      return 'accessibility';
    case 'guidance':
      return 'guidance';
    case 'payments':
    default:
      return 'payments';
  }
}
