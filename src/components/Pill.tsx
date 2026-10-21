import { Pressable, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

/**
 * A compact pill used for category tabs (active = accent) and small status
 * chips. When `onPress` is provided it behaves as a tab button with a clear
 * active state communicated by fill + weight, not colour alone.
 */

interface PillProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'accent' | 'success' | 'warning';
}

export function Pill({ label, active = false, onPress, tone = 'default' }: PillProps) {
  const theme = useTheme();

  const toneBg =
    tone === 'success'
      ? theme.colors.successSoft
      : tone === 'warning'
        ? theme.colors.warningSoft
        : theme.colors.accentSoft;
  const toneFg =
    tone === 'success'
      ? theme.colors.success
      : tone === 'warning'
        ? theme.colors.warning
        : theme.colors.accent;

  const container: ViewStyle = {
    paddingVertical: theme.spacing.xs + 2,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.pill,
    backgroundColor: active ? theme.colors.primary : onPress ? theme.colors.surface : toneBg,
    borderWidth: active ? 0 : onPress ? (theme.clarity ? 2 : 1) : 0,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  };

  const content = (
    <AppText
      role="label"
      style={{
        color: active ? theme.colors.onPrimary : onPress ? theme.colors.textSecondary : toneFg,
      }}
    >
      {label}
    </AppText>
  );

  if (!onPress) {
    return <View style={container}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [container, pressed ? { opacity: 0.9 } : null]}
    >
      {content}
    </Pressable>
  );
}
