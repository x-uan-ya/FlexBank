import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppButton } from './AppButton';
import { AppText } from './AppText';

/**
 * Customer-friendly error display. NEVER shows raw stack traces or technical
 * messages — feature developers pass a calm, human message and an optional
 * recovery action (see Dev D's error recovery work).
 */

interface ErrorStateProps {
  title?: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export function ErrorState({
  title = 'Something needs your attention',
  message = 'We could not complete that just now. Your money has not moved. Please try again.',
  retryLabel = 'Try again',
  onRetry,
  secondaryLabel,
  onSecondary,
}: ErrorStateProps) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="alert"
      style={{
        alignItems: 'center',
        padding: theme.spacing.lg,
        gap: theme.spacing.sm,
      }}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: theme.radius.pill,
          backgroundColor: theme.colors.dangerSoft,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: theme.spacing.xs,
        }}
      >
        <AppText role="title" color="danger">
          !
        </AppText>
      </View>

      <AppText role="heading" center>
        {title}
      </AppText>
      <AppText role="body" color="textSecondary" center>
        {message}
      </AppText>

      <View style={{ alignSelf: 'stretch', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
        {onRetry ? <AppButton label={retryLabel} onPress={onRetry} /> : null}
        {onSecondary && secondaryLabel ? (
          <AppButton label={secondaryLabel} variant="ghost" onPress={onSecondary} />
        ) : null}
      </View>
    </View>
  );
}
