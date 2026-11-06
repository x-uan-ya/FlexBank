import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppInput,
  AppText,
  Icon,
  ScreenContainer,
} from '@/components';
import { DEMO_LOGINS } from '@/data';
import { useAuth } from '@/state';
import { useTheme } from '@/theme';
import { isValidEmail } from '@/services';
import type { AuthError } from '@/types';

import { BrandMark } from '../components/BrandMark';

/**
 * Login (integration lead).
 *
 * Authenticates through the local-first authService, which retrieves the
 * customer's profile + saved preferences; the home screen then renders their
 * purpose-based layout. Shows friendly errors, never raw ones.
 */
export function LoginScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | undefined>();
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  function validate(): boolean {
    let ok = true;
    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.');
      ok = false;
    } else setEmailError(undefined);
    if (!password) {
      setPasswordError('Enter your password.');
      ok = false;
    } else setPasswordError(undefined);
    return ok;
  }

  async function submit(prefillEmail?: string, prefillPassword?: string) {
    const e = prefillEmail ?? email;
    const p = prefillPassword ?? password;
    if (!prefillEmail && !validate()) return;

    setFormError(undefined);
    setBusy(true);
    try {
      await login({ email: e, password: p });
      router.replace('/home');
    } catch (err) {
      const auth = err as AuthError;
      setFormError(auth?.message ?? 'We could not sign you in. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScreenContainer scroll>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ gap: theme.spacing.lg, marginTop: theme.spacing.xl }}>
          <View style={{ gap: theme.spacing.sm }}>
            <BrandMark size="lg" />
            <AppText role="display">Welcome back.</AppText>
            <AppText role="body" color="textSecondary">
              Sign in to continue your banking, your way.
            </AppText>
          </View>

          <AppCard>
            <View style={{ gap: theme.spacing.md }}>
              <AppInput
                label="Email"
                placeholder="you@example.com"
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                textContentType="emailAddress"
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (emailError) setEmailError(undefined);
                  if (formError) setFormError(undefined);
                }}
                error={emailError}
              />

              <AppInput
                label="Password"
                placeholder="Your password"
                autoCapitalize="none"
                secureTextEntry={!showPassword}
                textContentType="password"
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (passwordError) setPasswordError(undefined);
                  if (formError) setFormError(undefined);
                }}
                error={passwordError}
                rightAccessory={
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    onPress={() => setShowPassword((s) => !s)}
                    hitSlop={10}
                  >
                    <Icon
                      name={showPassword ? 'eyeOff' : 'eye'}
                      size={20}
                      color={theme.colors.textSecondary}
                    />
                  </Pressable>
                }
              />

              {formError ? (
                <View
                  accessibilityRole="alert"
                  style={{
                    flexDirection: 'row',
                    gap: theme.spacing.sm,
                    backgroundColor: theme.colors.dangerSoft,
                    borderRadius: theme.radius.md,
                    padding: theme.spacing.sm,
                  }}
                >
                  <Icon name="info" size={16} color={theme.colors.danger} />
                  <AppText role="caption" color="danger" style={{ flex: 1 }}>
                    {formError}
                  </AppText>
                </View>
              ) : null}

              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Forgot password"
                onPress={() => router.push('/forgot-password')}
                hitSlop={8}
                style={{ alignSelf: 'flex-end' }}
              >
                <AppText role="label" color="accent">
                  Forgot password?
                </AppText>
              </Pressable>

              <AppButton label="Log in" loading={busy} onPress={() => submit()} />
            </View>
          </AppCard>

          {/* Register link */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            <AppText role="body" color="textSecondary">
              New to FlexBank?
            </AppText>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel="Create an account"
              onPress={() => router.push('/register')}
            >
              <AppText role="bodyStrong" color="accent">
                Create an account
              </AppText>
            </Pressable>
          </View>

          {/* Demo quick-logins (development aid for the competition demo). */}
          {__DEV__ ? (
            <AppCard style={{ borderStyle: 'dashed' }}>
              <View style={{ gap: theme.spacing.sm }}>
                <AppText role="label" color="textSecondary">
                  Demo accounts (dev only)
                </AppText>
                {DEMO_LOGINS.map((d) => (
                  <AppButton
                    key={d.email}
                    label={`Sign in as ${d.name}`}
                    variant="secondary"
                    onPress={() => submit(d.email, d.password)}
                  />
                ))}
              </View>
            </AppCard>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}
