import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppText,
  ScreenContainer,
} from '@/components';
import { useAppDispatch } from '@/state';
import { useTheme } from '@/theme';
import {
  DISPLAY_MODE_LABELS,
  GUIDANCE_LABELS,
  PRIORITY_LABELS,
  type DisplayMode,
  type GuidanceLevel,
  type Priority,
} from '@/types/preferences';

import { personalisation } from '../personalisation';

/**
 * Onboarding starter (Developer A to expand).
 *
 * Captures EXPLICIT preferences and writes them to session state, then builds a
 * personalised home layout and completes onboarding. This is intentionally
 * simple — Dev A owns the richer personalisation UX.
 *
 * SAFETY: every value here is a deliberate customer choice. Nothing is inferred.
 */

const GUIDANCE_OPTIONS: GuidanceLevel[] = ['quick', 'balanced', 'guided'];
const DISPLAY_OPTIONS: DisplayMode[] = ['standard', 'largeText', 'highClarity'];
const PRIORITY_OPTIONS: Priority[] = [
  'payments',
  'moneyManagement',
  'guidance',
  'accessibility',
];

export function OnboardingScreen() {
  const theme = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();

  const [guidanceLevel, setGuidanceLevel] = useState<GuidanceLevel>('balanced');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('standard');
  const [priorities, setPriorities] = useState<Priority[]>(['payments']);

  function togglePriority(p: Priority) {
    setPriorities((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  function finish() {
    const prefs = {
      language: 'en' as const,
      guidanceLevel,
      displayMode,
      priorities: priorities.length ? priorities : (['payments'] as Priority[]),
      voiceEnabled: false,
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
      footer={<AppButton label="Start banking" onPress={finish} />}
    >
      <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.lg }}>
        <AppText role="display">Welcome to FlexBank</AppText>
        <AppText role="body" color="textSecondary">
          Tell us how you would like to bank. You are in control and can change
          any of this later.
        </AppText>
      </View>

      <ChoiceGroup
        title="How much guidance do you want?"
        options={GUIDANCE_OPTIONS}
        selected={[guidanceLevel]}
        labelFor={(o) => GUIDANCE_LABELS[o]}
        onSelect={setGuidanceLevel}
      />

      <ChoiceGroup
        title="Display"
        options={DISPLAY_OPTIONS}
        selected={[displayMode]}
        labelFor={(o) => DISPLAY_MODE_LABELS[o]}
        onSelect={setDisplayMode}
      />

      <ChoiceGroup
        title="What matters most to you? (choose any)"
        options={PRIORITY_OPTIONS}
        selected={priorities}
        labelFor={(o) => PRIORITY_LABELS[o]}
        onSelect={togglePriority}
        multi
      />

      {/* TODO: PERSONALISATION FEATURE — Dev A: expand onboarding (language,
          voice, richer priority ordering, progress steps, etc.). */}
    </ScreenContainer>
  );
}

interface ChoiceGroupProps<T extends string> {
  title: string;
  options: T[];
  selected: T[];
  labelFor: (o: T) => string;
  onSelect: (o: T) => void;
  multi?: boolean;
}

function ChoiceGroup<T extends string>({
  title,
  options,
  selected,
  labelFor,
  onSelect,
}: ChoiceGroupProps<T>) {
  const theme = useTheme();
  return (
    <AppCard>
      <View style={{ gap: theme.spacing.sm }}>
        <AppText role="subheading">{title}</AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {options.map((option) => {
            const isSelected = selected.includes(option);
            return (
              <AppButton
                key={option}
                label={labelFor(option)}
                variant={isSelected ? 'primary' : 'secondary'}
                fullWidth={false}
                onPress={() => onSelect(option)}
                accessibilityHint={isSelected ? 'Selected' : 'Not selected'}
              />
            );
          })}
        </View>
      </View>
    </AppCard>
  );
}
