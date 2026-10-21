import { View } from 'react-native';

import { useTheme } from '@/theme';

/** A thin horizontal separator that respects the High Clarity border treatment. */
export function Divider({ inset = 0 }: { inset?: number }) {
  const theme = useTheme();
  return (
    <View
      style={{
        height: theme.clarity ? 2 : 1,
        marginVertical: theme.spacing.xs,
        marginHorizontal: inset,
        backgroundColor: theme.clarity ? theme.colors.borderStrong : theme.colors.border,
      }}
    />
  );
}
