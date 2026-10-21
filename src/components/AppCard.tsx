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
    // High Clarity strengthens card boundaries (thicker, darker border).
    borderWidth: theme.clarity ? 2 : 1,
    borderColor: theme.clarity ? theme.colors.borderStrong : theme.colors.border,
    padding: padded ? theme.spacing.md : 0,
    // Keep shadows subtle; in clarity mode rely on borders instead of shadow.
    ...(theme.clarity ? theme.shadows.none : theme.shadows[elevation]),
  };

  return (
    <View style={[base, style]} {...rest}>
      {children}
    </View>
  );
}
