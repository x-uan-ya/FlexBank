import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppInput,
  AppText,
  Header,
  Icon,
  ScreenContainer,
} from '@/components';
import { isValidEmail } from '@/services';
import { useTheme } from '@/theme';

import { BrandMark } from '../components/BrandMark';

/**
 * Forgot password (prototype).
 *
 * This local-first prototype has no email server, so we show a realistic,
 * honest confirmation rather than pretending to send a reset email. The screen
 * demonstrates the flow and copy; wiring a real reset belongs with the backend
 * (see BACKEND.md).
 */
export function ForgotPasswordScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);

  function submit() {
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setError(undefined);
    setSent(true);
  }

  return (
    <ScreenContainer scroll>
      <Header title="Reset password" onBack={() => router.back()} />
      <View style={{ gap: theme.spacing.lg, marginTop: theme.spacing.sm }}>
        <BrandMark />

        {sent ? (
          <AppCard>
            <View style={{ gap: theme.spacing.sm, alignItems: 'flex-start' }}>
              <Icon name="check" size={22} color={theme.colors.success} circle circleColor={theme.colors.successSoft} circleSize={48} />
              <AppText role="subheading">Check your email</AppText>
              <AppText role="body" color="textSecondary">
                If an account exists for {email}, you&apos;ll receive reset
                instructions shortly. (Prototype: no email is actually sent.)
              </AppText>
              <AppButton label="Back to login" onPress={() => router.replace('/login')} />
            </View>
          </AppCard>
        ) : (
          <AppCard>
            <View style={{ gap: theme.spacing.md }}>
              <AppText role="body" color="textSecondary">
                Enter the email linked to your account and we&apos;ll send you a
                link to reset your password.
              </AppText>
              <AppInput
                label="Email"
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (error) setError(undefined);
                }}
                error={error}
              />
              <AppButton label="Send reset link" onPress={submit} />
            </View>
          </AppCard>
        )}
      </View>
    </ScreenContainer>
  );
}
