import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppButton, AppCard, AppText } from '@/components';
import { BankingScreen } from '@/components/BankingScreen';
import { useTransaction } from '@/state';
import { useTheme } from '@/theme';
import { formatMoney } from '@/utils';
import { bankingReturnRoute } from '@/utils/bankingNavigation';
import { useSafety } from '../useSafety';

/** Existing safety placeholder; Continue still only resumes, never confirms. */
export function CheckpointScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const safety = useSafety();
  const draft = useTransaction();
  return <BankingScreen title="Take a moment to check" backTo={bankingReturnRoute(returnTo, '/paynow')}>
    <AppCard elevation="none">
      <View style={{ gap: theme.spacing.sm }}>
        <AppText color="textSecondary">Make sure these details match what you intend. You can continue or ask for help. Nothing is sent from this screen.</AppText>
        {draft.recipientName ? <AppText role="bodyStrong">
          {draft.amount !== undefined ? formatMoney(draft.amount, draft.currency) : ''} to {draft.recipientName}
        </AppText> : null}
        <AppText role="caption" color="textSecondary">This is a demo safety check. Final confirmation stays on Review.</AppText>
      </View>
    </AppCard>
    <AppButton label="I'm sure, continue" onPress={() => {
      safety.resumeTransaction();
      router.back();
    }} />
    <AppButton label="Get help from a person" variant="secondary"
      onPress={() => router.push({ pathname: '/human-assistance', params: { returnTo: '/checkpoint' } })} />
  </BankingScreen>;
}
