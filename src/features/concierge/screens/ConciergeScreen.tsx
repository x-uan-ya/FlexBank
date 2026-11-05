import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

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
import type { Language } from '@/types/preferences';

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
  const params = useLocalSearchParams<{ context?: string }>();

  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [englishAnswer, setEnglishAnswer] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [usedFallback, setUsedFallback] = useState(false);
  const [displayLanguage, setDisplayLanguage] = useState<Language>('en');

  // Auto-load when opened with a context query (e.g. /concierge?context=paynow-review).
  useEffect(() => {
    const initial = params.context;
    if (typeof initial === 'string' && initial.length > 0) {
      const topic = HELP_TOPICS.find((t) => t.context === initial);
      void explainTopic(initial, topic?.label ?? 'Help for this step');
    }
    // Only on first mount / param change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.context]);

  async function explainTopic(context: string, label: string) {
    if (loading) return;

    setLoading(true);
    setQuestion(label);
    setAnswer(null);
    setEnglishAnswer(null);
    setDisplayLanguage('en');

    try {
      const response = await concierge.explain(context);
      setAnswer(response.text);
      setEnglishAnswer(response.text);
      setUsedFallback(response.usedFallback);
    } catch {
      setAnswer(
        'Help is temporarily unavailable. You can go back and check your transfer details. If you are unsure, pause before confirming.',
      );
      setEnglishAnswer(null);
      setUsedFallback(true);
    } finally {
      setLoading(false);
    }
  }

  async function simplifyAnswer() {
    if (loading || englishAnswer === null) return;

    setLoading(true);

    try {
      const response = await concierge.simplify(englishAnswer);
      setAnswer(response.text);
      setEnglishAnswer(response.text);
      setUsedFallback(response.usedFallback);
      setDisplayLanguage('en');
    } catch {
      setAnswer(
        'Could not simplify right now. You can still use the explanation above or go back to your transfer.',
      );
      setUsedFallback(true);
    } finally {
      setLoading(false);
    }
  }

  async function translateToZh() {
    if (loading || englishAnswer === null) return;

    setLoading(true);

    try {
      const response = await concierge.translate(englishAnswer, 'zh');
      setAnswer(response.text);
      setUsedFallback(response.usedFallback);
      setDisplayLanguage('zh');
    } catch {
      setAnswer(
        'Could not translate right now. The English explanation is still available.',
      );
      setUsedFallback(true);
    } finally {
      setLoading(false);
    }
  }

  function readInEnglish() {
    if (englishAnswer === null) return;
    setAnswer(englishAnswer);
    setDisplayLanguage('en');
  }

  // Only offer prepared Mandarin offline; do not imply Malay/Tamil work.
  const showZhButton = displayLanguage !== 'zh';

  return (
    <ScreenContainer>
      <Header
        title="Help"
        subtitle="Help at your pace"
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      <AppCard>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="subheading">What would you like help with?</AppText>

          <AppText role="body" color="textSecondary">
            Choose a question below for a simple explanation. This help does not
            change your transfer details or send money.
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

      {loading ? <LoadingState message="Preparing an explanation…" /> : null}

      {answer !== null && !loading ? (
        <AppCard>
          <View style={{ gap: theme.spacing.sm }}>
            <AppText role="subheading">{question}</AppText>

            <AppText role="body">{answer}</AppText>

            {englishAnswer !== null ? (
              <View style={{ gap: theme.spacing.sm }}>
                <AppButton
                  label="Simplify"
                  variant="secondary"
                  onPress={() => {
                    void simplifyAnswer();
                  }}
                />

                {showZhButton ? (
                  <AppButton
                    label="用中文阅读"
                    onPress={() => {
                      void translateToZh();
                    }}
                  />
                ) : null}

                {displayLanguage !== 'en' ? (
                  <AppButton
                    label="Read in English"
                    variant="ghost"
                    onPress={readInEnglish}
                  />
                ) : null}
              </View>
            ) : null}

            <AppText role="caption" color="textMuted">
              {usedFallback
                ? 'Prepared explanation · No AI used'
                : 'AI-assisted explanation'}
            </AppText>

            {preferences.language !== 'en' && preferences.language !== 'zh' ? (
              <AppText role="caption" color="textMuted">
                Prepared translations are available in English and Mandarin.
                Other languages need the optional live AI setup.
              </AppText>
            ) : null}
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
