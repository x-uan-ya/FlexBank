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
 * Confirmation / success (Developer B). Shows a calm success summary with a
 * synthetic reference. Reached only after an explicit confirm.
 */
export function SuccessScreen() {
  const theme = useTheme();
  const router = useRouter();
  const draft = useTransaction();

  const confirmed = draft.status === 'confirmed';
  const reference = makeReference();

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
          {confirmed ? 'Transfer sent' : 'Transfer not completed'}
        </AppText>
        <AppText role="body" color="textSecondary" center>
          {confirmed
            ? 'This is a simulated confirmation. No real money moved.'
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
