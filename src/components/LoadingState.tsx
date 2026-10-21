import { ActivityIndicator, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

/**
 * Standard loading indicator with an optional message. Feature developers
 * should show this while awaiting async work (e.g. Concierge AI responses).
 */

interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Just a moment…' }: LoadingStateProps) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
        gap: theme.spacing.sm,
      }}
    >
      <ActivityIndicator color={theme.colors.primary} />
      <AppText role="body" color="textSecondary" center>
        {message}
      </AppText>
    </View>
  );
}
