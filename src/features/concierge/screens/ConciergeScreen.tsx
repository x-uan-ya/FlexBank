import { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { AppButton, AppCard, AppText, LoadingState } from '@/components';
import { BankingScreen } from '@/components/BankingScreen';
import { useTheme } from '@/theme';
import { bankingReturnRoute } from '@/utils/bankingNavigation';
import { concierge } from '../concierge';
import { ConciergeChat } from '../components/ConciergeChat';

/** Prepared demo explanations; the existing service contract stays read-only. */
export function ConciergeScreen() {
  const theme = useTheme();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function explainReview() {
    setLoading(true);
    setError(undefined);
    try {
      const result = await concierge.explain('paynow-review');
      setAnswer(result.text);
      setUsedFallback(result.usedFallback);
    } catch {
      setError('We could not load this explanation. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return <BankingScreen title="Banking Concierge" subtitle="A little help, in plain language." backTo={bankingReturnRoute(returnTo)}>
    <AppCard elevation="none">
      <View style={{ gap: theme.spacing.sm }}>
        <AppText role="subheading">Understand your transfer review</AppText>
        <AppText color="textSecondary">Get a simple explanation of what to check. You stay in control of every banking action.</AppText>
        <AppText role="caption" color="textSecondary">This demo uses prepared explanations. Live AI is not connected.</AppText>
      </View>
    </AppCard>
    <AppButton label="Explain the review screen" onPress={explainReview} loading={loading}
      accessibilityHint="Explains Review without changing or confirming your transfer" />
    {loading ? <LoadingState message="Preparing an explanation…" /> : null}
    {error ? <AppText color="danger" accessibilityRole="alert">{error}</AppText> : null}
    {answer && !loading ? <AppCard>
      <View accessibilityLiveRegion="polite" style={{ gap: theme.spacing.sm }}>
        <AppText role="subheading" accessibilityRole="header">Your explanation</AppText>
        <AppText>{answer}</AppText>
        {usedFallback ? <AppText role="caption" color="textSecondary">Prepared demo explanation.</AppText> : null}
      </View>
    </AppCard> : null}

    {/* Multi-turn banking Q&A. Live AI when the proxy is configured; otherwise
        a deterministic offline responder. Never moves money. */}
    <ConciergeChat />

    <AppText role="caption" color="textSecondary">Concierge does not change recipients, amounts or review requirements, and never confirms a transfer.</AppText>
  </BankingScreen>;
}
