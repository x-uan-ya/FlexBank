import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppText,
  ScreenContainer,
} from '@/components';
import { useTransaction } from '@/state';
import { useTheme } from '@/theme';
import { formatMoney, makeReference } from '@/utils';

/**
 * Confirmation / outcome (Developer B). Shows a calm summary of what happened:
 * sent (with a synthetic reference), failed (with a friendly reason and a way
 * to try again), or not completed. Reached only after an explicit confirm.
 */
export function SuccessScreen() {
  const theme = useTheme();
  const router = useRouter();
  const draft = useTransaction();

  const confirmed = draft.status === 'confirmed';
  const failed = draft.status === 'failed';

  // Create the reference once, so it does not change if the screen re-draws
  // (for example when the customer switches display mode).
  const [reference] = useState(() => makeReference());

  const footer = failed ? (
    <View style={{ gap: theme.spacing.sm }}>
      <AppButton label="Try again" onPress={() => router.replace('/paynow/amount')} />
      <AppButton
        label="Back to home"
        variant="ghost"
        onPress={() => router.replace('/home')}
      />
    </View>
  ) : (
    <AppButton label="Back to home" onPress={() => router.replace('/home')} />
  );

  return (
    <ScreenContainer footer={footer}>
      <View style={{ alignItems: 'center', gap: theme.spacing.sm, marginTop: theme.spacing.xl }}>
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: theme.radius.pill,
            backgroundColor: confirmed ? theme.colors.successSoft : theme.colors.warningSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText role="display" color={confirmed ? 'success' : 'warning'}>
            {confirmed ? '✓' : '!'}
          </AppText>
        </View>
        <AppText role="title" center>
          {confirmed ? 'Transfer sent' : 'Transfer not completed'}
        </AppText>
        <AppText role="body" color="textSecondary" center>
          {confirmed
            ? 'This is a simulated confirmation. No real money moved.'
            : failed
              ? (draft.failureReason ??
                "We couldn't complete this transfer right now. No money was moved.")
              : 'The transfer was not confirmed.'}
        </AppText>
      </View>

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
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.xs,
        gap: theme.spacing.md,
      }}
    >
      <AppText role="body" color="textSecondary">
        {label}
      </AppText>
      <AppText role="bodyStrong">{value}</AppText>
    </View>
  );
}
