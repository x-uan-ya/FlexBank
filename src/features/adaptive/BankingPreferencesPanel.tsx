import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { AppCard, AppText } from '@/components';
import { usePreferences } from '@/state';
import { useTheme } from '@/theme';
import { DISPLAY_MODE_LABELS, GUIDANCE_LABELS } from '@/types/preferences';
import { AdaptiveModeSwitcher } from './AdaptiveModeSwitcher';
import { ReadabilityModeSwitcher } from './ReadabilityModeSwitcher';

/** Compact access to existing controls. Expansion is local presentation only. */
export function BankingPreferencesPanel() {
  const theme = useTheme();
  const preferences = usePreferences();
  const [expanded, setExpanded] = useState(false);
  return <AppCard elevation="none" style={{ padding: theme.spacing.sm }}>
    <View style={{ gap: expanded ? theme.spacing.sm : 0 }}>
      <Pressable accessibilityRole="button"
        accessibilityLabel={`Banking preferences, ${GUIDANCE_LABELS[preferences.guidanceLevel]}, ${DISPLAY_MODE_LABELS[preferences.displayMode]}`}
        accessibilityState={{ expanded }} aria-expanded={expanded}
        onPress={() => setExpanded(value => !value)}
        style={({ pressed }) => ({ minHeight: 48, padding: theme.spacing.xs, flexDirection: 'row',
          flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm, opacity: pressed ? 0.8 : 1 })}>
        <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 140, gap: theme.spacing.xs }}>
          <AppText role="label">Banking pace &amp; readability</AppText>
          <AppText role="caption" color="textSecondary">
            {GUIDANCE_LABELS[preferences.guidanceLevel]} · {DISPLAY_MODE_LABELS[preferences.displayMode]}
          </AppText>
        </View>
        <AppText role="label" color="primary">{expanded ? 'Hide' : 'Change'}</AppText>
      </Pressable>
      {expanded ? <>
        <AdaptiveModeSwitcher />
        <ReadabilityModeSwitcher />
      </> : null}
    </View>
  </AppCard>;
}
