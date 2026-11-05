import { useState } from 'react';
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
  DISPLAY_MODE_LABELS,
  type DisplayMode,
} from '@/types/preferences';

const DISPLAY_MODES: DisplayMode[] = ['standard', 'largeText', 'highClarity'];

/**
 * Compact, expandable display preference control for use during transactions.
 * It changes presentation only and has no navigation or PayNow dependencies.
 */
export function ReadabilityModeSwitcher() {
  const theme = useTheme();
  const preferences = usePreferences();
  const dispatch = useAppDispatch();
  const [expanded, setExpanded] = useState(false);

  function selectMode(displayMode: DisplayMode) {
    if (displayMode === preferences.displayMode) return;
    dispatch({ type: 'SET_DISPLAY_MODE', payload: displayMode });
    AccessibilityInfo.announceForAccessibility(
      `${DISPLAY_MODE_LABELS[displayMode]} display selected`,
    );
  }

  return (
    <AppCard elevation="none">
      <View style={{ gap: theme.spacing.sm }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Readability, ${DISPLAY_MODE_LABELS[preferences.displayMode]}`}
          accessibilityHint={expanded ? 'Hides display options' : 'Shows display options'}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded((value) => !value)}
          style={({ pressed }) => ({
            minHeight: 48,
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: theme.spacing.sm,
            opacity: pressed ? 0.85 : 1,
          })}
        >
          <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 140 }}>
            <AppText role="label">Readability</AppText>
            <AppText role="caption" color="textSecondary">
              {DISPLAY_MODE_LABELS[preferences.displayMode]}
            </AppText>
          </View>
          <AppText role="label" color="primary">
            {expanded ? 'Hide options' : 'Change display'}
          </AppText>
        </Pressable>

        {expanded ? (
          <View
            accessibilityLabel="Readability mode"
            accessibilityRole="radiogroup"
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: theme.spacing.sm,
            }}
          >
            {DISPLAY_MODES.map((mode) => {
              const selected = preferences.displayMode === mode;
              const optionStyle: ViewStyle = {
                flexGrow: 1,
                flexBasis: theme.mode === 'standard' ? 104 : 144,
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
                  key={mode}
                  accessibilityRole="radio"
                  accessibilityLabel={DISPLAY_MODE_LABELS[mode]}
                  accessibilityHint="Changes text size, spacing and visual clarity"
                  accessibilityState={{ checked: selected, selected }}
                  onPress={() => selectMode(mode)}
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
                    {DISPLAY_MODE_LABELS[mode]}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>
    </AppCard>
  );
}
