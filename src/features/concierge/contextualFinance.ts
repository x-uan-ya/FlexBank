import { generatePrioritisedInsights, type FinancialContextInput } from '@/features/financial-context';
import { privacySafeInsight } from '@/features/financial-context/panelLogic';
import type { InsightType, PrioritisedInsight } from '@/features/financial-context/types';
import type { BankingPurpose, GuidanceLevel } from '@/types/preferences';

export type FinancialQuestionIntent =
  | 'overview'
  | 'spending-summary'
  | 'category-change'
  | 'recurring-expense'
  | 'goal-progress'
  | 'goal-coaching'
  | 'maturity-reminder'
  | 'risk-explanation';

export interface ContextualFinancialQuestion {
  question: string;
  context: FinancialContextInput | null;
  bankingPurposes: BankingPurpose[];
  guidanceLevel: GuidanceLevel;
  /** Amount-bearing text is removed before a response is created. */
  balanceHidden: boolean;
  /** An opaque ID only. The current authorised context is always re-resolved. */
  selectedInsightId?: string | null;
}

export interface ContextualFinancialAnswer {
  text: string;
  intent: FinancialQuestionIntent;
  insightIds: string[];
  /** Contextual answers are always prepared locally; they never use the AI proxy. */
  source: 'prepared-financial-context';
}

export interface PrivacyTaggedChatTurn {
  role: 'user' | 'model';
  text: string;
  containsFinancialContext?: boolean;
}

const INTENT_PATTERNS: Array<{ intent: FinancialQuestionIntent; match: RegExp }> = [
  { intent: 'recurring-expense', match: /\b(recurring|subscription|repeat(?:ed|ing)? charge)\b/i },
  { intent: 'category-change', match: /\b(category|categor(?:y|ies)|month[- ]to[- ]month|increase[ds]?|decrease[ds]?|change[ds]?)\b[^?]*(spend|expense)|\b(spend|expense)[^?]*\b(category|increase[ds]?|decrease[ds]?|change[ds]?)\b/i },
  { intent: 'goal-coaching', match: /\b(monthly contribution|required monthly|per month|target date|time to (?:my )?goal|reach (?:my|the) goal)\b/i },
  { intent: 'goal-progress', match: /\b(my )?(saving|savings) goal|\bgoal progress|\bhow (?:is|are) my goal/i },
  { intent: 'maturity-reminder', match: /\b(matur(?:e|es|ity|ing)|maturity date|due date)\b/i },
  { intent: 'risk-explanation', match: /\b(investment|bond|fixed deposit|fd)\b[^?]*\brisk|\brisk[^?]*\b(investment|bond|fixed deposit|fd)\b/i },
  { intent: 'spending-summary', match: /\b(my )?(spending|expenses?)\b|\bspend(?:ing)? summary\b/i },
  { intent: 'overview', match: /\b(my )?(financial )?insights?\b|\bwhat should i know about my finances\b/i },
];

const TYPES_FOR_INTENT: Record<FinancialQuestionIntent, InsightType[]> = {
  overview: [
    'spending-summary',
    'category-change',
    'recurring-expense',
    'goal-progress',
    'goal-coaching',
    'maturity-reminder',
    'risk-explanation',
  ],
  'spending-summary': ['spending-summary'],
  'category-change': ['category-change'],
  'recurring-expense': ['recurring-expense'],
  'goal-progress': ['goal-progress'],
  'goal-coaching': ['goal-coaching'],
  'maturity-reminder': ['maturity-reminder'],
  'risk-explanation': ['risk-explanation'],
};

/**
 * Resolves account-context questions from the existing deterministic insight
 * engine. A null result means the question belongs to the existing general
 * Concierge. No provider or network module is imported here.
 */
export function answerContextualFinancialQuestion(
  request: ContextualFinancialQuestion,
): ContextualFinancialAnswer | null {
  const selectedId = cleanInsightId(request.selectedInsightId);
  const intent = selectedId ? 'overview' : detectFinancialQuestionIntent(request.question);
  if (!intent) return null;

  if (!request.context) {
    return prepared(
      intent,
      'I cannot access authorised financial context for this demo user right now. No figures have been assumed. Try refreshing after signing in.',
      [],
    );
  }

  const insights = generatePrioritisedInsights(request.context, request.bankingPurposes);
  if (selectedId) {
    const selected = insights.find((insight) => insight.id === selectedId);
    if (!selected) {
      return prepared(
        intent,
        'That insight is no longer available in the current authorised context. It may belong to another session or the underlying demo record may have changed.',
        [],
      );
    }
    return formatAnswer([selected], intent, request);
  }

  const matching = insights
    .filter((insight) => TYPES_FOR_INTENT[intent].includes(insight.type))
    .slice(0, intent === 'overview' ? 2 : 1);
  if (matching.length === 0) {
    return prepared(intent, missingDataMessage(intent), []);
  }
  return formatAnswer(matching, intent, request);
}

export function detectFinancialQuestionIntent(question: string): FinancialQuestionIntent | null {
  const trimmed = question.trim();
  if (!trimmed) return null;
  return INTENT_PATTERNS.find(({ match }) => match.test(trimmed))?.intent ?? null;
}

/** A contextual turn makes the whole prior transcript unsafe for a proxy. */
export function historyForGeneralProvider(
  turns: PrivacyTaggedChatTurn[],
): Array<{ role: 'user' | 'model'; text: string }> {
  if (turns.some((turn) => turn.containsFinancialContext)) return [];
  return turns.map(({ role, text }) => ({ role, text }));
}

/** Used on logout/user-switch and when amount privacy is re-enabled. */
export function removeContextualTurns<T extends PrivacyTaggedChatTurn>(turns: T[]): T[] {
  return turns.filter((turn) => !turn.containsFinancialContext);
}

/** Conservative display/history redaction for hidden-balance mode. */
export function redactFinancialFigures(text: string): string {
  return text.replace(
    /(?:S\$\s*|\$\s*)?\b\d[\d,]*(?:\.\d+)?(?:\s*%|\s*p\.?a\.?)?/gi,
    '[hidden financial figure]',
  );
}

export function redactTurnsForPrivacy<T extends PrivacyTaggedChatTurn>(turns: T[]): T[] {
  return turns.map((turn) => ({ ...turn, text: redactFinancialFigures(turn.text) }));
}

/** Guards async completions after logout or an account switch. */
export function isResponseForCurrentUser(
  requestUserId: string | null,
  currentUserId: string | null,
): boolean {
  return requestUserId === currentUserId;
}

function formatAnswer(
  insights: PrioritisedInsight[],
  intent: FinancialQuestionIntent,
  request: ContextualFinancialQuestion,
): ContextualFinancialAnswer {
  const safeInsights = insights.map((insight) => privacySafeInsight(insight, request.balanceHidden));
  const facts = safeInsights.map((insight) => `${insight.title}. ${insight.explanation}`).join(' ');
  const demoLabel = safeInsights.some((insight) => insight.dataSource.synthetic)
    ? ' Synthetic demo data.'
    : '';
  const sourceLabels = [...new Set(safeInsights.map((insight) => insight.dataSource.label))].join(', ');
  const priorityReason = safeInsights[0]?.priority.reason ?? '';
  let text: string;

  if (request.guidanceLevel === 'quick') {
    text = `${facts}${demoLabel}`;
  } else if (request.guidanceLevel === 'guided') {
    text = `What the records show: ${facts}${demoLabel} Why this is relevant: ${priorityReason} Evidence: ${sourceLabels}. This is a read-only explanation, not a prediction or instruction to move money.`;
  } else {
    text = `${facts}${demoLabel} Source: ${sourceLabels}. ${priorityReason}`;
  }

  return prepared(intent, text, safeInsights.map((insight) => insight.id));
}

function prepared(
  intent: FinancialQuestionIntent,
  text: string,
  insightIds: string[],
): ContextualFinancialAnswer {
  return { text, intent, insightIds, source: 'prepared-financial-context' };
}

function cleanInsightId(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 160 ? trimmed : null;
}

function missingDataMessage(intent: FinancialQuestionIntent): string {
  if (intent === 'goal-progress' || intent === 'goal-coaching') {
    return 'I could not find a valid savings goal for this signed-in demo user, so I cannot calculate progress or a monthly contribution. No figure has been assumed.';
  }
  if (intent === 'maturity-reminder' || intent === 'risk-explanation') {
    return 'I could not find a supported maturity or risk record in the authorised context. App-wide saved investments are intentionally excluded because their owner cannot be verified.';
  }
  if (intent === 'recurring-expense') {
    return 'The available transaction history does not contain enough matching charges across distinct months to support a recurring-expense observation.';
  }
  if (intent === 'category-change') {
    return 'The available transaction history does not contain two consecutive months with a supported category change, so I cannot make that comparison.';
  }
  if (intent === 'spending-summary') {
    return 'No valid debit transactions are available for a spending summary. No amount has been assumed.';
  }
  return 'There are no supported financial insights in the current authorised context. No figures have been assumed.';
}
