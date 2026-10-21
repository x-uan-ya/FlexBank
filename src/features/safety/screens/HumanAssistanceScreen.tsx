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
import { useTheme } from '@/theme';

import { useSafety } from '../useSafety';

/**
 * Human Assistance handoff placeholder (Developer D).
 *
 * Simulates requesting a human agent. Sets `assistanceRequested` in session
 * state via the safety contract. Dev D builds the real queue / contact flow.
 */
export function HumanAssistanceScreen() {
  const theme = useTheme();
  const router = useRouter();
  const safety = useSafety();
  const [requested, setRequested] = useState(false);

  function request() {
    safety.requestHumanAssistance();
    setRequested(true);
  }

  return (
    <ScreenContainer>
      <Header
        title="Talk to a person"
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      <AppCard>
        <View style={{ gap: theme.spacing.sm }}>
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: theme.colors.accentSoft,
              paddingHorizontal: theme.spacing.sm,
              paddingVertical: theme.spacing.xs,
              borderRadius: theme.radius.pill,
            }}
          >
            <AppText role="caption" color="accent">
              Developer D — Safety
            </AppText>
          </View>

          {requested ? (
            <AppText role="body">
              Thanks. A FlexBank specialist would be with you shortly. (Simulated
              handoff — synthetic demo.)
            </AppText>
          ) : (
            <AppText role="body" color="textSecondary">
              If anything feels unclear, a person can help. Requesting assistance
              never cancels your progress and never confirms a transfer for you.
            </AppText>
          )}

          <AppText role="mono" color="textMuted">
            {'// TODO: SAFETY FEATURE'}
          </AppText>
        </View>
      </AppCard>

      {!requested ? (
        <AppButton label="Request human assistance" onPress={request} />
      ) : (
        <AppButton
          label="Back to home"
          variant="secondary"
          onPress={() => router.replace('/home')}
        />
      )}
    </ScreenContainer>
  );
}
