import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppInput,
  Header,
  ScreenContainer,
} from '@/components';
import { useTheme } from '@/theme';

import { usePayNow } from '../usePayNow';
import { validateTransaction } from '../validation';

/**
 * Amount entry (Developer B). Validates with customer-friendly messages, then
 * advances to review.
 *
 * Validates the WHOLE draft (recipient + amount), so nobody can reach the
 * review step without a valid recipient.
 *
 * RE-REVIEW RULE: if the transfer had already reached review (or needed a
 * re-review) we do NOT mark it ready again from here. The customer must press
 * "I have reviewed the details" on the review screen themselves. Marking it
 * ready here would silently clear the "details changed" warning.
 */
export function AmountScreen() {
  const theme = useTheme();
  const router = useRouter();
  const paynow = usePayNow();

  const [raw, setRaw] = useState(
    paynow.draft.amount !== undefined ? String(paynow.draft.amount) : '',
  );
  const [error, setError] = useState<string | undefined>();

  function next() {
    const draft = paynow.draft;

    // An empty box or something like "." is "no amount", not 0 or NaN.
    const parsed = Number(raw);
    const amount = raw.trim() === '' || Number.isNaN(parsed) ? undefined : parsed;

    // Was the transfer already at or past review before this press?
    const alreadyReviewed =
      draft.status === 'readyForReview' || draft.status === 'reviewRequired';

    // Only write the amount if it actually changed. (Writing the same amount
    // again would needlessly force a re-review.)
    if (amount !== undefined && amount !== draft.amount) {
      paynow.setAmount(amount);
    }

    const result = validateTransaction({ ...draft, amount });
    if (!result.valid) {
      setError(result.messages.join(' '));
      return;
    }
    setError(undefined);

    if (!alreadyReviewed) {
      paynow.requestReview();
    }
    router.push('/paynow/review');
  }

  return (
    <ScreenContainer footer={<AppButton label="Review transfer" onPress={next} />}>
      <Header
        title="How much?"
        subtitle={paynow.draft.recipientName ? `Paying ${paynow.draft.recipientName}` : undefined}
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      <AppCard>
        <View style={{ gap: theme.spacing.sm }}>
          <AppInput
            label="Amount (SGD)"
            keyboardType="decimal-pad"
            placeholder="0.00"
            value={raw}
            onChangeText={(t) => {
              setRaw(t.replace(/[^0-9.]/g, ''));
              if (error) setError(undefined);
            }}
            error={error}
            hint="Synthetic demo — no real money moves."
          />
        </View>
      </AppCard>

      {/* TODO: PAYNOW FEATURE — Dev B: quick-amount chips, notes/reference. */}
    </ScreenContainer>
  );
}
