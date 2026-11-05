import { View } from 'react-native';

import { AppCard, AppText } from '@/components';
import { useTheme } from '@/theme';

interface GuidancePanelProps {
  title: string;
  body?: string;
  items?: string[];
}

/** A reusable, non-interactive explanation block for guided experiences. */
export function GuidancePanel({ title, body, items = [] }: GuidancePanelProps) {
  const theme = useTheme();

  return (
    <AppCard elevation="none" style={{ borderColor: theme.colors.accent }}>
      <View style={{ gap: theme.spacing.sm }}>
        <AppText role="subheading">{title}</AppText>
        {body ? (
          <AppText role="body" color="textSecondary">
            {body}
          </AppText>
        ) : null}
        {items.length > 0 ? (
          <View style={{ gap: theme.spacing.xs }}>
            {items.map((item, index) => (
              <View
                key={item}
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: theme.spacing.sm,
                }}
              >
                <View
                  style={{
                    minWidth: theme.mode === 'standard' ? 24 : 32,
                    minHeight: theme.mode === 'standard' ? 24 : 32,
                    paddingHorizontal: theme.spacing.xs,
                    borderRadius: theme.radius.pill,
                    backgroundColor: theme.colors.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText role="caption" color="accent">
                    {index + 1}
                  </AppText>
                </View>
                <AppText role="body" color="textSecondary" style={{ flex: 1 }}>
                  {item}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </AppCard>
  );
}
