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

  const confirmed = draft.status === 'confirmed';
  const [reference] = useState(() => makeReference());

  return (
    <ScreenContainer
      footer={<AppButton label="Back to home" onPress={() => router.replace('/home')} />}
    >
      <View style={{ alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xl }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: theme.radius.pill,
            backgroundColor: theme.colors.successSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText role="display" color="success">
            ✓
          </AppText>
        </View>
        <AppText role="title" center>
          {confirmed ? content.title : 'Transfer not completed'}
        </AppText>
        <AppText role="body" color="textSecondary" center>
          {confirmed
            ? content.confirmedBody
            : 'The transfer was not confirmed.'}
        </AppText>
      </View>

      <AdaptiveModeSwitcher />
      <ReadabilityModeSwitcher />

      {confirmed && preferences.guidanceLevel === 'guided' ? (
        <>
          <TransactionProgress currentStep="complete" />
          <GuidancePanel
            title="What happens next?"
            items={content.nextSteps}
          />
        </>
      ) : null}

      {confirmed ? (
        <AppCard>
          <Row label="Paid" value={draft.recipientName ?? '—'} />
          <Row
            label="Amount"
            value={draft.amount !== undefined ? formatMoney(draft.amount, draft.currency) : '—'}
          />
          <Row label="Reference" value={reference} />
        </AppCard>
      ) : null}

      {/* TODO: SAFETY FEATURE — Dev D: offer error recovery / human assistance
          if the transfer failed. */}
    </ScreenContainer>
  );
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
