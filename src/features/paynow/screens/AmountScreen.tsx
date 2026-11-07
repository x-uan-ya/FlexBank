import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppButton, AppCard, AppInput, AppText } from '@/components';
import { BankingDemoNotice, BankingScreen } from '@/components/BankingScreen';
import { MOCK_ACCOUNTS, PRIMARY_ACCOUNT_ID } from '@/data/accounts';
import { GuidancePanel, PAYNOW_AMOUNT_CONTENT, TransactionProgress } from '@/features/adaptive';
import { BankingPreferencesPanel } from '@/features/adaptive/BankingPreferencesPanel';
import { usePreferences } from '@/state';
import { useTheme } from '@/theme';
import { formatMoney } from '@/utils';

import { RecipientSummary } from '../components/TransferSummary';
import { usePayNow } from '../usePayNow';
import { validateRecipient, validateTransaction } from '../validation';

/** Amount presentation; existing parsing, validation and re-review are retained. */
export function AmountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const paynow = usePayNow();
  const preferences = usePreferences();
  const content = PAYNOW_AMOUNT_CONTENT[preferences.guidanceLevel];
  const recipientValid = validateRecipient(paynow.draft).valid;
  const account = MOCK_ACCOUNTS.find(item => item.id === PRIMARY_ACCOUNT_ID);
  const terminal = paynow.draft.status === 'confirmed' || paynow.draft.status === 'cancelled';

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

  return <BankingScreen title="How much would you like to send?" backTo="/paynow/recipient">
    <TransactionProgress currentStep="amount" completionLabel="Done" wrapInPairs />
    <BankingPreferencesPanel />
    <RecipientSummary draft={paynow.draft} />
    {!recipientValid ? <AppButton label="Choose recipient" variant="secondary"
      onPress={() => router.replace('/paynow/recipient')}
      accessibilityHint="Returns to recipient selection without resetting the transfer draft" /> : null}
    {terminal ? <AppCard elevation="none">
      <View style={{ gap: theme.spacing.sm }}>
        <AppText>This transfer is complete or cancelled. Start a new transfer to enter another amount.</AppText>
        <AppButton label="Start a new transfer" variant="secondary" onPress={() => router.push('/paynow')} />
      </View>
    </AppCard> : null}

    <AppCard key="amount-input">
      <View style={{ gap: theme.spacing.sm }}>
        <AppInput label="Amount (SGD)" keyboardType="decimal-pad" placeholder="0.00"
          value={raw} onChangeText={text => { setRaw(text); if (error) setError(undefined); }}
          error={error} hint="Enter Singapore dollars (S$), for example 50.00."
          editable={!terminal} returnKeyType="done" onSubmitEditing={next}
          style={{ ...theme.typography.heading, minHeight: 64 }} />
        {preferences.guidanceLevel === 'quick' ? <View style={{ gap: theme.spacing.sm }}>
          <AppText role="label">Quick amounts</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {[10, 50, 100].map(amount => {
              const selected = raw === String(amount);
              return <Pressable key={amount} accessibilityRole="button"
                accessibilityLabel={amount + ' Singapore dollars'}
                accessibilityHint={'Enters ' + amount + ' Singapore dollars'}
                accessibilityState={{ selected, disabled: terminal }} aria-pressed={selected}
                disabled={terminal} onPress={() => choosePreset(amount)}
                style={({ pressed }) => ({
                  minHeight: 48, flexGrow: 1, flexBasis: 88, paddingHorizontal: theme.spacing.sm,
                  alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.md,
                  borderWidth: selected || theme.clarity ? 2 : 1,
                  borderColor: selected ? theme.colors.selectedBorder : theme.clarity ? theme.colors.borderStrong : theme.colors.border,
                  backgroundColor: selected ? theme.colors.selectedBg : theme.colors.surface,
                  opacity: pressed ? 0.8 : 1,
                })}>
                <AppText role="label" color={selected ? 'primary' : 'textPrimary'}>{selected ? '✓ ' : ''}{'S$' + amount}</AppText>
              </Pressable>;
            })}
          </View>
        </View> : null}
      </View>
    </AppCard>

    <AppCard elevation="none" style={{ backgroundColor: theme.colors.surfaceMuted }}>
      <View style={{ gap: theme.spacing.xs }}>
        <AppText role="caption" color="textSecondary">Available demo balance</AppText>
        <AppText role="bodyStrong">{account ? formatMoney(account.balance, account.currency) : 'Unavailable'}</AppText>
        {/* Informational copy mirrors existing validation; it does not set a limit. */}
        <AppText role="caption" color="textSecondary">Demo transfer limit: S$25,000.00. Minimum: S$1.00.</AppText>
      </View>
    </AppCard>

    {preferences.guidanceLevel === 'guided' ? <GuidancePanel title={content.guidanceTitle!}
      body="Enter the amount you want to send, using up to two decimal places. We check the amount before you review it."
      items={['Check the amount against your available balance.', 'You will review all details before choosing Confirm and send.']} /> :
      preferences.guidanceLevel === 'balanced' ? <AppText role="caption" color="textSecondary">
        You will check the recipient and amount on Review before confirming.
      </AppText> : null}
    <AppButton label="Review transfer" onPress={next} disabled={terminal}
      accessibilityHint="Checks the complete draft, then opens Review; it does not send money" />
    <BankingDemoNotice />
  </BankingScreen>;
}
