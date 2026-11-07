import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AppCard, AppText, type IconName } from '@/components';
import { useTheme } from '@/theme';
import type { HomeWidget, HomeWidgetType } from '@/types/home';
import { HomeIcon } from './HomeIcon';

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

const ICON_FOR_TYPE: Record<HomeWidgetType, IconName> = {
  paynow: 'paynow',
  transfer: 'transfer',
  bills: 'bill',
  accounts: 'accounts',
  spending: 'insights',
  recentRecipients: 'profile',
  concierge: 'info',
  help: 'help',
};

export function WidgetRenderer({
  widget,
  compact = false,
  onPress,
  availableAbove = false,
}: {
  widget: HomeWidget;
  compact?: boolean;
  /** Home may supply a demo summary or disclosure instead of a route. */
  onPress?: () => void;
  /** Compact reference to an action already prominent above; preserves its action. */
  availableAbove?: boolean;
}) {
  const theme = useTheme();
  const router = useRouter();

  if (!widget.visible) return null;

  const subtitle = SUBTITLE_FOR_TYPE[widget.type];
  const dashboardHint = widget.type === 'transfer' ? 'Shows transfer demo availability'
    : widget.type === 'bills' ? 'Opens the bill payment preview'
    : widget.type === 'recentRecipients' ? 'Start PayNow to choose a saved recipient'
    : subtitle;

  if (compact && availableAbove) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${widget.title}, available in payment actions above`}
        accessibilityHint={dashboardHint}
        onPress={onPress ?? (() => router.push(ROUTE_FOR_TYPE[widget.type]))}
        style={({ pressed }) => ({
          minHeight: 48,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          paddingVertical: theme.spacing.sm,
          paddingHorizontal: theme.spacing.sm,
          borderRadius: theme.radius.md,
          borderWidth: theme.clarity ? 2 : 1,
          borderColor: theme.clarity ? theme.colors.borderStrong : theme.colors.border,
          backgroundColor: pressed ? theme.colors.selectedBg : theme.colors.background,
        })}
      >
        <HomeIcon name={ICON_FOR_TYPE[widget.type]} size={20} />
        <AppText role="label" style={{ flex: 1, minWidth: 0 }}>{widget.title}</AppText>
        <AppText role="caption" color="textSecondary" style={{ flexShrink: 1, maxWidth: '50%', textAlign: 'right' }}>
          Available above
        </AppText>
        <HomeIcon name="chevron" size={18} color={theme.colors.textSecondary} />
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={widget.title}
      accessibilityHint={onPress ? dashboardHint : subtitle}
      onPress={onPress ?? (() => router.push(ROUTE_FOR_TYPE[widget.type]))}
      style={({ pressed }) => ({ flex: compact ? 1 : undefined, opacity: pressed ? 0.75 : 1 })}
    >
      <AppCard style={compact ? {
        minHeight: 96, flex: 1, paddingHorizontal: theme.spacing.sm,
        borderRadius: theme.radius.lg, justifyContent: 'center',
      } : undefined}>
        <View
          style={{
            gap: theme.spacing.sm,
            alignItems: compact ? 'center' : 'flex-start',
          }}
        >
          {compact ? (
            <HomeIcon
              name={ICON_FOR_TYPE[widget.type]}
              size={28}
              color={theme.colors.primary}
            />
          ) : null}
          <AppText role={compact ? 'label' : 'subheading'} center={compact}>
            {widget.title}
          </AppText>
          {subtitle && !compact ? (
            <AppText role="caption" color="textSecondary">
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </AppCard>
    </Pressable>
  );
}
