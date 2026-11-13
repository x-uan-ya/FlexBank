import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppButton, AppCard, AppText, Header, ScreenContainer, SelectableCard } from '@/components';
import { useAppDispatch, usePreferences } from '@/state';
import { useTheme } from '@/theme';
import { BANKING_PURPOSES, BANKING_PURPOSE_LABELS, type BankingPurpose } from '@/types/preferences';

/** Edit banking purposes after registration. Explicit choices only, never inferred. */
export function PurposesScreen() {
  const theme = useTheme();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const prefs = usePreferences();
  const [message, setMessage] = useState('');
  const chosen = prefs.bankingPurposes ?? [];

  function toggle(purpose: BankingPurpose) {
    const selected = chosen.includes(purpose);
    if (selected && chosen.length === 1) {
      setMessage('Keep at least one purpose. Choose another before removing this one.');
      return;
    }
    const next = selected ? chosen.filter((p) => p !== purpose) : [...chosen, purpose];
    dispatch({ type: 'SET_BANKING_PURPOSES', payload: next });
    setMessage(`${BANKING_PURPOSE_LABELS[purpose]} ${selected ? 'removed' : 'added'}.`);
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  return (
    <ScreenContainer scroll>
      <Header title="My banking purposes" subtitle="What do you mainly use banking for?" onBack={goBack} />
      <AppText color="textSecondary">
        We show content for your first few purposes near the top of Home. The first one you chose is shown first. To change the order, remove a purpose and add it again. Nothing is ever hidden or locked.
      </AppText>
      <View style={{ gap: theme.spacing.sm }}>
        {BANKING_PURPOSES.map((p) => (
          <SelectableCard
            key={p.key}
            control="checkbox"
            title={p.label}
            description={p.description}
            selected={chosen.includes(p.key)}
            onPress={() => toggle(p.key)}
          />
        ))}
      </View>
      <View accessibilityLiveRegion="polite">
        {message ? (
          <AppCard elevation="none">
            <AppText role="caption" color="textSecondary">{message}</AppText>
          </AppCard>
        ) : null}
      </View>
      <AppButton label="Done" onPress={() => router.replace('/home')} />
    </ScreenContainer>
  );
}