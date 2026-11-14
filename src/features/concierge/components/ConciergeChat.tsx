/** Existing Concierge chat enhanced with local, read-only financial context. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { AppButton, AppCard, AppInput, AppText, LoadingState } from '@/components';
import { useFinancialInsightsData } from '@/features/financial-context/useFinancialInsightsData';
import { useAuthState, usePreferences } from '@/state';
import { useTheme } from '@/theme';

import {
  chatWithFinancialContext,
  type ChatMessage,
  type ConciergeAnswerSource,
  type ConciergeGuidance,
} from '../concierge';
import {
  historyForGeneralProvider,
  isResponseForCurrentUser,
  redactFinancialFigures,
  redactTurnsForPrivacy,
  removeContextualTurns,
} from '../contextualFinance';

const GENERAL_SUGGESTIONS = [
  'What is a fixed deposit?',
  'How does PayNow work?',
  'Explain bond coupons',
];

const CONTEXT_SUGGESTIONS = [
  'Summarise my spending',
  'How is my savings goal progressing?',
  'When does the demo investment mature?',
];

interface Turn extends ChatMessage {
  source?: ConciergeAnswerSource;
  /** Excluded from any later remote request, including the paired user ask. */
  containsFinancialContext?: boolean;
}

export interface ConciergeChatProps {
  /** Opaque route parameter only; records are resolved again for this user. */
  selectedInsightId?: string | null;
}

export function ConciergeChat({ selectedInsightId = null }: ConciergeChatProps) {
  const theme = useTheme();
  const preferences = usePreferences();
  const { status, user } = useAuthState();
  const userId = status === 'signedIn' ? user?.id ?? null : null;
  const financialData = useFinancialInsightsData(userId);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  // No shared balance-privacy state exists yet, so Concierge defaults safely.
  const [balanceHidden, setBalanceHidden] = useState(true);
  const [allowRemoteAi, setAllowRemoteAi] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const hasFocused = useRef(false);
  const currentUserId = useRef(userId);
  currentUserId.current = userId;

  const guidanceLevel = preferences.guidanceLevel as ConciergeGuidance;

  useFocusEffect(useCallback(() => {
    if (hasFocused.current) financialData.retry();
    else hasFocused.current = true;
  }, [financialData.retry]));

  // A chat may outlive an auth session. Clear the transcript and restore
  // hidden amounts before the next user can see or announce anything.
  useEffect(() => {
    setTurns([]);
    setInput('');
    setBalanceHidden(true);
    setAllowRemoteAi(false);
    setLoading(false);
  }, [userId]);

  const send = useCallback(
    async (question: string, insightId?: string | null) => {
      const trimmed = question.trim();
      if (!trimmed || loading) return;

      // Once local financial context appears, no earlier turns are sent to the
      // optional proxy. This prevents amounts or record-derived explanations
      // from leaking through model history on a later general question.
      const hasContextualHistory = turns.some((turn) => turn.containsFinancialContext);
      const history: ChatMessage[] = historyForGeneralProvider(turns);

      const displayedQuestion = balanceHidden ? redactFinancialFigures(trimmed) : trimmed;
      setTurns((prev) => [...prev, { role: 'user', text: displayedQuestion }]);
      setInput('');
      setLoading(true);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

      const requestUserId = userId;
      try {
        const response = await chatWithFinancialContext(trimmed, history, {
          language: preferences.language,
          guidanceLevel,
          bankingPurposes: preferences.bankingPurposes,
          financialContext: userId ? financialData.context : null,
          balanceHidden,
          selectedInsightId: insightId,
          allowRemoteAi,
          conversationContainsFinancialContext: hasContextualHistory,
        });
        if (!isResponseForCurrentUser(requestUserId, currentUserId.current)) return;
        const contextual = response.source === 'prepared-financial-context';
        setTurns((prev) => {
          const withSafeUserTurn = contextual
            ? prev.map((turn, index) => index === prev.length - 1
              ? { ...turn, containsFinancialContext: true }
              : turn)
            : prev;
          return [
            ...withSafeUserTurn,
            {
              role: 'model',
              text: response.text,
              source: response.source,
              containsFinancialContext: contextual,
            },
          ];
        });
      } catch {
        if (!isResponseForCurrentUser(requestUserId, currentUserId.current)) return;
        setTurns((prev) => [
          ...prev,
          {
            role: 'model',
            text: 'Sorry, I could not answer just now. Please try again, or use in-app help.',
            source: 'prepared-general',
          },
        ]);
      } finally {
        setLoading(false);
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
      }
    },
    [
      turns,
      loading,
      preferences.language,
      preferences.bankingPurposes,
      guidanceLevel,
      userId,
      financialData.context,
      balanceHidden,
      allowRemoteAi,
    ],
  );

  return (
    <AppCard>
      <View style={{ gap: theme.spacing.sm }}>
        <AppText role="subheading">Ask the Concierge</AppText>
        <AppText role="caption" color="textSecondary">
          Personal financial explanations are calculated locally from authorised demo context and are never sent to the optional AI proxy. The Concierge is read-only.
        </AppText>

        <View style={{ gap: theme.spacing.xs }}>
          <AppText role="caption" color="textMuted">
            Live AI is optional. If enabled, only a standalone, general banking-education question can be sent; personal wording, numbers, financial context and chat history always stay local.
          </AppText>
          <AppButton
            label={allowRemoteAi ? 'Disable live AI for general questions' : 'Allow live AI for general questions'}
            variant="ghost"
            fullWidth={false}
            disabled={loading}
            accessibilityState={{ checked: allowRemoteAi }}
            accessibilityHint="Explicitly controls optional remote AI for eligible standalone general education questions"
            onPress={() => setAllowRemoteAi((allowed) => !allowed)}
          />
        </View>

        {userId ? (
          <View style={{ gap: theme.spacing.xs }}>
            <AppText role="caption" color="textMuted">
              Spending and investment examples are synthetic demo data. Saved Plan goals are loaded only for this signed-in demo user; unowned pockets and investments are excluded.
            </AppText>
            <AppButton
              label={balanceHidden ? 'Show amounts in Concierge replies' : 'Hide amounts in Concierge replies'}
              variant="ghost"
              fullWidth={false}
              disabled={loading}
              accessibilityState={{ checked: !balanceHidden }}
              accessibilityHint="Controls whether amount-bearing financial insights can appear in this chat"
              onPress={() => {
                if (!balanceHidden) {
                  // Previously revealed amounts must not remain in visible or
                  // screen-reader history after privacy is turned back on.
                  setTurns((current) => redactTurnsForPrivacy(removeContextualTurns(current)));
                }
                setBalanceHidden((hidden) => !hidden);
              }}
            />
            {financialData.loading ? <LoadingState message="Loading authorised demo context…" /> : null}
            {financialData.error ? (
              <View accessibilityRole="alert" style={{ gap: theme.spacing.xs }}>
                <AppText role="caption" color="danger">{financialData.error}</AppText>
                <AppButton label="Retry financial context" variant="ghost" fullWidth={false} onPress={financialData.retry} />
              </View>
            ) : null}
          </View>
        ) : (
          <AppText role="caption" color="textMuted">
            Sign in to ask about saved demo goals. General banking help remains available.
          </AppText>
        )}

        {turns.length > 0 ? (
          <ScrollView
            ref={scrollRef}
            style={{ maxHeight: 360 }}
            contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.xs }}
            keyboardShouldPersistTaps="handled"
          >
            {turns.map((turn, index) => <Bubble key={index} turn={turn} />)}
            {loading ? <LoadingState message="Preparing an answer…" /> : null}
          </ScrollView>
        ) : (
          <View style={{ gap: theme.spacing.xs }}>
            <AppText role="caption" color="textMuted">Try:</AppText>
            {userId ? CONTEXT_SUGGESTIONS.map((suggestion) => (
              <AppButton key={suggestion} label={suggestion} variant="secondary" onPress={() => { void send(suggestion); }} />
            )) : null}
            {selectedInsightId && userId ? (
              <AppButton
                label="Explain the selected insight"
                variant="secondary"
                accessibilityHint="Resolves the insight identifier against this signed-in user's current authorised context"
                onPress={() => { void send('Explain the selected financial insight', selectedInsightId); }}
              />
            ) : null}
            {GENERAL_SUGGESTIONS.map((suggestion) => (
              <AppButton key={suggestion} label={suggestion} variant="secondary" onPress={() => { void send(suggestion); }} />
            ))}
          </View>
        )}

        <AppInput
          label="Your question"
          placeholder="e.g. How is my savings goal progressing?"
          value={input}
          onChangeText={setInput}
          multiline
          returnKeyType="send"
          onSubmitEditing={() => { void send(input); }}
          editable={!loading}
        />
        <AppButton
          label="Send"
          onPress={() => { void send(input); }}
          loading={loading}
          disabled={input.trim().length === 0}
          accessibilityHint="Sends a banking question; personal demo context is answered locally"
        />
      </View>
    </AppCard>
  );
}

function Bubble({ turn }: { turn: Turn }) {
  const theme = useTheme();
  const isUser = turn.role === 'user';
  return (
    <View
      accessibilityLabel={isUser ? `Your question: ${turn.text}` : `${sourceLabel(turn.source)}: ${turn.text}`}
      style={{
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        maxWidth: '92%',
        backgroundColor: isUser ? theme.colors.primary : theme.colors.surfaceMuted,
        borderRadius: theme.radius.lg,
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        gap: 4,
      }}
    >
      <AppText style={{ color: isUser ? theme.colors.onPrimary : theme.colors.textPrimary }}>
        {turn.text}
      </AppText>
      {!isUser ? <AppText role="caption" style={{ color: theme.colors.textMuted }}>{sourceLabel(turn.source)}</AppText> : null}
    </View>
  );
}

function sourceLabel(source: ConciergeAnswerSource | undefined): string {
  if (source === 'prepared-financial-context') return 'Prepared locally from demo financial context · No AI used';
  if (source === 'live-ai') return 'Live AI-assisted general answer';
  return 'Prepared general answer · No AI used';
}
