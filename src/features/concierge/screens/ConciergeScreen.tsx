import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppText,
  Header,
  LoadingState,
  ScreenContainer,
} from '@/components';
import { usePreferences } from '@/state';
import { useTheme } from '@/theme';
import { LANGUAGE_LABELS, type Language } from '@/types/preferences';

import { concierge } from '../concierge';

const HELP_TOPICS = [
  {
    context: 'paynow-recipient',
    label: 'Who am I sending money to?',
  },
  {
    context: 'paynow-amount',
    label: 'What amount should I enter?',
  },
  {
    context: 'paynow-review',
    label: 'What should I check before confirming?',
  },
  {
    context: 'paynow-proxy',
    label: 'What does “PayNow proxy” mean?',
  },
];

export function ConciergeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const preferences = usePreferences();
  const helpLanguage: Language =
    preferences.language === 'en' ? 'zh' : preferences.language;

  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [originalAnswer, setOriginalAnswer] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [usedFallback, setUsedFallback] = useState(false);
  const [originalUsedFallback, setOriginalUsedFallback] = useState(false);

  async function explainTopic(context: string, label: string) {
    if (loading) return;

    setLoading(true);
    setQuestion(label);
    setAnswer(null);
    setOriginalAnswer(null);

    try {
      const response = await concierge.explain(context);

      setAnswer(response.text);
      setOriginalAnswer(response.text);
      setUsedFallback(response.usedFallback);
      setOriginalUsedFallback(response.usedFallback);
    } catch {
      setAnswer(
        'Help is temporarily unavailable. You can go back and check your transfer details. If you are unsure, pause before confirming.',
      );
      setUsedFallback(true);
    } finally {
      setLoading(false);
    }
  }

  async function translateAnswer() {
    if (loading || originalAnswer === null) return;

    setLoading(true);

    try {
      const response = await concierge.translate(
        originalAnswer,
        helpLanguage,
      );

      setAnswer(response.text);
      setUsedFallback(response.usedFallback);
    } catch {
      setAnswer(
        `${originalAnswer}\n\nTranslation is temporarily unavailable. The original English explanation is shown above.`,
      );
      setUsedFallback(originalUsedFallback);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenContainer>
      <Header
        title="Banking Concierge"
        subtitle="Help at your pace"
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      <AppCard>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="subheading">
            What would you like help with?
          </AppText>

          <AppText role="body" color="textSecondary">
            Choose a question below for a simple explanation.
            This help does not change your transfer details or send money.
          </AppText>
        </View>
      </AppCard>

      <View style={{ gap: theme.spacing.sm }}>
        {HELP_TOPICS.map((topic) => (
          <AppButton
            key={topic.context}
            label={topic.label}
            disabled={loading}
            onPress={() => {
              void explainTopic(topic.context, topic.label);
            }}
          />
        ))}
      </View>

      {loading ? (
        <LoadingState message="Preparing an explanation…" />
      ) : null}

      {answer !== null && !loading ? (
        <AppCard>
          <View style={{ gap: theme.spacing.sm }}>
            <AppText role="subheading">{question}</AppText>

            <AppText role="body">{answer}</AppText>

            {originalAnswer !== null ? (
              <View style={{ gap: theme.spacing.sm }}>
                <AppButton
                  label={
                    helpLanguage === 'zh'
                    ? '用中文阅读'
                    : `Read in ${LANGUAGE_LABELS[helpLanguage]}`
                  }
                  onPress={() => {
                    void translateAnswer();
                  }}
                />

                <AppButton
                  label="Read in English"
                  variant="ghost"
                  onPress={() => {
                    setAnswer(originalAnswer);
                    setUsedFallback(originalUsedFallback);
                  }}
                />
              </View>
            ) : null}

            <AppText role="caption" color="textMuted">
              {usedFallback
                ? 'Prepared explanation · No AI used'
                : 'AI-generated explanation'}
            </AppText>
          </View>
        </AppCard>
      ) : null}

      {router.canGoBack() ? (
        <AppButton
          label="Go back"
          variant="ghost"
          onPress={() => router.back()}
        />
      ) : null}
    </ScreenContainer>
  );
}

