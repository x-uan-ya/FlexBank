import {
  AccessibilityInfo,
  Pressable,
  View,
  type ViewStyle,
} from 'react-native';

import { AppCard, AppText } from '@/components';
import { useAppDispatch, usePreferences } from '@/state';
import { useTheme } from '@/theme';
import {
  GUIDANCE_LABELS,
  type GuidanceLevel,
} from '@/types/preferences';

const GUIDANCE_LEVELS: GuidanceLevel[] = ['quick', 'balanced', 'guided'];

interface AdaptiveModeSwitcherProps {
  /** Optional heading override when the switcher is used outside PayNow. */
  title?: string;
}

/**
 * Changes only the customer's persistent guidance preference.
 *
 * The switcher deliberately has no navigation or PayNow dependencies, so a
 * mode change cannot restart, advance, validate, or confirm a transaction.
 * Temporary safety/assistance state (`interactionMode`) remains independent.
 */
export function AdaptiveModeSwitcher({
  title = 'Experience mode',
}: AdaptiveModeSwitcherProps) {
  const theme = useTheme();
  const preferences = usePreferences();
  const dispatch = useAppDispatch();

  function selectMode(guidanceLevel: GuidanceLevel) {
    if (guidanceLevel === preferences.guidanceLevel) return;
    dispatch({ type: 'SET_PREFERENCES', payload: { guidanceLevel } });
    AccessibilityInfo.announceForAccessibility(
      `${GUIDANCE_LABELS[guidanceLevel]} experience mode selected`,
    );
  }

  return (
    <AppCard elevation="none">
      <View style={{ gap: theme.spacing.sm }}>
        <View style={{ gap: theme.spacing.xs }}>
          <AppText role="label">{title}</AppText>
          <AppText role="caption" color="textSecondary">
            Change the amount of guidance without leaving this transfer.
          </AppText>
        </View>

        <View
          accessibilityLabel="Experience mode"
          accessibilityRole="radiogroup"
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.sm,
          }}
        >
          {GUIDANCE_LEVELS.map((level) => {
            const selected = preferences.guidanceLevel === level;
            const optionStyle: ViewStyle = {
              flexGrow: 1,
              flexBasis: theme.mode === 'standard' ? 88 : 128,
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.sm,
              borderRadius: theme.radius.md,
              borderWidth: selected || theme.clarity ? 2 : 1,
              borderColor: selected
                ? theme.colors.selectedBorder
                : theme.colors.border,
              backgroundColor: selected
                ? theme.colors.selectedBg
                : theme.colors.background,
            };

            return (
              <Pressable
                key={level}
                accessibilityRole="radio"
                accessibilityLabel={`${GUIDANCE_LABELS[level]} mode`}
                accessibilityHint="Changes how much guidance the interface shows"
                accessibilityState={{ checked: selected, selected }}
                onPress={() => selectMode(level)}
                style={({ pressed }) => [
                  optionStyle,
                  pressed ? { opacity: 0.85 } : null,
                ]}
              >
                <AppText
                  role="label"
                  color={selected ? 'primary' : 'textSecondary'}
                  center
                >
                  {selected ? '✓ ' : ''}
                  {GUIDANCE_LABELS[level]}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </AppCard>
  );
}
