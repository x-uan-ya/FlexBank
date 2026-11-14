import { useCallback, useEffect, useState } from 'react';

import { goalsKey, SEED_GOALS, type Goal } from '@/features/plan/goals';
import { jsonStorage } from '@/services';

import {
  buildUserScopedFinancialContext,
  FINANCIAL_INSIGHTS_SOURCE_NOTE,
} from './dataPolicy';
import type { FinancialContextInput } from './insightEngine';

interface FinancialInsightsDataState {
  /** User whose storage read produced this state. Never infer from context. */
  contextUserId: string | null;
  context: FinancialContextInput | null;
  loading: boolean;
  error: string | null;
  sourceNote: string;
}

/** Read-only composition of existing feature stores for the insights panel. */
export function useFinancialInsightsData(userId: string | null) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<FinancialInsightsDataState>({
    contextUserId: null,
    context: null,
    loading: userId !== null,
    error: null,
    sourceNote: FINANCIAL_INSIGHTS_SOURCE_NOTE,
  });

  useEffect(() => {
    let active = true;
    if (!userId) {
      setState({ contextUserId: null, context: null, loading: false, error: null, sourceNote: FINANCIAL_INSIGHTS_SOURCE_NOTE });
      return () => { active = false; };
    }
    setState({
      contextUserId: userId,
      context: null,
      loading: true,
      error: null,
      sourceNote: FINANCIAL_INSIGHTS_SOURCE_NOTE,
    });
    void jsonStorage.get<Goal[]>(goalsKey(userId)).then((savedGoals) => {
      if (!active) return;
      // Match Plan's existing default without writing a second source of truth.
      const planGoals = savedGoals === null ? SEED_GOALS : savedGoals;
      setState({
        contextUserId: userId,
        context: buildUserScopedFinancialContext(planGoals, new Date().toISOString()),
        loading: false,
        error: null,
        sourceNote: FINANCIAL_INSIGHTS_SOURCE_NOTE,
      });
    }).catch(() => {
      if (active) {
        setState({
          contextUserId: userId,
          context: null,
          loading: false,
          error: 'Your saved demo records could not be read. No records were changed.',
          sourceNote: FINANCIAL_INSIGHTS_SOURCE_NOTE,
        });
      }
    });
    return () => { active = false; };
  }, [userId, revision]);

  const retry = useCallback(() => setRevision((value) => value + 1), []);
  // Effects run after render. Mask a previous user's result synchronously on
  // the first render of an auth switch, before any consumer can read it.
  const belongsToCurrentUser = isFinancialContextForUser(state.contextUserId, userId);
  return {
    ...state,
    context: belongsToCurrentUser ? state.context : null,
    loading: userId !== null && (!belongsToCurrentUser || state.loading),
    error: belongsToCurrentUser ? state.error : null,
    retry,
  };
}

/** Pure identity check kept explicit so auth-transition masking is testable. */
export function isFinancialContextForUser(
  contextUserId: string | null,
  currentUserId: string | null,
): boolean {
  return contextUserId === currentUserId;
}
