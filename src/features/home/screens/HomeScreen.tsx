import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppCard, AppText, ScreenContainer } from '@/components';
import { MOCK_ACCOUNTS } from '@/data';
import { useHomeLayout, usePreferences } from '@/state';
import { useTheme } from '@/theme';
import { formatMoney } from '@/utils';

import { WidgetRenderer } from '../components/WidgetRenderer';

/**
 * Adaptive homepage (Developer A).
 *
 * Renders widgets in the order provided by `homeLayout` (which Dev A derives
 * from preferences via `personalisation.getPersonalisedHomeLayout`). The
 * foundation simply iterates the ordered array — no personalisation logic lives
 * in the view itself, so Dev A controls ordering from one place.
 */

export function HomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const layout = useHomeLayout();
  const prefs = usePreferences();

  const primary = MOCK_ACCOUNTS[0];

  const ordered = [...layout].sort((a, b) => a.position - b.position);

  return (
    <ScreenContainer>
      <View style={{ marginTop: theme.spacing.md, gap: theme.spacing.xs }}>
        <AppText role="caption" color="textSecondary">
          Good to see you
        </AppText>
        <AppText role="title">Your money</AppText>
      </View>

      {/* Account summary (synthetic). */}
      <AppCard elevation="md">
        <View style={{ gap: theme.spacing.xs }}>
          <AppText role="label" color="textSecondary">
            {primary.name} {primary.maskedNumber}
          </AppText>
          <AppText role="display">{formatMoney(primary.balance, primary.currency)}</AppText>
          <AppText role="caption" color="textMuted">
            Simulated balance • synthetic demo data
          </AppText>
        </View>
      </AppCard>

      {/* Adaptive widgets, rendered in personalised order. */}
      <View style={{ gap: theme.spacing.sm }}>
        {ordered.map((widget) => (
          <WidgetRenderer key={widget.id} widget={widget} />
        ))}
      </View>

      {/* Customisation entry point (Dev A owns the customize screen). */}
      <AppText
        role="label"
        color="accent"
        onPress={() => router.push('/customize')}
        accessibilityRole="link"
        style={{ marginTop: theme.spacing.sm }}
      >
        Customise my homepage
      </AppText>

      <AppText role="caption" color="textMuted">
        Guidance level: {prefs.guidanceLevel} • Display: {prefs.displayMode}
      </AppText>

      {/* TODO: PERSONALISATION FEATURE — Dev A: richer widgets (balances,
          spending insights, recent recipients preview). */}
    </ScreenContainer>
  );
}
