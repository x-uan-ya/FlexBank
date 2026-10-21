import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppText,
  Header,
  ScreenContainer,
} from '@/components';
import { useTransaction } from '@/state';
import { useTheme } from '@/theme';
import { formatMoney } from '@/utils';

import { useSafety } from '../useSafety';

/**
 * Confidence Checkpoint placeholder (Developer D).
 *
 * A pause-and-confirm interstitial that can appear before a sensitive action in
 * guided mode. It summarises what is about to happen and lets the customer slow
 * down, continue, or get help. It does NOT confirm the transaction itself —
 * confirmation stays an explicit action on the review screen.
 */
export function CheckpointScreen() {
  const theme = useTheme();
  const router = useRouter();
  const safety = useSafety();
  const draft = useTransaction();

  return (
    <ScreenContainer
      footer={
        <View style={{ gap: theme.spacing.sm }}>
          <AppButton
            label="I'm sure, continue"
            onPress={() => {
              safety.resumeTransaction();
              router.back();
            }}
          />
          <AppButton
            label="Get help from a person"
            variant="secondary"
            onPress={() => router.push('/human-assistance')}
          />
        </View>
      }
    >
      <Header
        title="Quick check"
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

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
              Developer D — Safety
            </AppText>
          </View>
          <AppText role="body" color="textSecondary">
            Take a moment to make sure this looks right. You can continue, or ask
            a person for help. Nothing is sent from this screen.
          </AppText>
          {draft.recipientName ? (
            <AppText role="bodyStrong">
              {draft.amount !== undefined ? formatMoney(draft.amount, draft.currency) : ''} to{' '}
              {draft.recipientName}
            </AppText>
          ) : null}
          <AppText role="mono" color="textMuted">
            {'// TODO: SAFETY FEATURE'}
          </AppText>
        </View>
      </AppCard>
    </ScreenContainer>
  );
}
