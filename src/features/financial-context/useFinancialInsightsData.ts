import { useCallback, useEffect, useState } from 'react';

import { goalsKey, SEED_GOALS, type Goal } from '@/features/plan/goals';
import { jsonStorage } from '@/services';

import {
  buildUserScopedFinancialContext,
  FINANCIAL_INSIGHTS_SOURCE_NOTE,
} from './dataPolicy';
import type { FinancialContextInput } from './insightEngine';

interface FinancialInsightsDataState {
  context: FinancialContextInput | null;
  loading: boolean;
  error: string | null;
  sourceNote: string;
}

/** Read-only composition of existing feature stores for the insights panel. */
export function useFinancialInsightsData(userId: string | null) {
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<FinancialInsightsDataState>({
    context: null,
    loading: userId !== null,
    error: null,
    sourceNote: FINANCIAL_INSIGHTS_SOURCE_NOTE,
  });

  useEffect(() => {
    let active = true;
    if (!userId) {
      setState({ context: null, loading: false, error: null, sourceNote: FINANCIAL_INSIGHTS_SOURCE_NOTE });
      return () => { active = false; };
    }
    setState((current) => ({ ...current, loading: true, error: null }));
    void jsonStorage.get<Goal[]>(goalsKey(userId)).then((savedGoals) => {
      if (!active) return;
      // Match Plan's existing default without writing a second source of truth.
      const planGoals = savedGoals === null ? SEED_GOALS : savedGoals;
      setState({
        context: buildUserScopedFinancialContext(planGoals, new Date().toISOString()),
        loading: false,
        error: null,
        sourceNote: FINANCIAL_INSIGHTS_SOURCE_NOTE,
      });
    }).catch(() => {
      if (active) {
        setState({
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
  return { ...state, retry };
}
