import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppButton, AppCard, AppText } from '@/components';
import { BankingDemoNotice, BankingScreen } from '@/components/BankingScreen';
import { GuidancePanel, PAYNOW_SUCCESS_CONTENT, TransactionProgress } from '@/features/adaptive';
import { BankingPreferencesPanel } from '@/features/adaptive/BankingPreferencesPanel';
import { usePreferences, useTransaction } from '@/state';
import { useTheme } from '@/theme';
import { makeReference } from '@/utils';

import { TransferSummary } from '../components/TransferSummary';
import { canShowSuccessfulReceipt, validateTransaction } from '../validation';

/** Existing outcome/receipt guards and mounted reference lifetime are retained. */
export function SuccessScreen() {
  const theme = useTheme();
  const router = useRouter();
  const draft = useTransaction();
  const preferences = usePreferences();
  const content = PAYNOW_SUCCESS_CONTENT[preferences.guidanceLevel];
  const confirmed = canShowSuccessfulReceipt(draft);
  const failed = draft.status === 'failed' && validateTransaction(draft).valid;
  const [reference] = useState(() => makeReference());
  const title = confirmed ? 'Transfer completed' : 'Transfer not completed';
  const body = confirmed ? content.confirmedBody : failed
    ? preferences.guidanceLevel === 'quick' ? content.failedBody : draft.failureReason ?? content.failedBody
    : 'This transfer has not been confirmed. Return to PayNow to start or resume your details.';

  useEffect(() => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(title + '. Demo only. No real money moved.');
  }, [title]);

  return <BankingScreen title="PayNow" backTo="/home">
    <View style={{ gap: theme.spacing.sm }} accessibilityLiveRegion="polite">
      <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
        style={{ minWidth: 48, minHeight: 48, alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center',
          borderRadius: theme.radius.pill, padding: theme.spacing.sm,
          backgroundColor: confirmed ? theme.colors.successSoft : failed ? theme.colors.dangerSoft : theme.colors.warningSoft }}>
        <AppText role="title" color={confirmed ? 'success' : failed ? 'danger' : 'warning'}>{confirmed ? '✓' : '!'}</AppText>
      </View>
      <AppText role="title" accessibilityRole="header">{title}</AppText>
      <AppText color="textSecondary">{body}</AppText>
    </View>

    {confirmed || failed ? <TransactionProgress currentStep={confirmed ? 'complete' : 'review'} completionLabel="Done" wrapInPairs /> : null}
    <BankingPreferencesPanel />

    {confirmed ? <TransferSummary draft={draft} reference={reference} title="Transfer receipt" /> :
      failed ? <TransferSummary draft={draft} title="Saved transfer details" /> : <AppCard elevation="none">
        <AppText color="textSecondary">A successful receipt is available only after a valid transfer is reviewed and explicitly confirmed.</AppText>
      </AppCard>}

    {preferences.guidanceLevel === 'guided' && (confirmed || failed) ? <GuidancePanel
      title={confirmed ? 'What happens next?' : 'You can recover without starting over'}
      items={confirmed ? content.nextSteps : content.retrySteps} /> : null}
    <BankingDemoNotice text="Synthetic demo only. No actual bank transfer or movement of money occurred." />
    <View style={{ gap: theme.spacing.sm }}>
      {failed ? <>
        <AppButton label="Edit details and try again" onPress={() => router.replace('/paynow/amount')}
          accessibilityHint="Returns to the saved amount; you must review again before confirming" />
        <AppButton label="Ask for help" variant="secondary" onPress={() => router.push({ pathname: '/human-assistance', params: { returnTo: '/paynow/success' } })} />
      </> : null}
      {!confirmed && !failed ? <AppButton label="Return to PayNow" variant="secondary" onPress={() => router.replace('/paynow')} /> : null}
      <AppButton label="Done — back to home" variant={failed ? 'ghost' : 'primary'} onPress={() => router.replace('/home')} />
    </View>
  </BankingScreen>;
}
