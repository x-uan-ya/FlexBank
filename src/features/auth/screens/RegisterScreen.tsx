import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppInput,
  AppText,
  Divider,
  Icon,
  type IconName,
  ScreenContainer,
  SelectableCard,
} from '@/components';
import { isValidEmail } from '@/services';
import { useAuth } from '@/state';
import { useTheme } from '@/theme';
import {
  BANKING_PURPOSES,
  DISPLAY_MODE_LABELS,
  GUIDANCE_LABELS,
  LANGUAGE_LABELS,
  type AuthError,
  type BankingPurpose,
  type CustomerPreferences,
  type DisplayMode,
  type GuidanceLevel,
  type Language,
} from '@/types';

import { BrandMark } from '../components/BrandMark';

/**
 * Multi-step registration (integration lead).
 *
 * Steps: 1 Basic info → 2 Banking purposes → 3 Experience → 4 Confirm.
 * On confirm it calls authService.register (local-first), which persists the
 * profile + preferences and signs the customer in. Purposes drive the
 * purpose-based home. Nothing is inferred — every choice is explicit.
 */

type Step = 1 | 2 | 3 | 4;

const GUIDANCE_OPTIONS: GuidanceLevel[] = ['quick', 'balanced', 'guided'];
const GUIDANCE_DESC: Record<GuidanceLevel, string> = {
  quick: 'Minimal instructions and direct access.',
  balanced: 'Helpful explanations when needed.',
  guided: 'Detailed, step-by-step guidance.',
};
const DISPLAY_OPTIONS: DisplayMode[] = ['standard', 'largeText', 'highClarity'];
const LANGUAGE_OPTIONS: Language[] = ['en', 'zh'];

export function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { register } = useAuth();

  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 2
  const [purposes, setPurposes] = useState<BankingPurpose[]>([]);

  // Step 3
  const [guidanceLevel, setGuidanceLevel] = useState<GuidanceLevel>('balanced');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('standard');
  const [language, setLanguage] = useState<Language>('en');

  const [formError, setFormError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = 'Enter your full name.';
    if (!isValidEmail(email)) e.email = 'Enter a valid email address.';
    if (password.length < 6) e.password = 'Use at least 6 characters.';
    if (confirm !== password) e.confirm = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function togglePurpose(p: BankingPurpose) {
    setPurposes((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }

  function next() {
    setFormError(undefined);
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && purposes.length === 0) {
      setFormError('Choose at least one purpose so we can personalise your home.');
      return;
    }
    setStep((s) => Math.min(4, (s + 1)) as Step);
  }

  function back() {
    setFormError(undefined);
    if (step === 1) {
      router.back();
      return;
    }
    setStep((s) => Math.max(1, (s - 1)) as Step);
  }

  async function finish() {
    setFormError(undefined);
    setBusy(true);
    const preferences: CustomerPreferences = {
      language,
      guidanceLevel,
      displayMode,
      bankingPurposes: purposes,
      priorities: [],
      voiceEnabled: false,
      visualTheme: 'classic',
    };
    try {
      await register({ fullName: fullName.trim(), email: email.trim(), password, preferences });
      router.replace('/home');
    } catch (err) {
      const auth = err as AuthError;
      setFormError(auth?.message ?? 'We could not create your account. Please try again.');
      // If the email is taken, send the user back to step 1 to fix it.
      if (auth?.code === 'email_taken') setStep(1);
    } finally {
      setBusy(false);
    }
  }

  const footer = (
    <View style={{ gap: theme.spacing.sm }}>
      {step < 4 ? (
        <AppButton label="Continue" onPress={next} />
      ) : (
        <AppButton label="Continue to FlexBank" loading={busy} onPress={finish} />
      )}
      <AppButton label={step === 1 ? 'Back to login' : 'Back'} variant="ghost" onPress={back} />
    </View>
  );

  return (
    <ScreenContainer scroll footer={footer}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ gap: theme.spacing.lg, marginTop: theme.spacing.md }}>
          <BrandMark />
          <StepIndicator step={step} />

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

          {step === 1 ? (
            <StepBasicInfo
              fullName={fullName}
              email={email}
              password={password}
              confirm={confirm}
              showPassword={showPassword}
              errors={errors}
              onName={setFullName}
              onEmail={setEmail}
              onPassword={setPassword}
              onConfirm={setConfirm}
              onToggleShow={() => setShowPassword((s) => !s)}
              clearError={(k) => setErrors((e) => ({ ...e, [k]: '' }))}
            />
          ) : null}

          {step === 2 ? (
            <StepPurposes purposes={purposes} onToggle={togglePurpose} />
          ) : null}

          {step === 3 ? (
            <StepExperience
              guidanceLevel={guidanceLevel}
              displayMode={displayMode}
              language={language}
              onGuidance={setGuidanceLevel}
              onDisplay={setDisplayMode}
              onLanguage={setLanguage}
            />
          ) : null}

          {step === 4 ? (
            <StepConfirm
              fullName={fullName}
              purposes={purposes}
              guidanceLevel={guidanceLevel}
              displayMode={displayMode}
              language={language}
              onEdit={() => setStep(2)}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

/* ------------------------------ Step indicator ------------------------------ */

function StepIndicator({ step }: { step: Step }) {
  const theme = useTheme();
  const titles = ['Your details', 'Your purposes', 'Your experience', 'Confirm'];
  return (
    <View style={{ gap: theme.spacing.xs }}>
      <AppText role="caption" color="textSecondary">
        Step {step} of 4
      </AppText>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {[1, 2, 3, 4].map((n) => (
          <View
            key={n}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              backgroundColor: n <= step ? theme.colors.primary : theme.colors.surfaceMuted,
            }}
          />
        ))}
      </View>
      <AppText role="heading">{titles[step - 1]}</AppText>
    </View>
  );
}

/* --------------------------------- Step 1 ---------------------------------- */

function StepBasicInfo(props: {
  fullName: string;
  email: string;
  password: string;
  confirm: string;
  showPassword: boolean;
  errors: Record<string, string>;
  onName: (v: string) => void;
  onEmail: (v: string) => void;
  onPassword: (v: string) => void;
  onConfirm: (v: string) => void;
  onToggleShow: () => void;
  clearError: (k: string) => void;
}) {
  const theme = useTheme();
  return (
    <AppCard>
      <View style={{ gap: theme.spacing.md }}>
        <AppInput
          label="Full name"
          placeholder="Your name"
          value={props.fullName}
          onChangeText={(t) => {
            props.onName(t);
            props.clearError('fullName');
          }}
          error={props.errors.fullName || undefined}
        />
        <AppInput
          label="Email"
          placeholder="you@example.com"
          autoCapitalize="none"
          keyboardType="email-address"
          value={props.email}
          onChangeText={(t) => {
            props.onEmail(t);
            props.clearError('email');
          }}
          error={props.errors.email || undefined}
        />
        <AppInput
          label="Password"
          placeholder="At least 6 characters"
          autoCapitalize="none"
          secureTextEntry={!props.showPassword}
          value={props.password}
          onChangeText={(t) => {
            props.onPassword(t);
            props.clearError('password');
          }}
          error={props.errors.password || undefined}
          rightAccessory={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={props.showPassword ? 'Hide password' : 'Show password'}
              onPress={props.onToggleShow}
              hitSlop={10}
            >
              <Icon name={props.showPassword ? 'eyeOff' : 'eye'} size={20} color={theme.colors.textSecondary} />
            </Pressable>
          }
        />
        <AppInput
          label="Confirm password"
          placeholder="Re-enter your password"
          autoCapitalize="none"
          secureTextEntry={!props.showPassword}
          value={props.confirm}
          onChangeText={(t) => {
            props.onConfirm(t);
            props.clearError('confirm');
          }}
          error={props.errors.confirm || undefined}
        />
      </View>
    </AppCard>
  );
}

/* --------------------------------- Step 2 ---------------------------------- */

function StepPurposes({
  purposes,
  onToggle,
}: {
  purposes: BankingPurpose[];
  onToggle: (p: BankingPurpose) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText role="subheading">What do you mainly use banking for?</AppText>
      <AppText role="body" color="textSecondary">
        Tell us what matters most to you. We&apos;ll personalise your banking
        experience around your financial goals. You can change this anytime.
      </AppText>
      <View style={{ gap: theme.spacing.sm, marginTop: theme.spacing.xs }}>
        {BANKING_PURPOSES.map((p) => (
          <SelectableCard
            key={p.key}
            control="checkbox"
            title={p.label}
            description={p.description}
            selected={purposes.includes(p.key)}
            onPress={() => onToggle(p.key)}
            leading={
              <Icon
                name={p.icon as IconName}
                size={20}
                color={theme.colors.primary}
                circle
                circleColor={theme.colors.accentSoft}
                circleSize={44}
              />
            }
          />
        ))}
      </View>
    </View>
  );
}

/* --------------------------------- Step 3 ---------------------------------- */

function StepExperience(props: {
  guidanceLevel: GuidanceLevel;
  displayMode: DisplayMode;
  language: Language;
  onGuidance: (g: GuidanceLevel) => void;
  onDisplay: (d: DisplayMode) => void;
  onLanguage: (l: Language) => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.lg }}>
      <AppText role="subheading">How would you like FlexBank to assist you?</AppText>

      <Group title="Guidance">
        {GUIDANCE_OPTIONS.map((g) => (
          <SelectableCard
            key={g}
            title={GUIDANCE_LABELS[g]}
            description={GUIDANCE_DESC[g]}
            selected={props.guidanceLevel === g}
            onPress={() => props.onGuidance(g)}
          />
        ))}
      </Group>

      <Group title="Display">
        {DISPLAY_OPTIONS.map((d) => (
          <SelectableCard
            key={d}
            title={DISPLAY_MODE_LABELS[d]}
            selected={props.displayMode === d}
            onPress={() => props.onDisplay(d)}
          />
        ))}
      </Group>

      <Group title="Language">
        {LANGUAGE_OPTIONS.map((l) => (
          <SelectableCard
            key={l}
            title={LANGUAGE_LABELS[l]}
            selected={props.language === l}
            onPress={() => props.onLanguage(l)}
          />
        ))}
      </Group>
    </View>
  );
}

/* --------------------------------- Step 4 ---------------------------------- */

function StepConfirm(props: {
  fullName: string;
  purposes: BankingPurpose[];
  guidanceLevel: GuidanceLevel;
  displayMode: DisplayMode;
  language: Language;
  onEdit: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.md }}>
      <AppText role="subheading">Your FlexBank experience is ready!</AppText>

      <AppCard>
        <View style={{ gap: theme.spacing.sm }}>
          <Row label="Name" value={props.fullName || '—'} />
          <Divider />
          <View style={{ gap: theme.spacing.xs }}>
            <AppText role="label" color="textSecondary">
              Selected purposes
            </AppText>
            {props.purposes.map((p) => {
              const meta = BANKING_PURPOSES.find((x) => x.key === p)!;
              return (
                <View key={p} style={{ flexDirection: 'row', gap: theme.spacing.xs, alignItems: 'center' }}>
                  <Icon name="check" size={14} color={theme.colors.success} />
                  <AppText role="body">{meta.label}</AppText>
                </View>
              );
            })}
          </View>
          <Divider />
          <Row label="Guidance" value={GUIDANCE_LABELS[props.guidanceLevel]} />
          <Row label="Display" value={DISPLAY_MODE_LABELS[props.displayMode]} />
          <Row label="Language" value={LANGUAGE_LABELS[props.language]} />
        </View>
      </AppCard>

      <AppButton label="Edit preferences" variant="secondary" onPress={props.onEdit} />

      <AppText role="caption" color="textMuted">
        You stay in control. These choices personalise how FlexBank looks and
        guides you — they never change your banking permissions. Synthetic demo
        data only.
      </AppText>
    </View>
  );
}

/* --------------------------------- helpers --------------------------------- */

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText role="label" color="textSecondary">
        {title}
      </AppText>
      <View style={{ gap: theme.spacing.sm }}>{children}</View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md }}>
      <AppText role="body" color="textSecondary">
        {label}
      </AppText>
      <AppText role="bodyStrong" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}
