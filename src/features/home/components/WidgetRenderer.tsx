import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AppCard, AppText } from '@/components';
import { useTheme } from '@/theme';
import type { HomeWidget, HomeWidgetType } from '@/types/home';

/**
 * Renders a single home widget by type. The FOUNDATION provides a simple,
 * tappable card for each widget that routes somewhere sensible. Dev A can make
 * these richer (balances, charts, recent lists) — keep the `widget` prop shape.
 *
 * Every widget routes to a real or placeholder screen so no feature is a dead
 * end (safety principle 3: never remove access).
 */

const ROUTE_FOR_TYPE: Record<HomeWidgetType, Href> = {
  paynow: '/paynow',
  transfer: '/paynow',
  bills: '/paynow',
  accounts: '/home',
  spending: '/home',
  recentRecipients: '/paynow/recipient',
  concierge: '/concierge',
  help: '/human-assistance',
};

const SUBTITLE_FOR_TYPE: Partial<Record<HomeWidgetType, string>> = {
  paynow: 'Send money instantly',
  transfer: 'Move money between accounts',
  bills: 'Pay a bill',
  accounts: 'View balances',
  spending: 'See where your money goes',
  recentRecipients: 'Pay someone again',
  concierge: 'Ask for a plain-language explanation',
  help: 'Get help from a person',
};

export function WidgetRenderer({ widget }: { widget: HomeWidget }) {
  const theme = useTheme();
  const router = useRouter();

  if (!widget.visible) return null;

  const subtitle = SUBTITLE_FOR_TYPE[widget.type];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={widget.title}
      accessibilityHint={subtitle}
      onPress={() => router.push(ROUTE_FOR_TYPE[widget.type])}
      style={({ pressed }) => (pressed ? { opacity: 0.9 } : null)}
    >
      <AppCard>
        <View style={{ gap: theme.spacing.xs }}>
          <AppText role="subheading">{widget.title}</AppText>
          {subtitle ? (
            <AppText role="caption" color="textSecondary">
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </AppCard>
    </Pressable>
  );
}
