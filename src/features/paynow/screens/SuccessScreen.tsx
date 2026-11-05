import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppText,
  ScreenContainer,
} from '@/components';
import {
  AdaptiveModeSwitcher,
  GuidancePanel,
  PAYNOW_SUCCESS_CONTENT,
  ReadabilityModeSwitcher,
  TransactionProgress,
} from '@/features/adaptive';
import { usePreferences, useTransaction } from '@/state';
import { useTheme } from '@/theme';
import { formatMoney, makeReference } from '@/utils';
import { canShowSuccessfulReceipt, validateTransaction } from '../validation';

/**
 * Confirmation / success (Developer B). Shows a calm success summary with a
 * synthetic reference. Reached only after an explicit confirm.
 */
export function SuccessScreen() {
  const theme = useTheme();
  const router = useRouter();
  const draft = useTransaction();
  const preferences = usePreferences();
  const content = PAYNOW_SUCCESS_CONTENT[preferences.guidanceLevel];

  const confirmed = canShowSuccessfulReceipt(draft);
  const failed = draft.status === 'failed' && validateTransaction(draft).valid;
  const [reference] = useState(() => makeReference());

  return (
    <ScreenContainer
      footer={
        <View style={{ gap: theme.spacing.sm }}>
          {failed ? (
            <>
              <AppButton
                label="Edit details and try again"
                onPress={() => router.replace('/paynow/amount')}
                accessibilityHint="Returns to edit the saved amount before reviewing again"
              />
              <AppButton label="Ask for help" variant="secondary" onPress={() => router.push('/human-assistance')} />
            </>
          ) : null}
          <AppButton
            label="Done — back to home"
            variant={failed ? 'ghost' : 'primary'}
            onPress={() => router.replace('/home')}
          />
        </View>
      }
    >
      <View style={{ alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xl }}>
        <View
          style={{
            width: theme.mode === 'standard' ? 72 : 84,
            height: theme.mode === 'standard' ? 72 : 84,
            borderRadius: theme.radius.pill,
            backgroundColor: confirmed ? theme.colors.successSoft : failed ? theme.colors.dangerSoft : theme.colors.warningSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText role="display" color={confirmed ? 'success' : failed ? 'danger' : 'warning'}>
            {confirmed ? '✓' : '!'}
          </AppText>
        </View>
        <AppText role="title" center>
          {confirmed ? content.title : failed ? content.failedTitle : 'Transfer not completed'}
        </AppText>
        <AppText role="body" color="textSecondary" center accessibilityLiveRegion="polite">
          {confirmed
            ? content.confirmedBody
            : failed
              ? preferences.guidanceLevel === 'quick' ? content.failedBody : draft.failureReason ?? content.failedBody
              : 'The transfer was not confirmed. Start a new transfer from PayNow to continue.'}
        </AppText>
      </View>

      <AdaptiveModeSwitcher />
      <ReadabilityModeSwitcher />

      {confirmed ? <TransactionProgress currentStep="complete" /> : null}

      {confirmed && preferences.guidanceLevel === 'guided' ? (
        <GuidancePanel
          title="What happens next?"
          items={content.nextSteps}
        />
      ) : null}

      {failed && preferences.guidanceLevel === 'guided' ? (
        <GuidancePanel title="You can recover without starting over" body={content.failedBody} items={content.retrySteps} />
      ) : null}

      {confirmed ? (
        <AppCard>
          <AppText role="subheading">Transfer receipt</AppText>
          <View style={{ height: theme.spacing.sm }} />
          <Row label="Paid" value={draft.recipientName ?? '—'} />
          <Divider />
          <Row
            label="Amount"
            value={draft.amount !== undefined ? formatMoney(draft.amount, draft.currency) : '—'}
          />
          <Divider />
          <Row label="Reference" value={reference} />
        </AppCard>
      ) : null}

      <AppText role="caption" color="textSecondary" center>
        Synthetic demo only. No actual bank transfer or movement of money occurred.
      </AppText>
    </ScreenContainer>
  );
}

function Divider() {
  const theme = useTheme();
  return <View style={{ height: 1, backgroundColor: theme.colors.border }} />;
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  const stacked = theme.mode !== 'standard';
  return (
    <View
      style={{
        flexDirection: stacked ? 'column' : 'row',
        justifyContent: stacked ? 'flex-start' : 'space-between',
        alignItems: stacked ? 'flex-start' : 'center',
        paddingVertical: theme.spacing.xs,
        gap: stacked ? theme.spacing.xs : theme.spacing.md,
      }}
    >
      <AppText role="body" color="textSecondary">
        {label}
      </AppText>
      <AppText
        role="bodyStrong"
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
