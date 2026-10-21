import { View, type ViewProps, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/**
 * A surface container with consistent padding, radius, and elevation.
 * Use for grouping related content (account summaries, widgets, review rows).
 */

interface AppCardProps extends ViewProps {
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  padded?: boolean;
}

export function AppCard({
  elevation = 'sm',
  padded = true,
  style,
  children,
  ...rest
}: AppCardProps) {
  const theme = useTheme();

  const base: ViewStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: padded ? theme.spacing.md : 0,
    ...theme.shadows[elevation],
  };

  return (
    <View style={[base, style]} {...rest}>
      {children}
    </View>
  );
}
