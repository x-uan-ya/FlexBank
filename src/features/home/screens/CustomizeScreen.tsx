import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppText,
  Header,
  ScreenContainer,
} from '@/components';
import {
  HomeRecommendationPanel,
  applyRecommendedWidgetOrder,
  recommendHomeExperience,
} from '@/features/adaptive';
import { useAppDispatch, useHomeLayout, usePreferences } from '@/state';
import { useTheme } from '@/theme';
import { DEFAULT_HOME_LAYOUT, type HomeWidget } from '@/types/home';
import { PRIORITY_LABELS } from '@/types/preferences';

/**
 * Homepage customisation starter (Developer A).
 *
 * Lets the customer move widgets up/down and toggle visibility, then writes the
 * new layout with SET_HOME_LAYOUT. Includes reset-to-standard.
 *
 * SAFETY: hiding a widget here only affects homepage emphasis. Core banking
 * features remain reachable from the PayNow flow and other routes — never block
 * access. Dev A should preserve that guarantee when expanding this screen.
 */

export function CustomizeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const layout = useHomeLayout();
  const preferences = usePreferences();
  const [manualOpen, setManualOpen] = useState(false);

  const ordered = [...layout].sort((a, b) => a.position - b.position);
  const recommendation = useMemo(
    () =>
      recommendHomeExperience({
        preferences,
        approvedWidgetIds: DEFAULT_HOME_LAYOUT.map((widget) => widget.id),
        existingLayout: layout,
      }),
    [layout, preferences],
  );
  const widgetLabels = Object.fromEntries(
    DEFAULT_HOME_LAYOUT.map((widget) => [widget.id, widget.title]),
  );
  const layoutApplied = recommendation.widgetOrder.every(
    (id, index) => ordered[index]?.id === id,
  );

  function commit(next: HomeWidget[]) {
    const repositioned = next.map((w, position) => ({ ...w, position }));
    dispatch({ type: 'SET_HOME_LAYOUT', payload: repositioned });
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...ordered];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  }

  function toggleVisible(id: string) {
    commit(ordered.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  }

  function applyRecommendation() {
    dispatch({
      type: 'SET_HOME_LAYOUT',
      payload: applyRecommendedWidgetOrder(layout, recommendation.widgetOrder),
    });
  }

  function applyGuidanceSuggestion() {
    const suggestion = recommendation.guidanceSuggestion;
    if (!suggestion) return;
    dispatch({
      type: 'SET_PREFERENCES',
      payload: { guidanceLevel: suggestion.mode },
    });
  }

  return (
    <ScreenContainer
      footer={
        <AppButton
          label="Reset to standard"
          variant="secondary"
          onPress={() => dispatch({ type: 'RESET_PREFERENCES' })}
        />
      }
    >
      <Header
        title="Made for you"
        subtitle="Suggestions based only on the choices you made."
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      <View style={{ gap: theme.spacing.sm }}>
        <AppText role="heading">Your priorities</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {preferences.priorities.map((priority) => (
            <View
              key={priority}
              style={{
                minHeight: 44,
                justifyContent: 'center',
                paddingHorizontal: theme.spacing.md,
                paddingVertical: theme.spacing.sm,
                borderRadius: theme.radius.pill,
                backgroundColor: theme.colors.selectedBg,
                borderWidth: theme.clarity ? 2 : 1,
                borderColor: theme.colors.selectedBorder,
              }}
            >
              <AppText role="label" color="primary">
                ✓ {PRIORITY_LABELS[priority]}
              </AppText>
            </View>
          ))}
        </View>
        <AppButton
          label="Change priorities in Settings"
          variant="ghost"
          onPress={() => router.push('/settings')}
        />
      </View>

      <HomeRecommendationPanel
        recommendation={recommendation}
        widgetLabels={widgetLabels}
        layoutApplied={layoutApplied}
        onApplyLayout={applyRecommendation}
        onApplyGuidance={applyGuidanceSuggestion}
      />

      <AppCard elevation="none">
        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="heading">Manual customisation</AppText>
          <AppText role="caption" color="textSecondary">
            Reorder or hide widgets yourself. Your choices remain in control.
          </AppText>
          <AppButton
            label={manualOpen ? 'Hide manual controls' : 'Open manual controls'}
            variant="secondary"
            onPress={() => setManualOpen((open) => !open)}
            accessibilityState={{ expanded: manualOpen }}
          />
        </View>
      </AppCard>

      {manualOpen ? (
        <View style={{ gap: theme.spacing.sm }}>
          {ordered.map((widget, index) => (
          <AppCard key={widget.id}>
            <View
              style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: theme.spacing.sm,
              }}
            >
              <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 140 }}>
                <AppText role="subheading">{widget.title}</AppText>
                <AppText role="caption" color="textMuted">
                  {widget.visible ? 'Shown' : 'Hidden'}
                </AppText>
              </View>

              <AppButton
                label="↑"
                variant="ghost"
                fullWidth={false}
                onPress={() => move(index, -1)}
                accessibilityLabel={`Move ${widget.title} up`}
              />
              <AppButton
                label="↓"
                variant="ghost"
                fullWidth={false}
                onPress={() => move(index, 1)}
                accessibilityLabel={`Move ${widget.title} down`}
              />
              <AppButton
                label={widget.visible ? 'Hide' : 'Show'}
                variant="secondary"
                fullWidth={false}
                onPress={() => toggleVisible(widget.id)}
              />
            </View>
          </AppCard>
          ))}
        </View>
      ) : null}

      {/* TODO: PERSONALISATION FEATURE — Dev A: drag-and-drop reorder,
          preview, per-widget settings. */}
    </ScreenContainer>
  );
}
