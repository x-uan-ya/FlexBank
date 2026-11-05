/**
 * Embeddable contextual help for a single transfer step.
 * Opens inside the current screen so recipient/amount stay on screen.
 * Never mutates transfer state or confirms a payment.
 */

import { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppText,
  LoadingState,
} from '@/components';
import { usePreferences } from '@/state';
import { useTheme } from '@/theme';
import type { Language } from '@/types/preferences';

import { concierge } from '../concierge';

export interface ConciergeHelpPanelProps {
  /** Known context key, e.g. 'paynow-review'. */
  context: string;
  /** Short heading shown above the answer. */
  title?: string;
  /** Optional close control for inline use. */
  onClose?: () => void;
}

export function ConciergeHelpPanel({
  context,
  title = 'Help for this step',
  onClose,
}: ConciergeHelpPanelProps) {
  const theme = useTheme();
  const preferences = usePreferences();

  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState<string | null>(null);
  const [englishAnswer, setEnglishAnswer] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(true);
  const [displayLanguage, setDisplayLanguage] = useState<Language>('en');
  const [error, setError] = useState<string | null>(null);

  const loadExplanation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await concierge.explain(context);
      setAnswer(response.text);
      setEnglishAnswer(response.text);
      setUsedFallback(response.usedFallback);
      setDisplayLanguage('en');
    } catch {
      setError(
        'Help is temporarily unavailable. You can continue checking your transfer details. This help never sends money.',
      );
      setAnswer(null);
      setEnglishAnswer(null);
      setUsedFallback(true);
    } finally {
      setLoading(false);
    }
  }, [context]);

  useEffect(() => {
    void loadExplanation();
  }, [loadExplanation]);

  async function handleSimplify() {
    if (loading || !englishAnswer) return;
    setLoading(true);
    setError(null);

    try {
      const response = await concierge.simplify(englishAnswer);
      setAnswer(response.text);
      setEnglishAnswer(response.text);
      setUsedFallback(response.usedFallback);
      setDisplayLanguage('en');
    } catch {
      setError('Could not simplify right now. The previous explanation is still shown.');
    } finally {
      setLoading(false);
    }
  }

  async function handleTranslateZh() {
    if (loading || !englishAnswer) return;
    setLoading(true);
    setError(null);

    try {
      const response = await concierge.translate(englishAnswer, 'zh');
      setAnswer(response.text);
      setUsedFallback(response.usedFallback);
      setDisplayLanguage('zh');
    } catch {
      setError('Could not translate right now. The English explanation is still available.');
    } finally {
      setLoading(false);
    }
  }

  function handleReadEnglish() {
    if (!englishAnswer) return;
    setAnswer(englishAnswer);
    setDisplayLanguage('en');
  }

  // Preferred non-English language from settings (only zh is prepared offline).
  const preferredAlt: Language =
    preferences.language !== 'en' ? preferences.language : 'zh';

  return (
    <AppCard>
      <View style={{ gap: theme.spacing.sm }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: theme.spacing.sm,
          }}
        >
          <AppText role="subheading">{title}</AppText>
          {onClose ? (
            <AppButton label="Close help" variant="ghost" onPress={onClose} />
          ) : null}
        </View>

        <AppText role="caption" color="textSecondary">
          This help does not change your recipient, amount, or send money.
        </AppText>

        {loading ? <LoadingState message="Preparing an explanation…" /> : null}

        {error ? (
          <AppText role="body" color="textSecondary">
            {error}
          </AppText>
        ) : null}

        {answer !== null && !loading ? (
          <View style={{ gap: theme.spacing.sm }}>
            <AppText role="body">{answer}</AppText>

            <View style={{ gap: theme.spacing.xs }}>
              <AppButton
                label="Simplify"
                variant="secondary"
                onPress={() => {
                  void handleSimplify();
                }}
              />

              {displayLanguage !== 'zh' && preferredAlt === 'zh' ? (
                <AppButton
                  label="用中文阅读"
                  onPress={() => {
                    void handleTranslateZh();
                  }}
                />
              ) : null}

              {displayLanguage === 'zh' || displayLanguage !== 'en' ? (
                <AppButton
                  label="Read in English"
                  variant="ghost"
                  onPress={handleReadEnglish}
                />
              ) : null}
            </View>

            <AppText role="caption" color="textMuted">
              {usedFallback
                ? 'Prepared explanation · No AI used'
                : 'AI-assisted explanation'}
            </AppText>
          </View>
        ) : null}
      </View>
    </AppCard>
  );
}
