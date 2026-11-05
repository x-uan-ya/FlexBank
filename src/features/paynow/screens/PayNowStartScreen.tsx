import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppText,
  Header,
  ScreenContainer,
} from '@/components';
import {
  AdaptiveModeSwitcher,
  GuidancePanel,
  PAYNOW_START_CONTENT,
  ReadabilityModeSwitcher,
} from '@/features/adaptive';
import { usePreferences } from '@/state';
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
  const preferences = usePreferences();
  const content = PAYNOW_START_CONTENT[preferences.guidanceLevel];

  function begin() {
    paynow.startTransfer();
    router.push('/paynow/recipient');
  }

  return (
    <ScreenContainer footer={<AppButton label="Start a PayNow transfer" onPress={begin} />}>
      <Header
        title="PayNow"
        subtitle="A clear, simulated transfer journey"
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      <AdaptiveModeSwitcher />
      <ReadabilityModeSwitcher />

      {preferences.guidanceLevel === 'guided' ? (
        <GuidancePanel
          title={content.title}
          body={content.body}
          items={content.steps}
        />
      ) : (
        <AppCard>
          <View style={{ gap: theme.spacing.sm }}>
            <AppText role="subheading">{content.title}</AppText>
            <AppText role="body" color="textSecondary">
              {content.body}
            </AppText>
          </View>
        </AppCard>
      )}

      <AppCard elevation="none" style={{ backgroundColor: theme.colors.surfaceMuted }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm }}>
          <AppText role="bodyStrong" color="primary">✓</AppText>
          <AppText role="caption" color="textSecondary" style={{ flex: 1 }}>
            You will review the recipient and amount before confirming. No real money moves.
          </AppText>
        </View>
      </AppCard>

      {/* TODO: SAFETY FEATURE — Dev D: optionally surface a confidence
          checkpoint entry here for guided mode. */}
    </ScreenContainer>
  );
}
