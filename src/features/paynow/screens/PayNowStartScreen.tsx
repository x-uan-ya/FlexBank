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

import { usePayNow } from '../usePayNow';

/**
 * PayNow entry (Developer B). Starts a fresh transfer and sends the customer to
 * recipient selection.
 */
export function PayNowStartScreen() {
  const theme = useTheme();
  const router = useRouter();
  const paynow = usePayNow();

  function begin() {
    paynow.startTransfer();
    router.push('/paynow/recipient');
  }

  return (
    <ScreenContainer footer={<AppButton label="Start a PayNow transfer" onPress={begin} />}>
      <Header
        title="PayNow"
        subtitle="Send money instantly (simulated)"
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      <AppCard>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="subheading">How it works</AppText>
          <AppText role="body" color="textSecondary">
            Choose who to pay, enter an amount, review the details, then confirm.
            You will always see a summary before anything is sent. This is a
            simulation using synthetic data.
          </AppText>
        </View>
      </AppCard>

      {/* TODO: SAFETY FEATURE — Dev D: optionally surface a confidence
          checkpoint entry here for guided mode. */}
    </ScreenContainer>
  );
}
