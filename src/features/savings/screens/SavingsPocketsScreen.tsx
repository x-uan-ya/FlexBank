import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';

import {
  AppButton,
  AppCard,
  AppText,
  EmptyState,
  Icon,
  LoadingState,
  ScreenContainer,
} from '@/components';
import { BankingScreen } from '@/components/BankingScreen';
import { useTheme } from '@/theme';
import { formatMoney } from '@/utils';

import { PocketCard } from '../components/PocketCard';
import { pocketProgress, savedAmount } from '../logic';
import { useSavingsPockets } from '../useSavingsPockets';

/**
 * Savings Pockets overview. Lists all pockets with progress, a total-saved
 * summary, and an entry point to create a new pocket. Reuses existing
 * components + theme tokens; works in Classic and Premium themes.
 */
export function SavingsPocketsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { pockets, loading, refresh } = useSavingsPockets();

  // Refresh whenever the screen regains focus (after create/edit/detail).
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (loading) {
    return (
      <ScreenContainer>
        <LoadingState message="Loading your pockets…" />
      </ScreenContainer>
    );
  }

  const totalSaved = pockets.reduce((sum, p) => sum + savedAmount(p), 0);
  const totalTarget = pockets.reduce((sum, p) => sum + p.target, 0);
  const overall = totalTarget > 0 ? Math.round((totalSaved / totalTarget) * 100) : 0;

  return (
    <BankingScreen
      title="Savings Pockets"
      subtitle="Organise your savings into goals."
      backTo="/home"
    >
      {/* Summary */}
      <AppCard
        elevation="md"
        style={{
          backgroundColor: theme.colors.heroDeep,
          borderColor: theme.colors.heroDeep,
          borderRadius: theme.radius.xl,
        }}
      >
        <View style={{ gap: theme.spacing.xs }}>
          <AppText role="body" style={{ color: theme.colors.onHero }}>
            Total saved across {pockets.length} {pockets.length === 1 ? 'pocket' : 'pockets'}
          </AppText>
          <AppText role="display" style={{ color: theme.colors.onHero, fontVariant: ['tabular-nums'] }}>
            {formatMoney(totalSaved)}
          </AppText>
          <AppText role="caption" style={{ color: theme.colors.heroArtTint }}>
            {overall}% of {formatMoney(totalTarget)} target · Simulated demo data
          </AppText>
        </View>
      </AppCard>

      {pockets.length === 0 ? (
        <EmptyState
          title="No savings pockets yet"
          message="Create a pocket to start working towards a goal, like a holiday or an emergency fund."
          actionLabel="Create a pocket"
          onAction={() => router.push('/savings/new')}
        />
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {pockets.map((pocket) => (
            <PocketCard
              key={pocket.id}
              pocket={pocket}
              onPress={() => router.push({ pathname: '/savings/[id]', params: { id: pocket.id } })}
            />
          ))}
        </View>
      )}

      {pockets.length > 0 ? (
        <AppButton
          label="Create a pocket"
          onPress={() => router.push('/savings/new')}
          accessibilityHint="Opens a form to create a new savings pocket"
        />
      ) : null}

      <View style={{ flexDirection: 'row', gap: theme.spacing.xs, alignItems: 'center' }}>
        <Icon name="info" size={14} color={theme.colors.textMuted} />
        <AppText role="caption" color="textMuted" style={{ flex: 1 }}>
          Adding money here is a simulation. It never moves real funds.
        </AppText>
      </View>
    </BankingScreen>
  );
}
