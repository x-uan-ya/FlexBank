import { useRef, type KeyboardEvent } from 'react';
import {
  AccessibilityInfo,
  Platform,
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
  title = 'Banking pace',
}: AdaptiveModeSwitcherProps) {
  const theme = useTheme();
  const preferences = usePreferences();
  const dispatch = useAppDispatch();
  const options = useRef<Array<View | null>>([]);

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
        <AppText role="label">{title}</AppText>

        <View
          accessibilityLabel="Experience mode"
          accessibilityRole="radiogroup"
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: theme.spacing.sm,
          }}
        >
          {GUIDANCE_LEVELS.map((level, index) => {
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
                aria-checked={selected}
                onPress={() => selectMode(level)}
                {...(Platform.OS === 'web' ? {
                  ref: (node: View | null) => { options.current[index] = node; },
                  tabIndex: selected ? 0 as const : -1 as const,
                  onKeyDown: (event: KeyboardEvent) => {
                    const next = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? (index + 1) % GUIDANCE_LEVELS.length
                      : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? (index + GUIDANCE_LEVELS.length - 1) % GUIDANCE_LEVELS.length
                      : event.key === 'Home' ? 0 : event.key === 'End' ? GUIDANCE_LEVELS.length - 1
                      : event.key === ' ' ? index : undefined;
                    if (next === undefined) return;
                    event.preventDefault();
                    selectMode(GUIDANCE_LEVELS[next]);
                    options.current[next]?.focus();
                  },
                } : {})}
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
