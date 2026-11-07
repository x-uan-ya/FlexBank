import { useState } from 'react';
import { Platform, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Icon } from '@/components';
import { DEMO_PERSONAS } from '@/data';
import { useAppDispatch, usePreferences } from '@/state';
import { useTheme } from '@/theme';
import { personalisation } from '@/features/onboarding/personalisation';

/**
 * Demo Mode control — DEVELOPMENT / DEMO ONLY.
 *
 * A collapsible panel in normal layout flow to switch synthetic personas
 * during a demo. It only renders in development (`__DEV__`). These personas are
 * explicit preference bundles, NOT inferred customer categories.
 *
 * Switching a persona dispatches SET_PREFERENCES + rebuilds the home layout, so
 * the whole app (theme, homepage order, guidance) adapts instantly.
 */
export function DemoBar() {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const prefs = usePreferences();
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();

  if (!__DEV__) return null;

  function applyPersona(id: (typeof DEMO_PERSONAS)[number]['id']) {
    const persona = DEMO_PERSONAS.find((p) => p.id === id);
    if (!persona) return;
    dispatch({ type: 'SET_PREFERENCES', payload: persona.preferences });
    dispatch({
      type: 'SET_HOME_LAYOUT',
      payload: personalisation.getPersonalisedHomeLayout(persona.preferences),
    });
    setOpen(false);
  }

  return (
    <View
      style={{
        flexShrink: 0,
        borderTopWidth: theme.clarity ? 2 : 1,
        borderColor: theme.colors.borderStrong,
        backgroundColor: theme.colors.surfaceMuted,
        paddingBottom: insets.bottom,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? 'Close development tools' : 'Open development tools'}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={({ pressed }) => ({
          minHeight: 48,
          paddingLeft: theme.spacing.md + (Platform.OS === 'web' ? 40 : 0),
          paddingRight: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
          gap: theme.spacing.sm,
          backgroundColor: pressed ? theme.colors.selectedBg : undefined,
        })}
      >
        <AppText role="label" style={{ flex: 1 }}>Development tools</AppText>
        <View accessible={false}>
          <Icon name={open ? 'back' : 'chevron'} color={theme.colors.textSecondary} />
        </View>
      </Pressable>
      {open ? (
        <ScrollView
          style={{
            maxHeight: Math.min(240, height * 0.3),
          }}
          contentContainerStyle={{
            padding: theme.spacing.md,
            paddingBottom: theme.spacing.md + (Platform.OS === 'web' ? 48 : 0),
            gap: theme.spacing.xs,
          }}
        >
          <AppText role="caption" color="textSecondary">
            Demo presets replace guidance, display preferences and the home layout.
            Current display: {prefs.displayMode}.
          </AppText>
          {DEMO_PERSONAS.map((persona) => (
            <Pressable
              key={persona.id}
              accessibilityRole="button"
              accessibilityLabel={`Apply demo preset: ${persona.label}`}
              onPress={() => applyPersona(persona.id)}
              style={({ pressed }) => ({
                minHeight: 48,
                paddingVertical: theme.spacing.sm,
                paddingHorizontal: theme.spacing.sm,
                borderRadius: theme.radius.md,
                backgroundColor: pressed ? theme.colors.selectedBg : theme.colors.surface,
                borderWidth: theme.clarity ? 2 : 1,
                borderColor: theme.colors.borderStrong,
              })}
            >
              <AppText role="label">
                {persona.label}
              </AppText>
              <AppText role="caption" color="textSecondary">
                {persona.description}
              </AppText>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
}
