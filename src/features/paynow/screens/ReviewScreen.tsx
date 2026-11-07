import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppButton, AppCard, AppText } from '@/components';
import { BankingDemoNotice, BankingScreen } from '@/components/BankingScreen';
import { GuidancePanel, PAYNOW_REVIEW_CONTENT, TransactionProgress } from '@/features/adaptive';
import { BankingPreferencesPanel } from '@/features/adaptive/BankingPreferencesPanel';
import { usePreferences } from '@/state';
import { useTheme } from '@/theme';

import { TransferSummary } from '../components/TransferSummary';
import { usePayNow } from '../usePayNow';
import { canConfirmTransaction, canShowSuccessfulReceipt, validateRecipient, validateTransaction } from '../validation';

/** Presentation update; confirmation/re-review/cancel and observed-outcome handlers remain unchanged. */
export function ReviewScreen() {
  const theme = useTheme();
  const router = useRouter();
  const paynow = usePayNow();
  const preferences = usePreferences();
  const content = PAYNOW_REVIEW_CONTENT[preferences.guidanceLevel];
  const { draft } = paynow;
  const [submissionRequested, setSubmissionRequested] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | undefined>();
  const outcomeNavigationStarted = useRef(false);

  const validation = validateTransaction(draft);
  const needsReReview = draft.requiresReview || draft.status === 'reviewRequired' || draft.status === 'failed';
  const canConfirm = canConfirmTransaction(draft);
  const terminal = draft.status === 'confirmed' || draft.status === 'cancelled';

  useEffect(() => {
    if (!submissionRequested || outcomeNavigationStarted.current) return;
    const acceptedSuccess = canShowSuccessfulReceipt(draft);
    const acceptedFailure = draft.status === 'failed' && validateTransaction(draft).valid;
    if (acceptedSuccess || acceptedFailure) {
      outcomeNavigationStarted.current = true;
      router.replace('/paynow/success');
    } else if (!canConfirmTransaction(draft)) {
      setSubmissionRequested(false);
      setSubmissionError('The transfer was not submitted. Check the details and review again.');
    }
  }, [draft, router, submissionRequested]);

  function confirm() {
    if (!canConfirm || submissionRequested) return;
    setSubmissionError(undefined);
    setSubmissionRequested(true);
    // The reducer validates and records the outcome. The effect above only
    // navigates once that authoritative outcome is visible in shared state.
    paynow.confirmTransaction();
  }

  function reviewAgain() {
    if (!validation.valid || terminal) return;
    setSubmissionError(undefined);
    paynow.requestReview();
  }

  function editDetails() {
    router.replace(validateRecipient(draft).valid ? '/paynow/amount' : '/paynow/recipient');
  }

  function cancel() {
    if (terminal || submissionRequested) return;
    setSubmissionRequested(false);
    paynow.cancelTransfer();
    router.replace('/home');
  }

  return <BankingScreen title="Review your transfer" subtitle="Check everything carefully before sending."
    backTo={validateRecipient(draft).valid ? '/paynow/amount' : '/paynow/recipient'}>
    <TransactionProgress currentStep={validation.valid ? 'review' : validateRecipient(draft).valid ? 'amount' : 'recipient'}
      completionLabel="Done" wrapInPairs />
    <BankingPreferencesPanel />

    {!validation.valid || submissionError ? <AppCard elevation="none" style={{ borderColor: theme.colors.danger }}>
      <View style={{ gap: theme.spacing.sm }}>
        <AppText role="bodyStrong" color="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">
          {submissionError ?? validation.messages.join(' ')}
        </AppText>
        <AppText role="caption" color="textSecondary">Use Edit details to correct the recipient and amount before confirming.</AppText>
      </View>
    </AppCard> : null}

    <TransferSummary draft={draft} source />

    {needsReReview ? <AppCard elevation="none" style={{ backgroundColor: theme.colors.warningSoft, borderColor: theme.colors.warning }}>
      <View style={{ gap: theme.spacing.sm }}>
        <AppText role="bodyStrong">Details changed — please review again</AppText>
        <AppText color="textSecondary">Check the updated recipient and amount. Confirm is unavailable until you acknowledge the details.</AppText>
        <AppButton label="I have reviewed the details" variant="secondary" onPress={reviewAgain}
          disabled={!validation.valid || terminal || submissionRequested} />
      </View>
    </AppCard> : null}

    {preferences.guidanceLevel === 'guided' ? <GuidancePanel title="Check before you confirm"
      body="A careful check helps you avoid sending to the wrong person."
      items={content.checklist} /> : null}

    <AppCard elevation="none" style={{ backgroundColor: theme.colors.warningSoft, borderColor: theme.colors.warning }}>
      <View style={{ gap: theme.spacing.xs }}>
        <AppText role="bodyStrong">Confirm only when everything is correct</AppText>
        <AppText role="caption" color="textSecondary">
          Choosing Confirm and send submits this demo transfer. Check the recipient, destination and amount first.
        </AppText>
      </View>
    </AppCard>
    <BankingDemoNotice />
    <View style={{ gap: theme.spacing.sm }}>
      <AppButton label="Confirm and send" onPress={confirm} disabled={!canConfirm || submissionRequested}
        loading={submissionRequested} accessibilityHint="Explicitly confirms the simulated transfer after all details have been reviewed" />
      <AppButton label="Edit details" variant="secondary" onPress={editDetails} disabled={terminal || submissionRequested}
        accessibilityHint="Returns to edit without clearing this transfer" />
      <AppButton label="Cancel transfer" variant="ghost" onPress={cancel} disabled={terminal || submissionRequested}
        accessibilityHint="Clears this transfer and returns to Home" />
      {terminal ? <AppButton label="Return Home" variant="secondary" onPress={() => router.replace('/home')} /> : null}
    </View>
    <AppButton label="Explain this screen" variant="ghost" onPress={() => router.push({ pathname: '/concierge', params: { returnTo: '/paynow/review' } })}
      accessibilityHint="Opens demo Banking Concierge; it cannot confirm or change this transfer" />
  </BankingScreen>;
}
