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
import { useTheme } from '@/theme';

import { concierge } from '../concierge';

/**
 * AI Banking Concierge placeholder (Developer C).
 *
 * Works today using the DETERMINISTIC FALLBACK (no AI wired in). This proves the
 * integration point: the screen calls the `ConciergeContract` and shows whether
 * the response came from the fallback. Dev C swaps in a real provider behind the
 * same contract and keeps the fallback path.
 */
export function ConciergeScreen() {
  const theme = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  async function explainReview() {
    setLoading(true);
    const res = await concierge.explain('paynow-review');
    setAnswer(res.text);
    setUsedFallback(res.usedFallback);
    setLoading(false);
  }

  return (
    <ScreenContainer>
      <Header
        title="Banking Concierge"
        subtitle="Plain-language help"
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
              Developer C — Concierge
            </AppText>
          </View>
          <AppText role="body" color="textSecondary">
            This screen is a starting point. It uses a deterministic fallback so
            the app works without AI. Wire a real provider behind the same
            contract: concierge.explain / simplify / translate.
          </AppText>
          <AppText role="mono" color="textMuted">
            {'// TODO: CONCIERGE FEATURE'}
          </AppText>
        </View>
      </AppCard>

      <AppButton label="Explain the review screen" onPress={explainReview} />

      {loading ? <LoadingState message="Preparing an explanation…" /> : null}

      {answer && !loading ? (
        <AppCard>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText role="subheading">Explanation</AppText>
            <AppText role="body">{answer}</AppText>
            {usedFallback ? (
              <AppText role="caption" color="textMuted">
                Offline explanation (no AI used).
              </AppText>
            ) : null}
          </View>
        </AppCard>
      ) : null}
    </ScreenContainer>
  );
}
