import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
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
  TransactionProgress,
} from '@/features/adaptive';
import { HomeIcon } from '@/features/home/components/HomeIcon';
import { usePreferences, useSession } from '@/state';
import { useTheme } from '@/theme';
import { formatMoney } from '@/utils';

import { getPayNowResumeRoute } from '../startNavigation';
import { usePayNow } from '../usePayNow';
import { validateAmount, validateRecipient } from '../validation';

/**
 * Entry presentation only. Fresh/restart actions use the existing contract;
 * resuming and preference changes never mutate the active transfer.
 */
export function PayNowStartScreen() {
  const theme = useTheme();
  const router = useRouter();
  const paynow = usePayNow();
  const preferences = usePreferences();
  const content = PAYNOW_START_CONTENT[preferences.guidanceLevel];
  const { state } = useSession();
  const resumeRoute = getPayNowResumeRoute(paynow.draft, state.interactionMode);
  const [restartRequested, setRestartRequested] = useState(false);
  const restartButton = useRef<View>(null);
  const resumeExplanation = resumeRoute === '/checkpoint'
    ? 'Resume your safety check before continuing. Nothing has been sent.'
    : resumeRoute === '/paynow/success'
      ? 'The last attempt did not complete. Resume to see your recovery options.'
      : resumeRoute === '/paynow/review'
        ? 'Resume to review your saved details. You will still confirm the transfer yourself.'
        : resumeRoute === '/paynow/amount'
          ? 'Resume to enter or check the amount for this recipient.'
          : 'Resume to choose who you want to pay. Your saved draft is kept.';

  function begin() {
    if (resumeRoute) {
      // Keep recovery inside the current app document. Unwinding browser
      // history can cross a prior reload and lose the in-memory session.
      if (resumeRoute === '/checkpoint') router.push(resumeRoute);
      else router.replace(resumeRoute);
      return;
    }
    paynow.startTransfer();
    router.push('/paynow/recipient');
  }

  function restart() {
    // This action is available only after the explicit clear-draft explanation.
    paynow.startTransfer();
    setRestartRequested(false);
    router.push('/paynow/recipient');
  }

  return (
    <ScreenContainer>
      <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', gap: theme.spacing.md }}>
      <Header
        title="PayNow"
        onBack={() => router.replace('/home')}
        right={
          <Pressable accessibilityRole="button" accessibilityLabel="Help with PayNow"
            accessibilityHint="Opens help and assistance without changing your transfer"
            onPress={() => router.push({ pathname: '/human-assistance', params: { returnTo: '/paynow' } })}
            style={({ pressed }) => ({ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center',
              borderRadius: theme.radius.pill, backgroundColor: pressed ? theme.colors.selectedBg : theme.colors.surface })}>
            <HomeIcon name="help" size={24} />
          </Pressable>
        }
      />

      <View style={{ gap: theme.spacing.sm }}>
        <AppText role="title" accessibilityRole="header">Send money with PayNow</AppText>
        <AppText color="textSecondary">Send money to someone using their mobile number or a saved recipient.</AppText>
      </View>

      <TransactionProgress heading="Your transfer in 4 steps" completionLabel="Done" wrapInPairs
        currentStep={resumeRoute === '/paynow/review' || resumeRoute === '/paynow/success' ? 'review' : resumeRoute === '/paynow/amount' ? 'amount' : 'recipient'} />

      {!resumeRoute && preferences.guidanceLevel === 'guided' ? (
        <GuidancePanel
          title={content.title}
          body={content.body}
        />
      ) : !resumeRoute && preferences.guidanceLevel === 'balanced' ? <AppText role="caption" color="textSecondary">{content.body}</AppText> : null}

      {resumeRoute ? (
        <AppCard elevation="none">
          <View style={{ gap: theme.spacing.xs }}>
            <AppText role="subheading">Your unfinished transfer</AppText>
            <AppText role={preferences.guidanceLevel === 'guided' ? 'body' : 'caption'} color="textSecondary">
              {resumeExplanation}
            </AppText>
            {validateRecipient(paynow.draft).valid ? <>
              <AppText role="bodyStrong">{paynow.draft.recipientName}</AppText>
              <AppText role="caption" color="textSecondary">{paynow.draft.recipientBank} {paynow.draft.recipientIdentifier}</AppText>
            </> : null}
            {paynow.draft.amount !== undefined && validateAmount(paynow.draft).valid ? <AppText role="bodyStrong">{formatMoney(paynow.draft.amount, paynow.draft.currency)}</AppText> : null}
          </View>
        </AppCard>
      ) : null}

      <View style={{ gap: theme.spacing.sm }}>
        <AppText role="caption" color="textSecondary">Demo transfer — no real money will move.</AppText>
        <AppButton label={resumeRoute ? 'Resume transfer' : 'Continue to recipient'} onPress={begin}
          accessibilityHint={resumeRoute ? 'Returns to your saved transfer without clearing it' : 'Starts a new demo transfer and opens recipient selection'} />
        {resumeRoute ? <Pressable ref={restartButton} accessibilityRole="button" accessibilityLabel="Start again"
          accessibilityState={{ expanded: restartRequested }} aria-expanded={restartRequested}
          onPress={() => setRestartRequested(open => !open)}
          style={({ pressed }) => ({ minHeight: 48, alignItems: 'center', justifyContent: 'center',
            padding: theme.spacing.sm, borderRadius: theme.radius.lg, opacity: pressed ? 0.8 : 1 })}>
          <AppText role="bodyStrong" color="primary">Start again</AppText>
        </Pressable> : null}
        {resumeRoute && restartRequested ? <AppCard elevation="none">
          <View style={{ gap: theme.spacing.sm }}>
            <AppText role="subheading" accessibilityLiveRegion="polite">Start a new transfer?</AppText>
            <AppText color="textSecondary">This clears the saved recipient and amount. Your banking pace and display settings stay the same.</AppText>
            <AppButton label="Clear draft and start again" variant="secondary" onPress={restart} />
            <AppButton label="Keep current transfer" variant="ghost" onPress={() => {
              setRestartRequested(false);
              restartButton.current?.focus();
            }} />
          </View>
        </AppCard> : null}
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <AdaptiveModeSwitcher />
        <ReadabilityModeSwitcher />
      </View>
      </View>
    </ScreenContainer>
  );
}
