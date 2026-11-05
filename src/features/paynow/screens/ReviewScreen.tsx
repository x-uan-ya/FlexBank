import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppText,
  Header,
  Icon,
  ScreenContainer,
} from '@/components';
import {
  AdaptiveModeSwitcher,
  GuidancePanel,
  PAYNOW_REVIEW_CONTENT,
  ReadabilityModeSwitcher,
  TransactionProgress,
} from '@/features/adaptive';
import { usePreferences } from '@/state';
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
  const preferences = usePreferences();
  const content = PAYNOW_REVIEW_CONTENT[preferences.guidanceLevel];
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
            label="Edit details"
            variant="secondary"
            onPress={() => router.back()}
            accessibilityHint="Returns to edit the transfer without clearing it"
          />
        </View>
      }
    >
      <Header
        title="Review transfer"
        subtitle="Check the details before you confirm"
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      <AdaptiveModeSwitcher />
      <ReadabilityModeSwitcher />

      <TransactionProgress currentStep="review" />

      <AppCard elevation="none" style={{ backgroundColor: theme.colors.surfaceMuted }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md }}>
          <Icon
            name="shield"
            size={22}
            circle
            circleSize={44}
            color={theme.colors.primary}
            circleColor={theme.colors.accentSoft}
          />
          <View style={{ flex: 1, gap: theme.spacing.xs }}>
            <AppText role="subheading">Check details before sending</AppText>
            <AppText role="caption" color="textSecondary">
              Make sure the recipient, destination and amount match what you intend.
            </AppText>
          </View>
        </View>
      </AppCard>

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

      {preferences.guidanceLevel === 'guided' ? (
        <GuidancePanel
          title={content.guidanceTitle!}
          body={content.guidanceBody}
          items={content.checklist}
        />
      ) : null}

      <AppCard>
        <Row
          icon="profile"
          label="Recipient"
          value={draft.recipientName ?? '—'}
          compact={preferences.guidanceLevel === 'quick'}
        />
        <Divider />
        <Row
          icon="cards"
          label="Destination"
          value={`${draft.recipientBank ?? ''} ${draft.recipientIdentifier ?? ''}`.trim() || '—'}
          compact={preferences.guidanceLevel === 'quick'}
        />
        <Divider />
        <Row
          icon="insights"
          label="Amount"
          value={draft.amount !== undefined ? formatMoney(draft.amount, draft.currency) : '—'}
          emphasise
          compact={preferences.guidanceLevel === 'quick'}
        />
      </AppCard>

      <AppCard
        elevation="none"
        style={{
          backgroundColor: theme.colors.warningSoft,
          borderColor: theme.colors.warning,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
          <Icon name="info" size={20} color={theme.colors.warning} />
          <AppText role="caption" color="textSecondary" style={{ flex: 1 }}>
            Once confirmed, this simulated transfer is treated as complete. Check everything now.
          </AppText>
        </View>
      </AppCard>

      {/* TODO: CONCIERGE FEATURE — Dev C: add an "Explain this" affordance that
          calls concierge.explain('paynow-review'). */}
      {preferences.guidanceLevel === 'guided' ? (
        <AppButton
          label="Explain this screen"
          variant="ghost"
          onPress={() => router.push('/concierge')}
        />
      ) : null}

      <AppText role="caption" color="textMuted" center>
        No real money moves. Synthetic demo data only.
      </AppText>
    </ScreenContainer>
  );
}

function Row({
  icon,
  label,
  value,
  emphasise,
  compact,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  value: string;
  emphasise?: boolean;
  compact?: boolean;
}) {
  const theme = useTheme();
  const stacked = theme.mode !== 'standard';
  return (
    <View
      style={{
        flexDirection: stacked ? 'column' : 'row',
        justifyContent: stacked ? 'flex-start' : 'space-between',
        alignItems: stacked ? 'flex-start' : 'center',
        paddingVertical: compact && !stacked ? 0 : theme.spacing.xs,
        gap: stacked ? theme.spacing.xs : theme.spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <Icon name={icon} size={20} color={theme.colors.primary} />
        <AppText role="body" color="textSecondary">{label}</AppText>
      </View>
      <AppText
        role={emphasise ? 'heading' : 'bodyStrong'}
        style={{
          flexShrink: 1,
          textAlign: stacked ? 'left' : 'right',
          alignSelf: stacked ? 'stretch' : 'auto',
        }}
      >
        {value}
      </AppText>
    </View>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.colors.border }} />;
}
