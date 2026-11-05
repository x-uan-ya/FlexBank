import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppInput,
  AppText,
  Header,
  ScreenContainer,
} from '@/components';
import {
  AdaptiveModeSwitcher,
  GuidancePanel,
  PAYNOW_AMOUNT_CONTENT,
  ReadabilityModeSwitcher,
  TransactionProgress,
} from '@/features/adaptive';
import { usePreferences } from '@/state';
import { useTheme } from '@/theme';

import { usePayNow } from '../usePayNow';
import { validateRecipient, validateTransaction } from '../validation';

/**
 * Amount entry (Developer B). Validates with customer-friendly messages, then
 * marks the draft ready for review and advances.
 */
export function AmountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const paynow = usePayNow();
  const preferences = usePreferences();
  const content = PAYNOW_AMOUNT_CONTENT[preferences.guidanceLevel];
  const recipientValid = validateRecipient(paynow.draft).valid;

  const [raw, setRaw] = useState(
    paynow.draft.amount !== undefined ? String(paynow.draft.amount) : '',
  );
  const [error, setError] = useState<string | undefined>();

  function choosePreset(amount: number) {
    setRaw(String(amount));
    setError(undefined);
  }

  function next() {
    if (paynow.draft.status === 'confirmed' || paynow.draft.status === 'cancelled') {
      setError('Start a new transfer before entering another amount.');
      return;
    }
    // Preserve the entered text and reject malformed input rather than changing
    // its meaning (for example, turning a pasted negative amount into positive).
    const entered = raw.trim();
    if (entered && !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(entered)) {
      setError('Enter an amount using numbers and one decimal point, for example 12.50.');
      return;
    }
    if ((entered.split('.')[1]?.length ?? 0) > 2) {
      setError('Use at most 2 decimal places, for example 12.50.');
      return;
    }
    const amount = entered === '' ? undefined : Number(entered);
    const result = validateTransaction({ ...paynow.draft, amount });
    if (!result.valid) {
      setError(result.messages.join(' '));
      return;
    }
    const alreadyReviewed = paynow.draft.requiresReview ||
      ['readyForReview', 'reviewRequired', 'failed'].includes(paynow.draft.status);
    if (amount !== undefined && amount !== paynow.draft.amount) {
      paynow.setAmount(amount);
    }
    setError(undefined);
    if (!alreadyReviewed) paynow.requestReview();
    router.push('/paynow/review');
  }

  return (
    <ScreenContainer footer={<AppButton label="Review transfer" onPress={next} />}>
      <Header
        title="PayNow"
        subtitle={paynow.draft.recipientName ? `Paying ${paynow.draft.recipientName}` : undefined}
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      <AdaptiveModeSwitcher />
      <ReadabilityModeSwitcher />

      <TransactionProgress currentStep="amount" />

      {!recipientValid ? (
        <AppButton
          label="Choose recipient"
          variant="secondary"
          onPress={() => router.replace('/paynow/recipient')}
          accessibilityHint="Returns to recipient selection without resetting the transfer draft"
        />
      ) : null}

      {preferences.guidanceLevel === 'guided' ? (
        <GuidancePanel
          title={content.guidanceTitle!}
          body={content.guidanceBody}
          items={content.reminders}
        />
      ) : null}

      {paynow.draft.recipientName ? (
        <AppCard elevation="none">
          <View style={{ gap: theme.spacing.xs }}>
            <AppText role="caption" color="textSecondary">Recipient</AppText>
            <AppText role="bodyStrong">{paynow.draft.recipientName}</AppText>
            <AppText role="caption" color="textMuted">
              {paynow.draft.recipientBank} {paynow.draft.recipientIdentifier}
            </AppText>
          </View>
        </AppCard>
      ) : null}

      {preferences.guidanceLevel === 'quick' ? (
        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="label">Quick amounts</AppText>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: theme.spacing.sm,
            }}
          >
            {[10, 50, 100].map((amount) => {
              const selected = raw === String(amount);
              return (
              <Pressable
                key={amount}
                accessibilityRole="button"
                accessibilityLabel={`${amount} Singapore dollars`}
                accessibilityHint={`Enters ${amount} Singapore dollars`}
                accessibilityState={{ selected }}
                onPress={() => choosePreset(amount)}
                style={({ pressed }) => ({
                  minHeight: 48,
                  flexGrow: 1,
                  flexBasis: 88,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingHorizontal: theme.spacing.md,
                  borderRadius: theme.radius.lg,
                  borderWidth: selected || theme.clarity ? 2 : 1,
                  borderColor: selected ? theme.colors.selectedBorder : theme.colors.border,
                  backgroundColor: selected ? theme.colors.selectedBg : theme.colors.surface,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <AppText role="label" color={selected ? 'primary' : 'textPrimary'}>
                  {selected ? '✓ ' : ''}S${amount}
                </AppText>
              </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <AppCard>
        <View style={{ gap: theme.spacing.sm }}>
          <AppInput
            label="Amount (SGD)"
            keyboardType="decimal-pad"
            placeholder="0.00"
            value={raw}
            onChangeText={(t) => {
              setRaw(t);
              if (error) setError(undefined);
            }}
            error={error}
            hint="Synthetic demo — no real money moves."
            style={{ ...theme.typography.heading, minHeight: 64 }}
          />
        </View>
      </AppCard>

      {/* TODO: PAYNOW FEATURE — Dev B: notes/reference. */}
    </ScreenContainer>
  );
}
