import { useState, type ReactNode } from 'react';
import { View, useWindowDimensions } from 'react-native';

import { AppButton, AppCard, AppText } from '@/components';
import { HomeIcon } from '@/features/home/components/HomeIcon';
import { useTheme } from '@/theme';
import type { HomeWidget, HomeWidgetType } from '@/types/home';
import { GUIDANCE_LABELS, type GuidanceLevel } from '@/types/preferences';

import type { HomeRecommendation } from './homeRecommendations';

interface HomeRecommendationPanelProps {
  recommendation: HomeRecommendation;
  currentLayout: HomeWidget[];
  recommendedLayout: HomeWidget[];
  guidanceLevel: GuidanceLevel;
  layoutApplied: boolean;
  manualOpen: boolean;
  status: string;
  onApplyLayout: () => void;
  onApplyGuidance: () => void;
  onKeepLayout: () => void;
  onToggleManual: () => void;
  children?: ReactNode;
}

const PACE_BENEFITS: Record<GuidanceLevel, string> = {
  quick: 'Less explanatory text, with all the usual checks before you send.',
  balanced: 'A little guidance as you go, with clear details at every step.',
  guided: 'Step-by-step explanations to help you bank with confidence.',
};

/** Live preview and separate explicit actions; never applies suggestions on render. */
export function HomeRecommendationPanel({
  recommendation, currentLayout, recommendedLayout, guidanceLevel,
  layoutApplied, manualOpen, status, onApplyLayout, onApplyGuidance, onKeepLayout, onToggleManual, children,
}: HomeRecommendationPanelProps) {
  const theme = useTheme();
  const firstVisible = [...recommendedLayout].sort((a, b) => a.position - b.position).find((widget) => widget.visible);
  const reason = recommendation.widgets.find((widget) => widget.widgetId === firstVisible?.id)?.reason;
  const suggestion = recommendation.guidanceSuggestion;
  const pace = suggestion?.mode ?? guidanceLevel;

  return (
    <View style={{ gap: theme.spacing.lg }}>
      <View style={{ gap: theme.spacing.sm }}>
        <AppText role="heading" accessibilityRole="header">Your suggested homepage</AppText>
        <AppText role="caption" color="textSecondary">
          {firstVisible
            ? reason ?? 'Your saved shortcuts stay in view, in the order suggested by your choices.'
            : 'Your shortcuts stay hidden until you choose to show them.'}
        </AppText>
        <LayoutComparison currentLayout={currentLayout} recommendedLayout={recommendedLayout} />
        <AppText role="caption" color="textSecondary">
          First four visible shortcuts. Hidden shortcuts stay hidden.
        </AppText>
        <AppButton label="Apply to my home" onPress={onApplyLayout} disabled={layoutApplied}
          accessibilityHint="Applies the suggested shortcut order; preserves visibility, banking pace and display settings" />
        {layoutApplied ? <AppText role="caption" color="textSecondary">Your home already uses this arrangement.</AppText> : null}
        <AppButton label="Keep my current layout" variant="secondary" onPress={onKeepLayout}
          accessibilityHint="Returns to Home without applying a suggested arrangement" />
        <AppButton label={manualOpen ? 'Hide manual controls' : 'Customise manually'} variant="ghost" onPress={onToggleManual}
          accessibilityState={{ expanded: manualOpen }} aria-expanded={manualOpen}
          accessibilityHint="Shows or hides shortcut ordering and visibility controls" />
        <View accessibilityLiveRegion="polite">
          {status ? <AppText role="caption" color="textSecondary">{status}</AppText> : null}
        </View>
      </View>

      {children}

      <View style={{ gap: theme.spacing.sm }}>
        <AppText role="heading" accessibilityRole="header">Suggested banking pace</AppText>
        <AppCard elevation="none">
          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <HomeIcon name={pace === 'guided' ? 'message' : pace === 'quick' ? 'paynow' : 'layers'} size={24} />
              <AppText role="subheading" style={{ flex: 1 }}>{GUIDANCE_LABELS[pace]}</AppText>
            </View>
            <AppText color="textSecondary">{PACE_BENEFITS[pace]}</AppText>
            <AppText role="caption" color="textSecondary">
              {suggestion?.reason ?? `No change suggested. You're using ${GUIDANCE_LABELS[guidanceLevel]} pace.`}
            </AppText>
            {suggestion ? (
              <AppButton label={`Use ${GUIDANCE_LABELS[suggestion.mode]} mode`} variant="secondary" onPress={onApplyGuidance}
                accessibilityHint="Changes banking pace only; your homepage arrangement stays as it is" />
            ) : null}
          </View>
        </AppCard>
      </View>

    </View>
  );
}

const WIDGET_ICONS = {
  paynow: 'paynow', transfer: 'transfer', bills: 'bill', accounts: 'accounts',
  spending: 'insights', recentRecipients: 'profile', concierge: 'message', help: 'help',
} as const satisfies Record<HomeWidgetType, Parameters<typeof HomeIcon>[0]['name']>;

// Mirrors HomeScreen's saved-position/visibility/first-four presentation.
function visibleShortcuts(layout: HomeWidget[]) {
  return [...layout].sort((a, b) => a.position - b.position).filter(widget => widget.visible).slice(0, 4);
}

/** Measure actual themed text at the proposed column width, including words
 * that must fit without breaking. Stacking is the safe initial/fallback layout.
 * onLayout works on native and web; no browser font API or new dependency.
 */
function LayoutComparison({ currentLayout, recommendedLayout }: {
  currentLayout: HomeWidget[]; recommendedLayout: HomeWidget[];
}) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const [width, setWidth] = useState(0);
  const [measured, setMeasured] = useState<{ key: string; heights: Record<string, number> }>({ key: '', heights: {} });
  const border = theme.clarity ? 2 : 1;
  const columnWidth = (width - theme.spacing.sm) / 2;
  const headingWidth = columnWidth - (theme.spacing.sm + border) * 2;
  const labelWidth = headingWidth - 20 - theme.spacing.xs;
  const names = [...new Set([...visibleShortcuts(currentLayout), ...visibleShortcuts(recommendedLayout)]
    .map(widget => widget.title))];
  const probes = [
    ...['Current home', 'Recommended home'].flatMap(text => [
      { text, heading: true, lines: 2 },
      ...text.split(/\s+/).map(word => ({ text: word, heading: true, lines: 1 })),
    ]),
    ...names.flatMap(text => [
      { text, heading: false, lines: 2 },
      ...text.split(/\s+/).map(word => ({ text: word, heading: false, lines: 1 })),
    ]),
  ];
  const key = JSON.stringify([width, fontScale, theme.mode, names]);
  const twoColumns = names.length > 0 && labelWidth > 0 && measured.key === key && probes.every((probe, index) => {
    const lineHeight = (theme.typography[probe.heading ? 'subheading' : 'label'].lineHeight ?? 24) * fontScale;
    const height = measured.heights[index];
    return height > 0 && height <= Math.ceil(lineHeight * probe.lines) + 1;
  });

  return (
    <View onLayout={event => {
      const next = event.nativeEvent.layout.width;
      setWidth(previous => Math.abs(previous - next) > 0.5 ? next : previous);
    }} style={{ flexDirection: twoColumns ? 'row' : 'column', alignItems: 'stretch', gap: theme.spacing.sm }}>
      <LayoutPreview title="Current home" layout={currentLayout} columns={twoColumns} />
      <LayoutPreview title="Recommended home" layout={recommendedLayout} columns={twoColumns} recommended />
      {labelWidth > 0 ? (
        <View key={key} pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={{ position: 'absolute', left: 0, top: 0, width: columnWidth, height: 0, overflow: 'hidden', opacity: 0 }}>
          {probes.map((probe, index) => <AppText key={index} role={probe.heading ? 'subheading' : 'label'}
            style={{ width: probe.heading ? headingWidth : labelWidth, flexShrink: 0 }}
            onLayout={event => {
              const height = event.nativeEvent.layout.height;
              setMeasured(previous => previous.key === key && previous.heights[index] === height ? previous : {
                key, heights: { ...(previous.key === key ? previous.heights : {}), [index]: height },
              });
            }}>{probe.text}</AppText>)}
        </View>
      ) : null}
    </View>
  );
}

function LayoutPreview({ title, layout, columns, recommended = false }: {
  title: string; layout: HomeWidget[]; columns: boolean; recommended?: boolean;
}) {
  const theme = useTheme();
  const { fontScale } = useWindowDimensions();
  const visible = visibleShortcuts(layout);
  return (
    <AppCard elevation="none" style={{ flex: columns ? 1 : undefined, minWidth: 0,
      padding: theme.spacing.sm, borderRadius: theme.radius.lg,
      ...(recommended ? { borderColor: theme.colors.selectedBorder } : {}) }}>
      <View style={{ gap: theme.spacing.xs }}>
        <AppText role="subheading" accessibilityRole="header"
          style={columns ? { minHeight: (theme.typography.subheading.lineHeight ?? 24) * fontScale * 2 } : undefined}>{title}</AppText>
        {visible.length ? visible.map((widget, index) => (
          <View key={widget.id} style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs,
            paddingVertical: theme.spacing.xs, borderTopWidth: index ? 1 : 0, borderColor: theme.colors.border }}>
            <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <HomeIcon name={WIDGET_ICONS[widget.type]} size={20} />
            </View>
            <AppText role="label" style={{ flex: 1, minWidth: 0 }}>{widget.title}</AppText>
          </View>
        )) : <AppText role="caption" color="textSecondary">No shortcuts shown. Use manual controls to show your tools.</AppText>}
      </View>
    </AppCard>
  );
}
