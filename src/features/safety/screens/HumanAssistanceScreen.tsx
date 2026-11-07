import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppText,
  Header,
  ScreenContainer,
} from '@/components';
import { useAppDispatch, usePreferences, useTransaction } from '@/state';
import { useTheme } from '@/theme';
import {
  DISPLAY_MODE_LABELS,
  GUIDANCE_LABELS,
  LANGUAGE_LABELS,
} from '@/types/preferences';
import type { TransactionStep } from '@/types/transaction';

import { useSafety } from '../useSafety';

const STEP_LABELS: Record<TransactionStep, string> = {
  recipient: 'Choosing a recipient',
  amount: 'Entering an amount',
  review: 'Reviewing the transfer',
  checkpoint: 'Reviewing the transfer',
  confirmation: 'Transfer confirmation',
};

/**
 * Human Assistance handoff (Developer D / Member 5) — SIMULATED.
 *
 * Shows what support options would exist and exactly what non-sensitive context
 * would be shared. It does not connect to a real agent, never cancels progress,
 * and never confirms a transfer.
 */
export function HumanAssistanceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const safety = useSafety();
  const dispatch = useAppDispatch();
  const prefs = usePreferences();
  const draft = useTransaction();
  const [requested, setRequested] = useState(false);

  const hasTransfer = ['editing', 'readyForReview', 'reviewRequired'].includes(
    draft.status,
  );

  // Only non-sensitive context: no recipient, account number or amount.
  const sharedItems = [
    `Where you are: ${hasTransfer ? STEP_LABELS[draft.currentStep] : 'Not in a transfer'}`,
    `Task: ${hasTransfer ? 'PayNow transfer' : 'General help'}`,
    `Language: ${LANGUAGE_LABELS[prefs.language]}`,
    `Guidance level: ${GUIDANCE_LABELS[prefs.guidanceLevel]}`,
    `Display mode: ${DISPLAY_MODE_LABELS[prefs.displayMode]}`,
  ];

  function request() {
    safety.requestHumanAssistance();
    setRequested(true);
  }

  function finish() {
    if (requested) {
      dispatch({ type: 'RESOLVE_HUMAN_ASSISTANCE' });
    }
    if (hasTransfer) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/paynow/review');
      }
    } else {
      router.replace('/home');
    }
  }

  return (
    <ScreenContainer
      footer={
        requested ? (
          <AppButton
            label={hasTransfer ? 'Return to my transfer' : 'Back to home'}
            onPress={finish}
          />
        ) : (
          <AppButton label="Request human assistance" onPress={request} />
        )
      }
    >
      <Header title="Talk to a person" onBack={finish} />

      <AppCard>
        <View style={{ gap: theme.spacing.xs }}>
          <AppText role="bodyStrong">Simulated demo</AppText>
          <AppText role="body" color="textSecondary">
            This prototype does not connect to a real OCBC agent. It shows how a
            handoff could work.
          </AppText>
        </View>
      </AppCard>

      {requested ? (
        <AppCard>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText role="bodyStrong">Request recorded (simulated)</AppText>
            <AppText role="body" color="textSecondary">
              In a real service, a person would pick this up. Your transfer is
              saved, and nothing has been sent or cancelled.
            </AppText>
          </View>
        </AppCard>
      ) : null}

      <AppCard>
        <View style={{ gap: theme.spacing.xs }}>
          <AppText role="bodyStrong">Ways a person could help</AppText>
          <AppText role="body" color="textSecondary">• Call support</AppText>
          <AppText role="body" color="textSecondary">• Chat with support</AppText>
          <AppText role="body" color="textSecondary">• Visit a branch</AppText>
        </View>
      </AppCard>

      <AppCard>
        <View style={{ gap: theme.spacing.xs }}>
          <AppText role="bodyStrong">What we would share</AppText>
          {sharedItems.map((item) => (
            <AppText key={item} role="body" color="textSecondary">
              • {item}
            </AppText>
          ))}
          <AppText role="caption" color="textMuted">
            No account numbers, recipient names or amounts are shared.
          </AppText>
        </View>
      </AppCard>
    </ScreenContainer>
  );
}