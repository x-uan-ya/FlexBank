import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppButton, AppCard, AppText } from '@/components';
import { BankingScreen } from '@/components/BankingScreen';
import { useTheme } from '@/theme';
import { bankingReturnRoute } from '@/utils/bankingNavigation';
import { useSafety } from '../useSafety';

/** Existing simulated assistance action; no live support service is claimed. */
export function HumanAssistanceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const safety = useSafety();
  const [requested, setRequested] = useState(false);
  function request() {
    safety.requestHumanAssistance();
    setRequested(true);
  }
  return <BankingScreen title="Talk to a person" backTo={bankingReturnRoute(returnTo)}>
    <AppCard elevation="none">
      <View style={{ gap: theme.spacing.sm }} accessibilityLiveRegion="polite">
        <AppText role="subheading">{requested ? 'Demo request recorded' : 'Extra help when you need it'}</AppText>
        <AppText color="textSecondary">{requested
          ? 'Your request is recorded in this demo session. No real support agent has been contacted.'
          : 'You can try a simulated request for human assistance. Live support is not connected in this prototype.'}</AppText>
        <AppText role="caption" color="textSecondary">Requesting help keeps your transfer details and never confirms a transfer.</AppText>
      </View>
    </AppCard>
    {!requested ? <AppButton label="Request human assistance" onPress={request} /> :
      <AppButton label="Back to home" variant="secondary" onPress={() => router.replace('/home')} />}
  </BankingScreen>;
}
