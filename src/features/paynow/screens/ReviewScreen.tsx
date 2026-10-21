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

import { usePayNow } from '../usePayNow';

/**
 * Review before confirmation (Developer B + safety-critical).
 *
 * SAFETY PRINCIPLES enforced on this screen:
 * - Details are fully reviewable here (principle 5).
 * - Confirmation is an EXPLICIT customer press (principles 1 & 2). AI never
 *   confirms.
 * - If details changed after review, the draft is `reviewRequired` and we show
 *   a notice + block confirm until re-reviewed (principle 6).
 */
export function ReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const paynow = usePayNow();
  const { draft } = paynow;

  const needsReReview = draft.requiresReview || draft.status === 'reviewRequired';

  function confirm() {
    // Explicit customer action. Reducer verifies the draft is review-ready.
    paynow.confirmTransaction();
    router.replace('/paynow/success');
  }

  return (
    <ScreenContainer
      footer={
        <View style={{ gap: theme.spacing.sm }}>
          {/* TODO: SAFETY FEATURE — Dev D: insert a Confidence Checkpoint here
              (e.g. route to /checkpoint before confirm in guided mode). */}
          <AppButton
            label="Confirm and send"
            onPress={confirm}
            disabled={needsReReview}
            accessibilityHint="Sends the transfer after you confirm"
          />
          <AppButton
            label="Cancel"
            variant="ghost"
            onPress={() => {
              paynow && router.replace('/home');
            }}
          />
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
