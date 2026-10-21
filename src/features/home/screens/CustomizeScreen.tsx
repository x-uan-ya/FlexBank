import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppText,
  Header,
  ScreenContainer,
} from '@/components';
import { useAppDispatch, useHomeLayout } from '@/state';
import { useTheme } from '@/theme';
import type { HomeWidget } from '@/types/home';

/**
 * Homepage customisation starter (Developer A).
 *
 * Lets the customer move widgets up/down and toggle visibility, then writes the
 * new layout with SET_HOME_LAYOUT. Includes reset-to-standard.
 *
 * SAFETY: hiding a widget here only affects homepage emphasis. Core banking
 * features remain reachable from the PayNow flow and other routes — never block
 * access. Dev A should preserve that guarantee when expanding this screen.
 */

export function CustomizeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const layout = useHomeLayout();

  const ordered = [...layout].sort((a, b) => a.position - b.position);

  function commit(next: HomeWidget[]) {
    const repositioned = next.map((w, position) => ({ ...w, position }));
    dispatch({ type: 'SET_HOME_LAYOUT', payload: repositioned });
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...ordered];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    commit(next);
  }

  function toggleVisible(id: string) {
    commit(ordered.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  }

  return (
    <ScreenContainer
      footer={
        <AppButton
          label="Reset to standard"
          variant="secondary"
          onPress={() => dispatch({ type: 'RESET_PREFERENCES' })}
        />
      }
    >
      <Header
        title="Customise homepage"
        subtitle="Reorder or hide widgets. You stay in control."
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      <View style={{ gap: theme.spacing.sm }}>
        {ordered.map((widget, index) => (
          <AppCard key={widget.id}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.sm,
              }}
            >
              <View style={{ flex: 1 }}>
                <AppText role="subheading">{widget.title}</AppText>
                <AppText role="caption" color="textMuted">
                  {widget.visible ? 'Shown' : 'Hidden'}
                </AppText>
              </View>

              <AppButton
                label="↑"
                variant="ghost"
                fullWidth={false}
                onPress={() => move(index, -1)}
                accessibilityLabel={`Move ${widget.title} up`}
              />
              <AppButton
                label="↓"
                variant="ghost"
                fullWidth={false}
                onPress={() => move(index, 1)}
                accessibilityLabel={`Move ${widget.title} down`}
              />
              <AppButton
                label={widget.visible ? 'Hide' : 'Show'}
                variant="secondary"
                fullWidth={false}
                onPress={() => toggleVisible(widget.id)}
              />
            </View>
          </AppCard>
        ))}
      </View>

      {/* TODO: PERSONALISATION FEATURE — Dev A: drag-and-drop reorder,
          preview, per-widget settings. */}
    </ScreenContainer>
  );
}
