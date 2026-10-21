import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppInput,
  AppText,
  Header,
  ScreenContainer,
} from '@/components';
import { useTheme } from '@/theme';

import { usePayNow } from '../usePayNow';
import { validateAmount } from '../validation';

/**
 * Amount entry (Developer B). Validates with customer-friendly messages, then
 * marks the draft ready for review and advances.
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
    const amount = Number(raw);
    // Write the amount first so validation runs against the latest draft.
    paynow.setAmount(amount);
    const result = validateAmount({ ...paynow.draft, amount });
    if (!result.valid) {
      setError(result.messages[0]);
      return;
    }
    setError(undefined);
    paynow.requestReview();
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
