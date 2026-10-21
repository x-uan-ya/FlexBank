import { View } from 'react-native';

import { useTheme } from '@/theme';

import { AppButton } from './AppButton';
import { AppText } from './AppText';

/**
 * Empty-state placeholder for lists/sections with no content yet
 * (e.g. no recent recipients). Keeps screens calm and guiding.
 */

interface EmptyStateProps {
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ title, message, actionLabel, onAction }: EmptyStateProps) {
  const theme = useTheme();
  return (
    <View
      style={{
        alignItems: 'center',
        padding: theme.spacing.lg,
        gap: theme.spacing.sm,
      }}
    >
      <AppText role="subheading" center>
        {title}
      </AppText>
      {message ? (
        <AppText role="body" color="textSecondary" center>
          {message}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <View style={{ marginTop: theme.spacing.sm }}>
          <AppButton label={actionLabel} variant="secondary" fullWidth={false} onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}
