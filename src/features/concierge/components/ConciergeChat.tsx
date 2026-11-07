/**
 * Multi-turn banking chat with the Concierge.
 *
 * Holds the conversation in local state and calls `concierge.chat()`, which
 * uses live AI when the backend proxy is configured and a deterministic offline
 * responder otherwise. It NEVER moves money, never asks for credentials, and
 * does not touch PayNow / Checkpoint / Human Assistance.
 */

import { useCallback, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';

import { AppButton, AppCard, AppInput, AppText, LoadingState } from '@/components';
import { usePreferences } from '@/state';
import { useTheme } from '@/theme';

import { chat, type ChatMessage, type ConciergeGuidance } from '../concierge';

const SUGGESTIONS = [
  'What is a fixed deposit?',
  'How does PayNow work?',
  'Explain bond coupons',
];

interface Turn extends ChatMessage {
  /** True when this model turn came from the offline responder. */
  usedFallback?: boolean;
}

export function ConciergeChat() {
  const theme = useTheme();
  const preferences = usePreferences();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const guidanceLevel = preferences.guidanceLevel as ConciergeGuidance;

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || loading) return;

      // History sent to the model = turns so far (before this question).
      const history: ChatMessage[] = turns.map((t) => ({ role: t.role, text: t.text }));

      setTurns((prev) => [...prev, { role: 'user', text: trimmed }]);
      setInput('');
      setLoading(true);
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

      try {
        const response = await chat(trimmed, history, {
          language: preferences.language,
          guidanceLevel,
        });
        setTurns((prev) => [
          ...prev,
          { role: 'model', text: response.text, usedFallback: response.usedFallback },
        ]);
      } catch {
        setTurns((prev) => [
          ...prev,
          {
            role: 'model',
            text: 'Sorry, I could not answer just now. Please try again, or use in-app help.',
            usedFallback: true,
          },
        ]);
      } finally {
        setLoading(false);
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
      }
    },
    [turns, loading, preferences.language, guidanceLevel],
  );

  return (
    <AppCard>
      <View style={{ gap: theme.spacing.sm }}>
        <AppText role="subheading">Ask the Concierge</AppText>
        <AppText role="caption" color="textSecondary">
          Ask about banking topics like savings, fixed deposits, bonds, interest
          or PayNow. The Concierge explains only — it never moves money and never
          asks for passwords or OTPs.
        </AppText>

        {/* Conversation */}
        {turns.length > 0 ? (
          <ScrollView
            ref={scrollRef}
            style={{ maxHeight: 320 }}
            contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.xs }}
            keyboardShouldPersistTaps="handled"
          >
            {turns.map((turn, index) => (
              <Bubble key={index} turn={turn} />
            ))}
            {loading ? <LoadingState message="Thinking…" /> : null}
          </ScrollView>
        ) : (
          <View style={{ gap: theme.spacing.xs }}>
            <AppText role="caption" color="textMuted">
              Try:
            </AppText>
            {SUGGESTIONS.map((s) => (
              <AppButton
                key={s}
                label={s}
                variant="secondary"
                onPress={() => {
                  void send(s);
                }}
              />
            ))}
          </View>
        )}

        {/* Composer */}
        <AppInput
          label="Your question"
          placeholder="e.g. What is maturity?"
          value={input}
          onChangeText={setInput}
          multiline
          returnKeyType="send"
          onSubmitEditing={() => {
            void send(input);
          }}
          editable={!loading}
        />
        <AppButton
          label="Send"
          onPress={() => {
            void send(input);
          }}
          loading={loading}
          disabled={input.trim().length === 0}
          accessibilityHint="Sends your banking question to the Concierge"
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
      {!isUser ? (
        <AppText
          role="caption"
          style={{ color: theme.colors.textMuted }}
        >
          {turn.usedFallback ? 'Prepared answer · No AI used' : 'AI-assisted'}
        </AppText>
      ) : null}
    </View>
  );
}
