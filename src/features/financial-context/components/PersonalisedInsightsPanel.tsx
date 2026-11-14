import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { AppButton, AppCard, AppText, EmptyState, ErrorState, Icon, LoadingState } from '@/components';
import { useAuthState, usePreferences } from '@/state';
import { useTheme } from '@/theme';

import {
  privacySafeInsight,
  safeInsightAction,
  selectPanelInsights,
  type SafeInsightRoute,
} from '../panelLogic';
import type { PrioritisedInsight } from '../types';
import { useFinancialInsightsData } from '../useFinancialInsightsData';
import { useInsightDismissals } from '../useInsightDismissals';

export interface PersonalisedInsightsPanelProps {
  /** Pass Home's existing privacy state so hidden amounts never leak here. */
  balanceHidden: boolean;
  maximumInsights?: 2 | 3;
}

/** Connected, read-only panel ready to drop into Home after teammate integration. */
export function PersonalisedInsightsPanel({
  balanceHidden,
  maximumInsights = 3,
}: PersonalisedInsightsPanelProps) {
  const theme = useTheme();
  const router = useRouter();
  const preferences = usePreferences();
  const { status, user } = useAuthState();
  const userId = status === 'signedIn' ? user?.id ?? null : null;
  const data = useFinancialInsightsData(userId);
  const dismissals = useInsightDismissals(userId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const hasFocused = useRef(false);

  useFocusEffect(useCallback(() => {
    if (hasFocused.current) {
      data.retry();
      dismissals.retry();
    } else {
      hasFocused.current = true;
    }
  }, [data.retry, dismissals.retry]));

  const allInsights = useMemo(() => data.context
    ? selectPanelInsights(data.context, preferences.bankingPurposes, [], 3)
    : [], [data.context, preferences.bankingPurposes]);
  const visibleInsights = useMemo(() => data.context
    ? selectPanelInsights(
        data.context,
        preferences.bankingPurposes,
        dismissals.dismissedIds,
        maximumInsights,
      )
    : [], [data.context, preferences.bankingPurposes, dismissals.dismissedIds, maximumInsights]);

  if (status === 'loading' || data.loading || dismissals.loading) {
    return <PanelShell><LoadingState message="Preparing your financial insights…" /></PanelShell>;
  }
  if (status !== 'signedIn' || !userId) {
    return (
      <PanelShell>
        <EmptyState title="Sign in to see your insights" message="Insights use your explicitly selected banking purposes and saved demo records." />
      </PanelShell>
    );
  }
  if (data.error || !data.context) {
    return (
      <PanelShell>
        <ErrorState
          title="Insights are temporarily unavailable"
          message={data.error ?? 'No financial context is available. Your records have not changed.'}
          onRetry={data.retry}
        />
      </PanelShell>
    );
  }

  const allDismissed = allInsights.length > 0 && visibleInsights.length === 0;
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={{ gap: theme.spacing.xs }}>
        <AppText role="heading" accessibilityRole="header">Personalised financial insights</AppText>
        <AppText role="caption" color="textSecondary">
          Deterministic guidance from your selected purposes and saved demo records—not a live AI model.
        </AppText>
      </View>

      <View accessibilityLiveRegion="polite">
        {announcement ? <AppText role="caption" color="textSecondary">{announcement}</AppText> : null}
        {dismissals.error ? (
          <View accessibilityRole="alert" style={{ gap: theme.spacing.xs }}>
            <AppText role="caption" color="danger">{dismissals.error}</AppText>
            <AppButton label="Retry saved dismissals" variant="ghost" fullWidth={false} onPress={dismissals.retry} />
          </View>
        ) : null}
      </View>

      {visibleInsights.length === 0 ? (
        <AppCard elevation="none">
          <EmptyState
            title={allDismissed ? "You're all caught up" : 'No insights available yet'}
            message={allDismissed
              ? 'Dismissed suggestions stay hidden for this demo user without changing any financial record or preference.'
              : 'Add a goal or investment record to receive evidence-based insights.'}
            actionLabel={allDismissed ? 'Show dismissed insights' : 'Review banking purposes'}
            onAction={allDismissed ? dismissals.clear : () => router.push('/purposes')}
          />
        </AppCard>
      ) : visibleInsights.map((insight) => {
        const presentedInsight = privacySafeInsight(insight, balanceHidden);
        return (
          <InsightCard
            key={insight.id}
            insight={presentedInsight}
            expanded={expandedId === insight.id}
            balanceHidden={balanceHidden}
            onToggleWhy={() => setExpandedId((current) => current === insight.id ? null : insight.id)}
            onDismiss={() => {
              setExpandedId(null);
              dismissals.dismiss(insight.id);
              setAnnouncement(`${presentedInsight.title} dismissed. Financial records and preferences were not changed.`);
            }}
            onAction={(route) => router.push(route)}
          />
        );
      })}

      <AppText role="caption" color="textMuted">
        {data.sourceNote} No insight can move money or confirm a payment.
      </AppText>
      <AppButton
        label="Refresh insights"
        variant="ghost"
        fullWidth={false}
        accessibilityHint="Reloads saved goals and dismissals for this demo user"
        onPress={() => {
          data.retry();
          dismissals.retry();
          setAnnouncement('Refreshing insights from saved demo data.');
        }}
      />
    </View>
  );
}

function PanelShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText role="heading" accessibilityRole="header">Personalised financial insights</AppText>
      <AppCard elevation="none">{children}</AppCard>
    </View>
  );
}

function InsightCard({
  insight,
  expanded,
  balanceHidden,
  onToggleWhy,
  onDismiss,
  onAction,
}: {
  insight: PrioritisedInsight;
  expanded: boolean;
  balanceHidden: boolean;
  onToggleWhy: () => void;
  onDismiss: () => void;
  onAction: (route: SafeInsightRoute) => void;
}) {
  const theme = useTheme();
  const action = safeInsightAction(insight);
  return (
    <AppCard accessibilityLabel={`${insight.title}. ${insight.explanation}`}>
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
          <Icon name={iconFor(insight.type)} circle size={20} />
          <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xs }}>
            <AppText role="subheading" accessibilityRole="header">{insight.title}</AppText>
            <AppText color="textSecondary">{insight.explanation}</AppText>
          </View>
        </View>

        {insight.dataSource.synthetic ? (
          <View style={{ alignSelf: 'flex-start', paddingHorizontal: theme.spacing.sm,
            paddingVertical: theme.spacing.xs, borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.warningSoft }}>
            <AppText role="caption" color="textSecondary">Synthetic demo data</AppText>
          </View>
        ) : null}

        <View style={{ flexDirection: theme.mode === 'standard' ? 'row' : 'column',
          flexWrap: 'wrap', gap: theme.spacing.sm, alignItems: 'flex-start' }}>
          {action ? (
            <AppButton
              label={action.label}
              variant="secondary"
              fullWidth={theme.mode !== 'standard'}
              accessibilityHint={`Opens ${action.route}. It does not initiate a transaction.`}
              onPress={() => onAction(action.route)}
            />
          ) : null}
          <AppButton
            label={expanded ? 'Hide explanation' : 'Why am I seeing this?'}
            variant="ghost"
            fullWidth={theme.mode !== 'standard'}
            accessibilityState={{ expanded }}
            accessibilityHint="Explains the explicit purpose and record evidence used"
            onPress={onToggleWhy}
          />
          <AppButton
            label="Dismiss"
            variant="ghost"
            fullWidth={theme.mode !== 'standard'}
            accessibilityLabel={`Dismiss ${insight.title}`}
            accessibilityHint="Hides this suggestion only; records, preferences and banking features stay unchanged"
            onPress={onDismiss}
          />
        </View>

        {expanded ? (
          <View style={{ gap: theme.spacing.xs, padding: theme.spacing.sm,
            borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted }}>
            <AppText role="bodyStrong">Why this is shown</AppText>
            <AppText role="caption" color="textSecondary">{insight.priority.reason}</AppText>
            <AppText role="caption" color="textSecondary">
              {balanceHidden
                ? 'Evidence comes from saved financial records; amount details remain hidden.'
                : `Evidence: ${insight.dataSource.label} (${insight.dataSource.recordIds.length} supporting record${insight.dataSource.recordIds.length === 1 ? '' : 's'}).`}
            </AppText>
            <AppText role="caption" color="textMuted">
              Prioritisation changes display order only. It does not remove access to any feature.
            </AppText>
          </View>
        ) : null}
      </View>
    </AppCard>
  );
}

function iconFor(type: PrioritisedInsight['type']): 'insights' | 'goal' | 'investments' | 'bill' {
  if (type === 'goal-progress' || type === 'goal-coaching') return 'goal';
  if (type === 'maturity-reminder' || type === 'risk-explanation') return 'investments';
  if (type === 'recurring-expense') return 'bill';
  return 'insights';
}
