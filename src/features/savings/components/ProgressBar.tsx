import { View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/**
 * A simple, theme-aware progress bar drawn with plain Views (no chart deps).
 * Reads semantic tokens so it works in Classic, Premium and all display modes.
 */
export function ProgressBar({
  fraction,
  height = 10,
  trackColor,
  fillColor,
  style,
}: {
  /** 0..1 (clamped). */
  fraction: number;
  height?: number;
  trackColor?: string;
  fillColor?: string;
  style?: ViewStyle;
}) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, fraction)) * 100;
  return (
    <View
      accessible={false}
      style={[
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor ?? theme.colors.surfaceMuted,
          overflow: 'hidden',
          borderWidth: theme.clarity ? 1 : 0,
          borderColor: theme.colors.borderStrong,
        },
        style,
      ]}
    >
      <View
        style={{
          width: `${pct}%`,
          height: '100%',
          backgroundColor: fillColor ?? theme.colors.accent,
          borderRadius: height / 2,
        }}
      />
    </View>
  );
}
