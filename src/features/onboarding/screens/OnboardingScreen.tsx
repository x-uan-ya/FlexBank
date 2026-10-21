import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppText,
  Icon,
  ScreenContainer,
  SelectableCard,
  ThemePreview,
} from '@/components';
import { useAppDispatch } from '@/state';
import { useTheme } from '@/theme';
import {
  DISPLAY_MODE_LABELS,
  GUIDANCE_LABELS,
  PRIORITY_LABELS,
  VISUAL_THEME_DESCRIPTIONS,
  VISUAL_THEME_LABELS,
  type CustomerPreferences,
  type DisplayMode,
  type GuidanceLevel,
  type Priority,
  type VisualTheme,
} from '@/types/preferences';

import { personalisation } from '../personalisation';

/**
 * Welcome + personalisation onboarding (Developer A / UI lead).
 *
 * Captures EXPLICIT customer choices for guidance, display, priorities and a
 * cosmetic visual theme, then writes them to session state and builds a
 * personalised home layout. Nothing here is inferred from sensitive signals.
 */

const GUIDANCE_OPTIONS: { value: GuidanceLevel; description: string }[] = [
  { value: 'quick', description: 'Get things done with fewer steps.' },
  { value: 'balanced', description: 'A comfortable mix of speed and support.' },
  { value: 'guided', description: 'Clear explanations, one step at a time.' },
];

const DISPLAY_OPTIONS: { value: DisplayMode; description: string }[] = [
  { value: 'standard', description: 'Normal typography and spacing.' },
  { value: 'largeText', description: 'Larger text and resized controls.' },
  { value: 'highClarity', description: 'Stronger contrast and clearer boundaries.' },
];

const PRIORITY_OPTIONS: { value: Priority; description: string }[] = [
  { value: 'payments', description: 'Transfers, PayNow and quick payments.' },
  { value: 'moneyManagement', description: 'Spending insights and savings goals.' },
  { value: 'guidance', description: 'Helpful explanations along the way.' },
  { value: 'accessibility', description: 'Readability and clarity settings.' },
];

const THEME_OPTIONS: VisualTheme[] = ['classic', 'nature', 'playful', 'seasonal'];

export function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [guidanceLevel, setGuidanceLevel] = useState<GuidanceLevel>('balanced');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('standard');
  const [priorities, setPriorities] = useState<Priority[]>(['payments']);
  const [visualTheme, setVisualTheme] = useState<VisualTheme>('classic');

  function togglePriority(p: Priority) {
    setPriorities((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  function finish() {
    // Validate: ensure at least one priority is chosen (default to payments).
    const chosen: Priority[] = priorities.length ? priorities : ['payments'];

    const prefs: CustomerPreferences = {
      language: 'en',
      guidanceLevel,
      displayMode,
      priorities: chosen,
      voiceEnabled: false,
      visualTheme,
    };

    dispatch({ type: 'SET_PREFERENCES', payload: prefs });
    dispatch({
      type: 'SET_HOME_LAYOUT',
      payload: personalisation.getPersonalisedHomeLayout(prefs),
    });
    dispatch({ type: 'COMPLETE_ONBOARDING' });
    router.replace('/home');
  }

  return (
    <ScreenContainer
      scroll
      footer={
        <AppButton
          label="Continue"
          onPress={finish}
          accessibilityHint="Saves your choices and opens your home screen"
        />
      }
    >
      {/* Header */}
      <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.md }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.xs,
          }}
        >
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.primary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AppText role="heading" style={{ color: theme.colors.onPrimary }}>
              F
            </AppText>
          </View>
          <AppText role="heading" color="primary">
            FlexBank
          </AppText>
        </View>

        <AppText role="display">Welcome to FlexBank</AppText>
        <AppText role="subheading" color="textSecondary">
          Your banking experience, your way.
        </AppText>
        <AppText role="body" color="textMuted">
          Choose what works for you. You can change these settings anytime.
        </AppText>
      </View>

      {/* Section A — Guidance */}
      <Section
        title="How much guidance do you want?"
        hint="Changes how much explanation and how many steps you see."
      >
        {GUIDANCE_OPTIONS.map((o) => (
          <SelectableCard
            key={o.value}
            title={GUIDANCE_LABELS[o.value]}
            description={o.description}
            selected={guidanceLevel === o.value}
            onPress={() => setGuidanceLevel(o.value)}
          />
        ))}
      </Section>

      {/* Section B — Display */}
      <Section
        title="Choose your display"
        hint="A real accessibility setting — it changes text size and contrast across the app."
      >
        {DISPLAY_OPTIONS.map((o) => (
          <SelectableCard
            key={o.value}
            title={DISPLAY_MODE_LABELS[o.value]}
            description={o.description}
            selected={displayMode === o.value}
            onPress={() => setDisplayMode(o.value)}
          />
        ))}
      </Section>

      {/* Section C — Priorities (multi-select) */}
      <Section title="What matters most to you?" hint="Choose all that apply.">
        {PRIORITY_OPTIONS.map((o) => (
          <SelectableCard
            key={o.value}
            control="checkbox"
            title={PRIORITY_LABELS[o.value]}
            description={o.description}
            selected={priorities.includes(o.value)}
            onPress={() => togglePriority(o.value)}
          />
        ))}
      </Section>

      {/* Section D — Visual theme */}
      <Section
        title="Choose your style"
        hint="A visual theme only. It never changes your banking or security."
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.xs }}
        >
          {THEME_OPTIONS.map((t) => (
            <ThemePreview
              key={t}
              theme={t}
              label={VISUAL_THEME_LABELS[t]}
              description={VISUAL_THEME_DESCRIPTIONS[t]}
              selected={visualTheme === t}
              onPress={() => setVisualTheme(t)}
            />
          ))}
        </ScrollView>
      </Section>

      <View
        style={{
          flexDirection: 'row',
          gap: theme.spacing.sm,
          alignItems: 'flex-start',
          paddingBottom: theme.spacing.sm,
        }}
      >
        <Icon name="shield" size={16} color={theme.colors.textMuted} />
        <AppText role="caption" color="textMuted" style={{ flex: 1 }}>
          You are always in control. These choices change how the app looks and
          guides you, not your banking permissions. Synthetic demo data only.
        </AppText>
      </View>
    </ScreenContainer>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
      <View style={{ gap: 2 }}>
        <AppText role="heading">{title}</AppText>
        {hint ? (
          <AppText role="caption" color="textSecondary">
            {hint}
          </AppText>
        ) : null}
      </View>
      <View style={{ gap: theme.spacing.sm }}>{children}</View>
    </View>
  );
}
