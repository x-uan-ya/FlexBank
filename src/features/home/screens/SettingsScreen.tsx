import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppText,
  Header,
  Icon,
  ScreenContainer,
  SelectableCard,
  ThemePreview,
} from '@/components';
import { useAppDispatch, usePreferences } from '@/state';
import { useTheme } from '@/theme';
import {
  DISPLAY_MODE_LABELS,
  GUIDANCE_LABELS,
  PRIORITY_LABELS,
  VISUAL_THEME_DESCRIPTIONS,
  VISUAL_THEME_LABELS,
  type DisplayMode,
  type GuidanceLevel,
  type Priority,
  type VisualTheme,
} from '@/types/preferences';

import { explainHomeConfig } from '../personalisationRules';

/**
 * Settings + personalisation (Developer A / UI lead).
 *
 * Lets the customer change guidance, display, priorities and visual theme at
 * any time. Every change dispatches immediately and is reflected across the app
 * without a restart (theme re-renders from preferences; home re-reads its
 * deterministic config). Includes a clear note that these settings change the
 * INTERFACE, not banking permissions, and a reset-to-standard.
 */

const GUIDANCE_OPTIONS: GuidanceLevel[] = ['quick', 'balanced', 'guided'];
const DISPLAY_OPTIONS: DisplayMode[] = ['standard', 'largeText', 'highClarity'];
const PRIORITY_OPTIONS: Priority[] = ['payments', 'moneyManagement', 'guidance', 'accessibility'];
const THEME_OPTIONS: VisualTheme[] = ['classic', 'nature', 'playful', 'seasonal'];

export function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const prefs = usePreferences();

  function togglePriority(p: Priority) {
    const next = prefs.priorities.includes(p)
      ? prefs.priorities.filter((x) => x !== p)
      : [...prefs.priorities, p];
    // Keep at least one priority so the home layout always has a driver.
    dispatch({ type: 'SET_PREFERENCES', payload: { priorities: next.length ? next : ['payments'] } });
  }

  const reasons = explainHomeConfig(prefs);

  return (
    <ScreenContainer scroll>
      <Header
        title="Settings"
        subtitle="Change how FlexBank looks and guides you"
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      {/* Explanatory note */}
      <AppCard style={{ borderColor: theme.colors.accent }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Icon name="info" size={18} color={theme.colors.accent} />
          <AppText role="caption" color="textSecondary" style={{ flex: 1 }}>
            These settings change the interface only. They never change your
            banking permissions, your balances, or any security requirement. You
            can change them anytime.
          </AppText>
        </View>
      </AppCard>

      <Group title="Guidance level">
        {GUIDANCE_OPTIONS.map((g) => (
          <SelectableCard
            key={g}
            title={GUIDANCE_LABELS[g]}
            selected={prefs.guidanceLevel === g}
            onPress={() => dispatch({ type: 'SET_PREFERENCES', payload: { guidanceLevel: g } })}
          />
        ))}
      </Group>

      <Group title="Display">
        {DISPLAY_OPTIONS.map((d) => (
          <SelectableCard
            key={d}
            title={DISPLAY_MODE_LABELS[d]}
            selected={prefs.displayMode === d}
            onPress={() => dispatch({ type: 'SET_DISPLAY_MODE', payload: d })}
          />
        ))}
      </Group>

      <Group title="Banking priorities" hint="Choose all that apply.">
        {PRIORITY_OPTIONS.map((p) => (
          <SelectableCard
            key={p}
            control="checkbox"
            title={PRIORITY_LABELS[p]}
            selected={prefs.priorities.includes(p)}
            onPress={() => togglePriority(p)}
          />
        ))}
      </Group>

      <Group title="Visual theme" hint="Cosmetic only — never affects your banking.">
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
              selected={prefs.visualTheme === t}
              onPress={() => dispatch({ type: 'SET_VISUAL_THEME', payload: t })}
            />
          ))}
        </ScrollView>
      </Group>

      {/* Transparency: why the home looks the way it does. */}
      {reasons.length > 0 ? (
        <Group title="How your home adapts">
          <AppCard>
            <View style={{ gap: theme.spacing.xs }}>
              {reasons.map((r) => (
                <View key={r} style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
                  <Icon name="check" size={14} color={theme.colors.success} />
                  <AppText role="caption" color="textSecondary" style={{ flex: 1 }}>
                    {r}
                  </AppText>
                </View>
              ))}
            </View>
          </AppCard>
        </Group>
      ) : null}

      <AppButton
        label="Reset to standard"
        variant="secondary"
        onPress={() => dispatch({ type: 'RESET_PREFERENCES' })}
      />
      <View style={{ height: theme.spacing.md }} />
    </ScreenContainer>
  );
}

function Group({
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
    <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}>
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
