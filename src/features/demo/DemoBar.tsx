import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components';
import { DEMO_PERSONAS } from '@/data';
import { useAppDispatch, usePreferences } from '@/state';
import { useTheme } from '@/theme';
import { personalisation } from '@/features/onboarding/personalisation';

/**
 * Demo Mode control — DEVELOPMENT / DEMO ONLY.
 *
 * A small floating control to switch the prototype between synthetic personas
 * during a demo. It only renders in development (`__DEV__`). These personas are
 * explicit preference bundles, NOT inferred customer categories.
 *
 * Positioning: the collapsed control is a compact pill pinned to the RIGHT
 * edge, raised well ABOVE the bottom so it never overlaps a screen's primary
 * footer button (e.g. Continue / Confirm). The persona list opens UPWARDS from
 * the button for the same reason.
 */

// Clearance above the bottom so the control clears a typical footer button.
const FOOTER_CLEARANCE = 96;

export function DemoBar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const prefs = usePreferences();
  const [open, setOpen] = useState(false);

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
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        right: theme.spacing.md,
        left: theme.spacing.md,
        // Raise above the footer area + respect the bottom safe area.
        bottom: insets.bottom + FOOTER_CLEARANCE,
        alignItems: 'flex-end',
        gap: theme.spacing.sm,
      }}
    >
      {open ? (
        <View
          style={{
            alignSelf: 'stretch',
            backgroundColor: theme.colors.primaryStrong,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.sm,
            gap: theme.spacing.xs,
            ...theme.shadows.lg,
          }}
        >
          <AppText role="caption" style={{ color: theme.colors.textInverse }}>
            Demo personas (dev only)
          </AppText>
          {DEMO_PERSONAS.map((persona) => (
            <Pressable
              key={persona.id}
              accessibilityRole="button"
              onPress={() => applyPersona(persona.id)}
              style={{
                paddingVertical: theme.spacing.xs,
                paddingHorizontal: theme.spacing.sm,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.primary,
              }}
            >
              <AppText role="label" style={{ color: theme.colors.textInverse }}>
                {persona.label}
              </AppText>
              <AppText role="caption" style={{ color: theme.colors.accentSoft }}>
                {persona.description}
              </AppText>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Toggle demo persona switcher"
        onPress={() => setOpen((o) => !o)}
        style={{
          backgroundColor: theme.colors.accent,
          paddingVertical: theme.spacing.xs,
          paddingHorizontal: theme.spacing.sm,
          borderRadius: theme.radius.pill,
          opacity: 0.92,
          ...theme.shadows.md,
        }}
      >
        <AppText role="caption" style={{ color: theme.colors.onAccent }}>
          Demo · {prefs.displayMode}
        </AppText>
      </Pressable>
    </View>
  );
}
