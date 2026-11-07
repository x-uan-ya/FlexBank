import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppText,
  Header,
  ScreenContainer,
} from '@/components';
import { useAppDispatch, useTransaction } from '@/state';
import { useTheme } from '@/theme';
import { formatMoney } from '@/utils';

import { useSafety } from '../useSafety';

/** One labelled line of the transfer summary. */
function SummaryRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <AppText role="caption" color="textSecondary">
        {label}
      </AppText>
      <AppText role="bodyStrong">{value}</AppText>
    </View>
  );
}

/** The ORIGINAL transfer details, always shown exactly as entered. */
function TransferSummary() {
  const theme = useTheme();
  const draft = useTransaction();
  const amountText =
    draft.amount !== undefined
      ? formatMoney(draft.amount, draft.currency)
      : 'Not entered';

  return (
    <AppCard>
      <View style={{ gap: theme.spacing.sm }}>
        <SummaryRow label="Recipient" value={draft.recipientName ?? 'Not chosen'} />
        <SummaryRow label="Bank" value={draft.recipientBank ?? 'Not available'} />
        <SummaryRow
          label="Account"
          value={draft.recipientIdentifier ?? 'Not available'}
        />
        <SummaryRow label="Amount" value={amountText} />
      </View>
    </AppCard>
  );
}

/**
 * Confidence Checkpoint (Developer D / Member 5).
 *
 * A pause-and-check screen before the customer confirms. It shows the original
 * recipient, bank and amount, and lets the customer continue, change details,
 * pause, or ask for a person.
 *
 * SAFETY: this screen NEVER confirms a transfer. "Continue" only returns to the
 * Review screen, where the customer presses Confirm themselves.
 */
export function CheckpointScreen() {
  const theme = useTheme();
  const router = useRouter();
  const safety = useSafety();
  const dispatch = useAppDispatch();
  const draft = useTransaction();
  const [paused, setPaused] = useState(false);

  const hasTransfer =
    draft.recipientName !== undefined && draft.amount !== undefined;
  const needsReview = draft.requiresReview || draft.status === 'reviewRequired';

  function goToReview() {
    safety.resumeTransaction();
    dispatch({ type: 'SET_TRANSACTION_STEP', payload: 'review' });
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/paynow/review');
    }
  }

  function changeDetails() {
    safety.resumeTransaction();
    dispatch({ type: 'SET_TRANSACTION_STEP', payload: 'recipient' });
    router.push('/paynow/recipient');
  }

  function pause() {
    safety.pauseTransaction();
    setPaused(true);
  }

  function resume() {
    safety.resumeTransaction();
    setPaused(false);
  }

  // Failure case: opened with no transfer in progress.
  if (!hasTransfer) {
    return (
      <ScreenContainer
        footer={
          <AppButton label="Back to home" onPress={() => router.replace('/home')} />
        }
      >
        <Header
          title="Quick check"
          onBack={router.canGoBack() ? () => router.back() : undefined}
        />
        <AppCard>
          <AppText role="body" color="textSecondary">
            There is no transfer to check yet. Start a PayNow transfer first, then
            come back here before you confirm.
          </AppText>
        </AppCard>
      </ScreenContainer>
    );
  }

  // Paused state: draft is kept, nothing is sent.
  if (paused) {
    return (
      <ScreenContainer
        footer={
          <View style={{ gap: theme.spacing.sm }}>
            <AppButton label="Resume my transfer" onPress={resume} />
            <AppButton
              label="Back to home"
              variant="secondary"
              onPress={() => router.replace('/home')}
            />
          </View>
        }
      >
        <Header title="Transfer paused" />
        <AppCard>
          <View style={{ gap: theme.spacing.sm }}>
            <AppText role="bodyStrong">Your transfer is paused.</AppText>
            <AppText role="body" color="textSecondary">
              Your details are saved and nothing has been sent. Resume whenever you
              are ready.
            </AppText>
          </View>
        </AppCard>
        <TransferSummary />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer
      footer={
        <AppButton
          label={needsReview ? 'Review the updated details' : 'Looks right, continue to confirm'}
          onPress={goToReview}
        />
      }
    >
      <Header
        title="Quick check"
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      {needsReview ? (
        <View accessibilityRole="alert">
          <AppCard>
            <View style={{ gap: theme.spacing.xs }}>
              <AppText role="bodyStrong">Your details have changed.</AppText>
              <AppText role="body" color="textSecondary">
                Please review the updated recipient and amount before you confirm.
              </AppText>
            </View>
          </AppCard>
        </View>
      ) : (
        <AppText role="body" color="textSecondary">
          Take a moment to check these details. Nothing is sent from this screen.
        </AppText>
      )}

      <TransferSummary />

      <View style={{ gap: theme.spacing.sm }}>
        <AppButton
          label="Change recipient or amount"
          variant="secondary"
          onPress={changeDetails}
        />
        <AppButton label="Pause for now" variant="secondary" onPress={pause} />
        <AppButton
          label="Get help from a person"
          variant="secondary"
          onPress={() => router.push('/human-assistance')}
        />
      </View>
    </ScreenContainer>
  );
}