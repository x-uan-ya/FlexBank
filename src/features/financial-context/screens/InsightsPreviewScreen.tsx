import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppButton, AppText, Header, ScreenContainer } from '@/components';
import { useTheme } from '@/theme';

import { PersonalisedInsightsPanel } from '../components/PersonalisedInsightsPanel';

/** Isolated QA route; Home integration waits for the quick-actions/calendar merge. */
export function InsightsPreviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [balanceHidden, setBalanceHidden] = useState(false);
  return (
    <ScreenContainer scroll>
      <Header title="Insights preview" subtitle="Reusable Home panel" onBack={() => router.replace('/home')} />
      <View style={{ gap: theme.spacing.sm }}>
        <AppText role="caption" color="textSecondary">
          Preview only. The balance visibility control is local to this screen.
        </AppText>
        <AppButton
          label={balanceHidden ? 'Show financial amounts' : 'Hide financial amounts'}
          variant="secondary"
          accessibilityState={{ checked: balanceHidden }}
          onPress={() => setBalanceHidden((hidden) => !hidden)}
        />
      </View>
      <PersonalisedInsightsPanel balanceHidden={balanceHidden} />
    </ScreenContainer>
  );
}
