import { useState } from 'react';
import { View } from 'react-native';

import { AppButton, AppCard, AppText } from '@/components';
import { useTheme } from '@/theme';
import { GUIDANCE_LABELS } from '@/types/preferences';

import type { HomeRecommendation } from './homeRecommendations';

interface HomeRecommendationPanelProps {
  recommendation: HomeRecommendation;
  widgetLabels: Record<string, string>;
  layoutApplied: boolean;
  onApplyLayout: () => void;
  onApplyGuidance: () => void;
}

/** Customer-controlled preview: no recommendation is applied on render. */
export function HomeRecommendationPanel({
  recommendation,
  widgetLabels,
  layoutApplied,
  onApplyLayout,
  onApplyGuidance,
}: HomeRecommendationPanelProps) {
  const theme = useTheme();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <AppCard elevation="none">
        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="bodyStrong">Homepage suggestions hidden</AppText>
          <AppText role="caption" color="textSecondary">
            Your existing layout and preferences have not changed.
          </AppText>
          <AppButton
            label="Show suggestions"
            variant="secondary"
            onPress={() => setDismissed(false)}
          />
        </View>
      </AppCard>
    );
  }

  return (
    <AppCard elevation="none" style={{ borderColor: theme.colors.accent }}>
      <View style={{ gap: theme.spacing.md }}>
        <View style={{ gap: theme.spacing.xs }}>
          <AppText role="heading">Suggested homepage arrangement</AppText>
          <AppText role="body" color="textSecondary">
            Based only on the priorities and modes you selected. Review it before applying.
          </AppText>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          {recommendation.widgets.map((widget, index) => (
            <View
              key={widget.widgetId}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: theme.spacing.sm,
              }}
            >
              <View
                style={{
                  minWidth: 28,
                  minHeight: 28,
                  paddingHorizontal: theme.spacing.xs,
                  borderRadius: theme.radius.pill,
                  backgroundColor: theme.colors.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <AppText role="caption" color="accent">
                  {index + 1}
                </AppText>
              </View>
              <View style={{ flex: 1, gap: theme.spacing.xs }}>
                <AppText role="bodyStrong">
                  {widgetLabels[widget.widgetId] ?? widget.widgetId}
                </AppText>
                <AppText role="caption" color="textSecondary">
                  {widget.reason}
                </AppText>
              </View>
            </View>
          ))}
        </View>

        <AppButton
          label={layoutApplied ? 'Widget arrangement applied' : 'Apply widget arrangement'}
          disabled={layoutApplied}
          onPress={onApplyLayout}
          accessibilityHint="Applies this order while preserving widget visibility settings"
        />

        {recommendation.guidanceSuggestion ? (
          <AppCard elevation="none" style={{ borderColor: theme.colors.borderStrong }}>
            <View style={{ gap: theme.spacing.sm }}>
              <AppText role="bodyStrong">
                Optional: {GUIDANCE_LABELS[recommendation.guidanceSuggestion.mode]} Mode
              </AppText>
              <AppText role="caption" color="textSecondary">
                {recommendation.guidanceSuggestion.reason}
              </AppText>
              <AppButton
                label={`Use ${GUIDANCE_LABELS[recommendation.guidanceSuggestion.mode]} Mode`}
                variant="secondary"
                onPress={onApplyGuidance}
              />
            </View>
          </AppCard>
        ) : null}

        <AppButton
          label="Dismiss suggestions"
          variant="ghost"
          onPress={() => setDismissed(true)}
        />
      </View>
    </AppCard>
  );
}
