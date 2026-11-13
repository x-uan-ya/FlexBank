import { useState, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppButton, AppCard, AppText, SelectableCard, ThemePreview } from '@/components';
import { BankingScreen } from '@/components/BankingScreen';
import { AdaptiveModeSwitcher, ReadabilityModeSwitcher, recommendHomeExperience } from '@/features/adaptive';
import { useAppDispatch, useHomeLayout, usePreferences } from '@/state';
import { useTheme } from '@/theme';
import { DEFAULT_HOME_LAYOUT } from '@/types/home';
import { bankingReturnRoute } from '@/utils/bankingNavigation';
import { GUIDANCE_LABELS, PRIORITY_LABELS, VISUAL_THEME_DESCRIPTIONS, VISUAL_THEME_LABELS,
  type Priority, type VisualTheme } from '@/types/preferences';

const PRIORITY_OPTIONS: Priority[] = ['payments', 'moneyManagement', 'guidance', 'accessibility'];
const THEME_OPTIONS: VisualTheme[] = ['classic', 'nature', 'playful', 'seasonal'];
const PACE_HELP = {
  quick: 'Quick keeps explanations short. You still review and confirm every transfer.',
  balanced: 'Balanced gives you a little guidance while keeping the task straightforward.',
  guided: 'Guided explains each step and helps you check the details with confidence.',
};
const DISPLAY_HELP = {
  standard: 'Standard uses the usual text size and spacing.',
  largeText: 'Large Text increases text size and spacing. Content can take more room on screen.',
  highClarity: 'High Clarity adds larger, stronger text and clearer boundaries between controls.',
};

export function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const prefs = usePreferences();
  const layout = useHomeLayout();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [moreOpen, setMoreOpen] = useState(false);
  const [status, setStatus] = useState('');
  const recommendation = recommendHomeExperience({ preferences: prefs, existingLayout: layout,
    approvedWidgetIds: DEFAULT_HOME_LAYOUT.map(widget => widget.id) });

  function announce(message: string) {
    setStatus(message);
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }

  function togglePriority(priority: Priority) {
    const selected = prefs.priorities.includes(priority);
    if (selected && prefs.priorities.length === 1) {
      announce('Keep at least one priority. Choose another before removing this one.');
      return;
    }
    const priorities = selected ? prefs.priorities.filter(item => item !== priority) : [...prefs.priorities, priority];
    dispatch({ type: 'SET_PREFERENCES', payload: { priorities } });
    announce('Priorities saved. Your homepage layout stays as it is until you apply an arrangement in Made for You.');
  }

  return <BankingScreen title="Settings" subtitle="Make FlexBank comfortable for you." backTo={bankingReturnRoute(returnTo)}>
    <Section title="Banking pace">
      <AdaptiveModeSwitcher title="Choose how much guidance you see" />
      <AppText role="caption" color="textSecondary">{PACE_HELP[prefs.guidanceLevel]}</AppText>
    </Section>

    <Section title="Readability">
      <ReadabilityModeSwitcher initiallyExpanded />
      <AppText role="caption" color="textSecondary">{DISPLAY_HELP[prefs.displayMode]}</AppText>
    </Section>

    <Section title="Personalisation">
      <AppCard elevation="none">
        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="subheading">Made for You</AppText>
          <AppText color="textSecondary">Choose your priorities and arrange the shortcuts you use most. Your saved layout changes only when you choose.</AppText>
          <AppButton label="Made for You" variant="secondary" onPress={() => router.push({ pathname: '/customize', params: { returnTo: '/settings' } })} />
        </View>
      </AppCard>
    </Section>

    <Section title="Savings & investments">
      <AppCard elevation="none">
        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="subheading">Savings Pockets</AppText>
          <AppText color="textSecondary">Organise your savings into goals like a holiday or emergency fund, and track your progress. Simulated demo only.</AppText>
          <AppButton label="Open Savings Pockets" variant="secondary" onPress={() => router.push('/savings')} />
        </View>
      </AppCard>
      <AppCard elevation="none">
        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="subheading">Investment Tracker</AppText>
          <AppText color="textSecondary">Monitor simulated fixed deposits and bonds, upcoming maturities and coupon dates. Estimates only, not advice.</AppText>
          <AppButton label="Open Investment Tracker" variant="secondary" onPress={() => router.push('/investments')} />
        </View>
      </AppCard>
    </Section>

    <Section title="Help">
      <AppButton label="Ask Banking Concierge" variant="secondary" onPress={() => router.push({ pathname: '/concierge', params: { returnTo: '/settings' } })} />
      <AppText role="caption" color="textSecondary">Plain-language demo explanations. Live AI and live banking support are not connected.</AppText>
    </Section>

    <AppCard elevation="none" style={{ backgroundColor: theme.colors.surfaceMuted }}>
      <View style={{ gap: theme.spacing.xs }}>
        <AppText role="subheading">About this demo</AppText>
        <AppText role="caption" color="textSecondary">FlexBank uses synthetic accounts and recipients. Transfers are simulated. No real money moves.</AppText>
      </View>
    </AppCard>

    <AppButton label={moreOpen ? 'Hide more preferences' : 'More preferences'} variant="secondary"
      accessibilityState={{ expanded: moreOpen }} aria-expanded={moreOpen} onPress={() => setMoreOpen(open => !open)}
      accessibilityHint="Shows saved priorities, visual themes and reset controls" />
    {moreOpen ? <View style={{ gap: theme.spacing.lg }}>
      <Section title="Saved priorities">
        <AppText role="caption" color="textSecondary">Choose all that apply. These update suggestions, not your saved shortcut arrangement.</AppText>
        {PRIORITY_OPTIONS.map(priority => <SelectableCard key={priority} title={PRIORITY_LABELS[priority]}
          control="checkbox" selected={prefs.priorities.includes(priority)} onPress={() => togglePriority(priority)} />)}
      </Section>

      <Section title="Appearance">
        <AppText role="caption" color="textSecondary">A visual style changes colours only. Readability and banking behaviour stay the same.</AppText>
        <View accessibilityRole="radiogroup" accessibilityLabel="Visual theme">
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.xs }}>
            {THEME_OPTIONS.map(visualTheme => <ThemePreview key={visualTheme} theme={visualTheme} roving
              label={VISUAL_THEME_LABELS[visualTheme]} description={VISUAL_THEME_DESCRIPTIONS[visualTheme]}
              selected={prefs.visualTheme === visualTheme}
              onPress={() => dispatch({ type: 'SET_VISUAL_THEME', payload: visualTheme })} />)}
          </ScrollView>
        </View>
      </Section>

      <Section title="How suggestions adapt">
        <AppText role="caption" color="textSecondary">Current pace: {GUIDANCE_LABELS[prefs.guidanceLevel]}. Based only on your choices:</AppText>
        {recommendation.reasons.map(reason => <AppText key={reason} role="caption" color="textSecondary">{reason}</AppText>)}
        <AppText role="caption" color="textSecondary">Review and accept a new arrangement in Made for You. Manual shortcut choices stay saved until you do.</AppText>
      </Section>

      <AppCard elevation="none">
        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="subheading">Reset personalisation</AppText>
          <AppText color="textSecondary">Reset restores all default preferences and shortcuts, including language, voice, banking pace, display and visual theme. Your transfer draft is kept.</AppText>
          <AppButton label="Reset to standard" variant="secondary" onPress={() => {
            dispatch({ type: 'RESET_PREFERENCES' });
            announce('Default preferences and shortcuts restored. Your transfer draft is unchanged.');
          }} />
        </View>
      </AppCard>
    </View> : null}
    <View accessibilityLiveRegion="polite">{status ? <AppText role="caption" color="textSecondary">{status}</AppText> : null}</View>
  </BankingScreen>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return <View style={{ gap: theme.spacing.sm }}>
    <AppText role="heading" accessibilityRole="header">{title}</AppText>
    {children}
  </View>;
}
