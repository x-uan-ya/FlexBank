import { useMemo, useState, type KeyboardEvent } from 'react';
import { AccessibilityInfo, Platform, Pressable, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppButton, AppCard, AppText, Header, ScreenContainer } from '@/components';
import {
  HomeRecommendationPanel,
  applyRecommendedWidgetOrder,
  recommendHomeExperience,
} from '@/features/adaptive';
import { useAppDispatch, useHomeLayout, usePreferences } from '@/state';
import { useTheme } from '@/theme';
import { DEFAULT_HOME_LAYOUT, type HomeWidget } from '@/types/home';
import { GUIDANCE_LABELS, type Priority } from '@/types/preferences';
import { bankingReturnRoute } from '@/utils/bankingNavigation';

import { HomeIcon } from '../components/HomeIcon';

const PRIORITIES = [
  { value: 'payments', label: 'Make payments quickly', icon: 'paynow' },
  { value: 'moneyManagement', label: 'Understand my money', icon: 'insights' },
  { value: 'guidance', label: 'Get more guidance', icon: 'message' },
  { value: 'accessibility', label: 'Make things easier to read', icon: 'eye' },
] as const;

const CHOICE_ORDER = ['1st choice', '2nd choice', '3rd choice', '4th choice'];

/** Explicit preference and layout actions only; suggestions never write state. */
export function CustomizeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const layout = useHomeLayout();
  const preferences = usePreferences();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const { width, fontScale } = useWindowDimensions();
  const [manualOpen, setManualOpen] = useState(false);
  const [status, setStatus] = useState('');
  const contentWidth = Math.min(560, width - theme.spacing.md * 2);
  const minPriorityWidth = (theme.typography.bodyStrong.fontSize ?? 16) * fontScale * 8 + theme.spacing.md * 2;
  const twoColumns = theme.mode === 'standard' && contentWidth >= minPriorityWidth * 2 + theme.spacing.sm;
  const ordered = [...layout].sort((a, b) => a.position - b.position);
  const recommendation = useMemo(
    () => recommendHomeExperience({
      preferences,
      approvedWidgetIds: DEFAULT_HOME_LAYOUT.map((widget) => widget.id),
      existingLayout: layout,
    }),
    [layout, preferences],
  );
  const recommendedLayout = applyRecommendedWidgetOrder(layout, recommendation.widgetOrder);
  const layoutApplied = ordered.every((widget, index) => recommendedLayout[index]?.id === widget.id);

  function announce(message: string) {
    setStatus(message);
    // Web/Android use the live region below; avoid announcing twice there.
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }

  function togglePriority(priority: Priority) {
    const selected = preferences.priorities.includes(priority);
    if (selected && preferences.priorities.length === 1) {
      announce('Keep at least one priority. Select another before removing this one.');
      return;
    }
    const priorities = selected
      ? preferences.priorities.filter((item) => item !== priority)
      : [...preferences.priorities, priority];
    dispatch({ type: 'SET_PREFERENCES', payload: { priorities } });
    const label = PRIORITIES.find((option) => option.value === priority)?.label;
    announce(`${label} ${selected ? 'removed' : 'added'}. Priorities saved; your home layout has not changed.`);
  }

  function commit(next: HomeWidget[], message: string) {
    dispatch({ type: 'SET_HOME_LAYOUT', payload: next.map((widget, position) => ({ ...widget, position })) });
    announce(message);
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...ordered];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    commit(next, `${ordered[index].title} moved ${direction === -1 ? 'up' : 'down'}. Your manual layout is saved.`);
  }

  function toggleVisible(id: string) {
    const widget = ordered.find((item) => item.id === id);
    if (!widget) return;
    commit(ordered.map((item) => item.id === id ? { ...item, visible: !item.visible } : item),
      `${widget.title} ${widget.visible ? 'hidden' : 'shown'}. Your manual layout is saved.`);
  }

  function applyRecommendation() {
    dispatch({ type: 'SET_HOME_LAYOUT', payload: recommendedLayout });
    announce('Homepage arrangement applied. Your banking pace and hidden shortcuts are unchanged.');
  }

  function applyGuidanceSuggestion() {
    const suggestion = recommendation.guidanceSuggestion;
    if (!suggestion) return;
    dispatch({ type: 'SET_PREFERENCES', payload: { guidanceLevel: suggestion.mode } });
    announce(`${GUIDANCE_LABELS[suggestion.mode]} banking pace applied. Your home layout is unchanged.`);
  }

  function goBack() {
    router.replace(bankingReturnRoute(returnTo));
  }

  return (
    <ScreenContainer>
      <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', gap: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.xs }}>
          <Header title="Made for You" onBack={goBack} />
          <AppText color="textSecondary">Choose what matters most. We'll help make banking easier.</AppText>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="heading" accessibilityRole="header">Your priorities</AppText>
          <AppText role="caption" color="textSecondary">
            Choose one or more. Your first choice matters most.
          </AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {PRIORITIES.map((option) => {
              const rank = preferences.priorities.indexOf(option.value);
              const selected = rank !== -1;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="checkbox"
                  accessibilityLabel={option.label}
                  accessibilityHint={selected ? `${CHOICE_ORDER[rank]}. Unselects this priority` : 'Adds this to your priorities'}
                  accessibilityState={{ checked: selected }}
                  aria-checked={selected}
                  onPress={() => togglePriority(option.value)}
                  {...(Platform.OS === 'web' ? {
                    // RN Web handles Enter for Pressable, but Space only for
                    // button roles. Checkbox cards also need Space activation.
                    onKeyDown: (event: KeyboardEvent) => {
                      if (event.key === ' ' || event.key === 'Spacebar') {
                        event.preventDefault();
                        if (!event.repeat) togglePriority(option.value);
                      }
                    },
                  } : {})}
                  style={({ pressed }) => ({
                    flexBasis: twoColumns ? '46%' : '100%', flexGrow: 1, minWidth: 0, minHeight: 48,
                    flexDirection: twoColumns ? 'column' : 'row', alignItems: twoColumns ? 'stretch' : 'center',
                    gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.lg,
                    borderWidth: selected || theme.clarity ? 2 : 1,
                    borderColor: selected ? theme.colors.selectedBorder : theme.clarity ? theme.colors.borderStrong : theme.colors.border,
                    backgroundColor: selected ? theme.colors.selectedBg : theme.colors.surface,
                    opacity: pressed ? 0.8 : 1,
                  })}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing.sm }}>
                    <HomeIcon name={option.icon} size={24} />
                    {twoColumns ? <AppText role="caption" color={selected ? 'primary' : 'textSecondary'}>
                      {selected ? `✓ ${CHOICE_ORDER[rank]}` : 'Not chosen'}
                    </AppText> : null}
                  </View>
                  <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xs }}>
                    <AppText role="bodyStrong">{option.label}</AppText>
                    {!twoColumns ? <AppText role="caption" color="textSecondary">
                      {selected ? CHOICE_ORDER[rank] : 'Not chosen'}
                    </AppText> : null}
                  </View>
                  {!twoColumns ? <AppText role="label" color={selected ? 'primary' : 'textSecondary'}>{selected ? '✓' : '+'}</AppText> : null}
                </Pressable>
              );
            })}
          </View>
          <AppText role="caption" color="textSecondary">
            Choices update suggestions only. Your home stays as it is until you apply an arrangement.
          </AppText>
        </View>

        <HomeRecommendationPanel
          recommendation={recommendation}
          currentLayout={ordered}
          recommendedLayout={recommendedLayout}
          guidanceLevel={preferences.guidanceLevel}
          layoutApplied={layoutApplied}
          manualOpen={manualOpen}
          status={status}
          onApplyLayout={applyRecommendation}
          onApplyGuidance={applyGuidanceSuggestion}
          onKeepLayout={() => router.replace('/home')}
          onToggleManual={() => setManualOpen((open) => !open)}
        >

        {manualOpen ? (
          <View style={{ gap: theme.spacing.md }}>
            <View style={{ gap: theme.spacing.xs }}>
              <AppText role="heading" accessibilityRole="header">Arrange your shortcuts</AppText>
              <AppText role="caption" color="textSecondary">
                Changes save immediately. Your manual choices stay until you apply another arrangement. Home shows the first four visible shortcuts.
              </AppText>
            </View>
            {ordered.map((widget, index) => (
              <AppCard key={widget.id} elevation="none">
                <View style={{ gap: theme.spacing.sm }}>
                  <AppText role="bodyStrong">{widget.title}</AppText>
                  <AppText role="caption" color="textSecondary">{index + 1} of {ordered.length} · {widget.visible ? 'Shown' : 'Hidden'}</AppText>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                    <AppButton label="↑" variant="secondary" fullWidth={false} disabled={index === 0}
                      onPress={() => move(index, -1)} accessibilityLabel={`Move ${widget.title} up`} />
                    <AppButton label="↓" variant="secondary" fullWidth={false} disabled={index === ordered.length - 1}
                      onPress={() => move(index, 1)} accessibilityLabel={`Move ${widget.title} down`} />
                    <AppButton label={widget.visible ? 'Hide' : 'Show'} variant="secondary" fullWidth={false}
                      onPress={() => toggleVisible(widget.id)} accessibilityLabel={`${widget.visible ? 'Hide' : 'Show'} ${widget.title}`} />
                  </View>
                </View>
              </AppCard>
            ))}
            <AppCard elevation="none">
              <View style={{ gap: theme.spacing.sm }}>
                <AppText role="subheading">Start fresh</AppText>
                <AppText role="caption" color="textSecondary">
                  Reset restores all default preferences and shortcuts, including language, voice, banking pace and display.
                </AppText>
                <AppButton label="Reset to standard" variant="secondary" onPress={() => {
                  dispatch({ type: 'RESET_PREFERENCES' });
                  announce('Personalisation reset to standard. Your transfer draft is unchanged.');
                }} />
              </View>
            </AppCard>
          </View>
        ) : null}
        </HomeRecommendationPanel>

        <AppButton label="More preferences in Settings" variant="ghost" onPress={() => router.push({ pathname: '/settings', params: { returnTo: '/customize' } })}
          accessibilityHint="Opens display, language and other preferences" />
      </View>
    </ScreenContainer>
  );
}
