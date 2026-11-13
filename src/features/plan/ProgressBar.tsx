import { View } from 'react-native';

import { useTheme } from '@/theme';

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  const theme = useTheme();
  const safe = Math.max(0, Math.min(100, percent));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: safe }}
      style={{
        height: 10,
        borderRadius: 5,
        overflow: 'hidden',
        backgroundColor: theme.colors.surfaceMuted,
      }}
    >
      <View style={{ width: `${safe}%`, height: '100%', backgroundColor: theme.colors.primary }} />
    </View>
  );
}