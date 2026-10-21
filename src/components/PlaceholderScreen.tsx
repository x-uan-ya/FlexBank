import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme';

import { AppButton } from './AppButton';
import { AppCard } from './AppCard';
import { AppText } from './AppText';
import { Header } from './Header';
import { ScreenContainer } from './ScreenContainer';

/**
 * Reusable placeholder for feature routes that are OWNED by another developer
 * and not yet implemented. It clearly states which developer owns the screen
 * and what they should build, so integration is obvious.
 *
 * Replace the whole screen file with the real implementation when ready —
 * do not build on top of this component.
 */

interface PlaceholderScreenProps {
  title: string;
  owner: string;
  todoTag: string;
  description: string;
  buildNotes?: string[];
}

export function PlaceholderScreen({
  title,
  owner,
  todoTag,
  description,
  buildNotes = [],
}: PlaceholderScreenProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <ScreenContainer>
      <Header title={title} onBack={router.canGoBack() ? () => router.back() : undefined} />

      <AppCard>
        <View style={{ gap: theme.spacing.sm }}>
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: theme.colors.accentSoft,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.radius.pill,
            }}
          >
            <AppText role="caption" color="accent">
              {owner}
            </AppText>
          </View>

          <AppText role="body" color="textSecondary">
            {description}
          </AppText>

          <AppText role="mono" color="textMuted">
            {todoTag}
          </AppText>

          {buildNotes.length > 0 ? (
            <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.xs }}>
              {buildNotes.map((note) => (
                <AppText key={note} role="caption" color="textSecondary">
                  {'• '}
                  {note}
                </AppText>
              ))}
            </View>
          ) : null}
        </View>
      </AppCard>

      {router.canGoBack() ? (
        <AppButton label="Go back" variant="secondary" onPress={() => router.back()} />
      ) : null}
    </ScreenContainer>
  );
}
