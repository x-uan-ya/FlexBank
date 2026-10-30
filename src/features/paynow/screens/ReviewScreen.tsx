import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppText,
  Header,
  ScreenContainer,
} from '@/components';
import { useTheme } from '@/theme';
import { formatMoney } from '@/utils';

import { simulateOutcome } from '../outcome';
import { usePayNow } from '../usePayNow';
import { validateTransaction } from '../validation';

/**
 * Review before confirmation (Developer B + safety-critical).
 *
 * SAFETY PRINCIPLES enforced on this screen:
 * - Details are fully reviewable here (principle 5).
 * - Confirmation is an EXPLICIT customer press (principles 1 & 2). AI never
 *   confirms.
 * - If details changed after review, the draft is `reviewRequired` and we show
 *   a notice + block confirm until re-reviewed (principle 6).
 * - Confirm is only enabled for a valid, review-ready draft, and we only go to
 *   the success page when we actually asked to confirm one.
 */
export function ReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const paynow = usePayNow();
  const { draft } = paynow;

  const needsReReview = draft.requiresReview || draft.status === 'reviewRequired';

  // Only a valid draft that has reached "ready for review" may be confirmed.
  // (Covers opening this page directly, or a draft that is not complete.)
  const canConfirm =
    draft.status === 'readyForReview' &&
    !draft.requiresReview &&
    validateTransaction(draft).valid;

  function confirm() {
    if (!canConfirm) {
      return; // Never show "success" for a transfer that was not confirmable.
    }

    // The customer has pressed Confirm. Now run the SIMULATED bank outcome.
    const outcome = simulateOutcome(draft);
    if (!outcome.ok) {
      paynow.failTransfer(outcome.reason);
    } else {
      // Explicit customer action. Reducer verifies the draft is review-ready.
      paynow.confirmTransaction();
    }
    router.replace('/paynow/success');
  }

  function cancel() {
    paynow.cancelTransfer();
    router.replace('/home');
  }

  return (
    <ScreenContainer
      footer={
        <View style={{ gap: theme.spacing.sm }}>
          {/* TODO: SAFETY FEATURE — Dev D: insert a Confidence Checkpoint here
              (e.g. route to /checkpoint before confirm in guided mode). */}
          {!canConfirm && !needsReReview ? (
            <AppText role="caption" color="textSecondary" center>
              Go back and complete the recipient and amount to continue.
            </AppText>
          ) : null}
          <AppButton
            label="Confirm and send"
            onPress={confirm}
            disabled={!canConfirm}
            accessibilityHint="Sends the transfer after you confirm"
          />
          <AppButton label="Cancel" variant="ghost" onPress={cancel} />
        </View>
      }
    >
      <Header
        title="Review"
        subtitle="Check the details before you confirm"
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      {needsReReview ? (
        <AppCard style={{ borderColor: theme.colors.warning }}>
          <AppText role="bodyStrong" color="warning">
            Details changed — please review again
          </AppText>
          <AppText role="caption" color="textSecondary">
            For your security, confirm is disabled until you re-check the amount
            and recipient.
          </AppText>
          <View style={{ marginTop: theme.spacing.sm }}>
            <AppButton
              label="I have reviewed the details"
              variant="secondary"
              onPress={() => paynow.requestReview()}
            />
          </View>
        </AppCard>
      ) : null}

      <AppCard>
        <Row label="Paying" value={draft.recipientName ?? '—'} />
        <Divider />
        <Row
          label="To"
          value={`${draft.recipientBank ?? ''} ${draft.recipientIdentifier ?? ''}`.trim() || '—'}
        />
        <Divider />
        <Row
          label="Amount"
          value={draft.amount !== undefined ? formatMoney(draft.amount, draft.currency) : '—'}
          emphasise
        />
      </AppCard>

      {/* TODO: CONCIERGE FEATURE — Dev C: add an "Explain this" affordance that
          calls concierge.explain('paynow-review'). */}
      <AppButton
        label="Explain this screen"
        variant="ghost"
        onPress={() => router.push('/concierge')}
      />

      <AppText role="caption" color="textMuted" center>
        No real money moves. Synthetic demo data only.
      </AppText>
    </ScreenContainer>
  );
}

function Row({
  label,
  value,
  emphasise,
}: {
  label: string;
  value: string;
  emphasise?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.xs,
        gap: theme.spacing.md,
      }}
    >
      <AppText role="body" color="textSecondary">
        {label}
      </AppText>
      <AppText role={emphasise ? 'heading' : 'bodyStrong'}>{value}</AppText>
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.colors.border }} />;
}
