import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppText,
  Header,
  Icon,
  type IconName,
  ScreenContainer,
  SelectableCard,
  ThemePreview,
} from '@/components';
import { useAuth, usePreferences } from '@/state';
import { useTheme } from '@/theme';
import {
  BANKING_PURPOSES,
  DISPLAY_MODE_LABELS,
  GUIDANCE_LABELS,
  LANGUAGE_LABELS,
  VISUAL_THEME_DESCRIPTIONS,
  VISUAL_THEME_LABELS,
  type BankingPurpose,
  type CustomerPreferences,
  type DisplayMode,
  type GuidanceLevel,
  type Language,
  type VisualTheme,
} from '@/types/preferences';

/**
 * Settings + personalisation (integration lead).
 *
 * Lets the signed-in customer change banking purposes, guidance, display,
 * language and visual theme at any time. Every change is persisted for the
 * user (via authService) AND applied to session state immediately, so the home
 * re-personalises without a restart. Includes a clear note that these settings
 * change the INTERFACE, not banking permissions, plus logout + reset.
 */

const GUIDANCE_OPTIONS: GuidanceLevel[] = ['quick', 'balanced', 'guided'];
const DISPLAY_OPTIONS: DisplayMode[] = ['standard', 'largeText', 'highClarity'];
const LANGUAGE_OPTIONS: Language[] = ['en', 'zh'];
const THEME_OPTIONS: VisualTheme[] = ['classic', 'nature', 'playful', 'seasonal'];

export function SettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { savePreferences, logout } = useAuth();
  const prefs = usePreferences();

  /** Persist a preference change for the signed-in user + apply it live. */
  function update(patch: Partial<CustomerPreferences>) {
    void savePreferences({ ...prefs, ...patch });
  }

  function togglePurpose(p: BankingPurpose) {
    const next = prefs.bankingPurposes.includes(p)
      ? prefs.bankingPurposes.filter((x) => x !== p)
      : [...prefs.bankingPurposes, p];
    // Keep at least one purpose so the home always has a driver.
    update({ bankingPurposes: next.length ? next : ['everyday'] });
  }

  async function onLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <ScreenContainer scroll>
      <Header
        title="Settings"
        subtitle="Change how FlexBank works for you"
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      {/* Explanatory note */}
      <AppCard style={{ borderColor: theme.colors.accent }}>
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Icon name="info" size={18} color={theme.colors.accent} />
          <AppText role="caption" color="textSecondary" style={{ flex: 1 }}>
            These settings change the interface and what we prioritise on your
            home. They never change your banking permissions, your balances, or
            any security requirement. You can change them anytime.
          </AppText>
        </View>
      </AppCard>

      <Group title="Banking purposes" hint="What you mainly use banking for. This shapes your home.">
        {BANKING_PURPOSES.map((p) => (
          <SelectableCard
            key={p.key}
            control="checkbox"
            title={p.label}
            description={p.description}
            selected={prefs.bankingPurposes.includes(p.key)}
            onPress={() => togglePurpose(p.key)}
            leading={
              <Icon
                name={p.icon as IconName}
                size={20}
                color={theme.colors.primary}
                circle
                circleColor={theme.colors.accentSoft}
                circleSize={44}
              />
            }
          />
        ))}
      </Group>

      <Group title="Guidance level">
        {GUIDANCE_OPTIONS.map((g) => (
          <SelectableCard
            key={g}
            title={GUIDANCE_LABELS[g]}
            selected={prefs.guidanceLevel === g}
            onPress={() => update({ guidanceLevel: g })}
          />
        ))}
      </Group>

      <Group title="Display">
        {DISPLAY_OPTIONS.map((d) => (
          <SelectableCard
            key={d}
            title={DISPLAY_MODE_LABELS[d]}
            selected={prefs.displayMode === d}
            onPress={() => update({ displayMode: d })}
          />
        ))}
      </Group>

      <Group title="Language">
        {LANGUAGE_OPTIONS.map((l) => (
          <SelectableCard
            key={l}
            title={LANGUAGE_LABELS[l]}
            selected={prefs.language === l}
            onPress={() => update({ language: l })}
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
              onPress={() => update({ visualTheme: t })}
            />
          ))}
        </ScrollView>
      </Group>

      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        <AppButton label="Log out" variant="secondary" onPress={onLogout} />
      </View>
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
