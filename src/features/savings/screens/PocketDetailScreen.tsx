import { useCallback, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppInput,
  AppText,
  Divider,
  EmptyState,
  Icon,
  type IconName,
  LoadingState,
} from '@/components';
import { BankingScreen } from '@/components/BankingScreen';
import { useTheme } from '@/theme';
import { formatMoney, formatDate } from '@/utils';

import { ProgressBar } from '../components/ProgressBar';
import { pocketProgress, validateContribution } from '../logic';
import { getPocket } from '../storage';
import { categoryMeta, type SavingsPocket } from '../types';
import { useSavingsPockets } from '../useSavingsPockets';

const QUICK_AMOUNTS = [50, 100, 250];

/** Pocket details: progress, add contributions, history, edit, delete. */
export function PocketDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { contribute, remove } = useSavingsPockets();

  const [pocket, setPocket] = useState<SavingsPocket | null>(null);
  const [loading, setLoading] = useState(true);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    const p = await getPocket(id);
    setPocket(p ?? null);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function addAmount(amount: number) {
    if (!pocket || busy) return;
    setBusy(true);
    await contribute(pocket.id, amount);
    await load();
    setBusy(false);
  }

  function addCustom() {
    const result = validateContribution(custom);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(undefined);
    setCustom('');
    void addAmount(result.amount);
  }

  function confirmDelete() {
    if (!pocket) return;
    Alert.alert(
      'Delete this pocket?',
      `"${pocket.name}" and its contribution history will be removed. This cannot be undone. (No real money is affected.)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void remove(pocket.id).then(() => router.replace('/savings'));
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <BankingScreen title="Pocket" backTo="/savings">
        <LoadingState message="Loading pocket…" />
      </BankingScreen>
    );
  }

  if (!pocket) {
    return (
      <BankingScreen title="Pocket" backTo="/savings">
        <EmptyState
          title="Pocket not found"
          message="This pocket may have been deleted."
          actionLabel="Back to pockets"
          onAction={() => router.replace('/savings')}
        />
      </BankingScreen>
    );
  }

  const p = pocketProgress(pocket);
  const meta = categoryMeta(pocket.category);
  const history = [...pocket.contributions].reverse(); // most recent first

  return (
    <BankingScreen title={pocket.name} subtitle={`${meta.label}${pocket.demo ? ' · Demo' : ''}`} backTo="/savings">
      {/* Progress summary */}
      <AppCard
        elevation="md"
        style={{
          backgroundColor: theme.colors.heroDeep,
          borderColor: theme.colors.heroDeep,
          borderRadius: theme.radius.xl,
        }}
      >
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <AppText role="body" style={{ color: theme.colors.onHero }}>
              Saved so far
            </AppText>
            <AppText role="heading" style={{ color: theme.colors.onHero }}>
              {p.percent}%
            </AppText>
          </View>
          <AppText role="display" style={{ color: theme.colors.onHero, fontVariant: ['tabular-nums'] }}>
            {formatMoney(p.saved)}
          </AppText>
          <ProgressBar
            fraction={p.fraction}
            fillColor={theme.colors.onHero}
            trackColor="rgba(255,255,255,0.25)"
          />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText role="caption" style={{ color: theme.colors.heroArtTint }}>
              Target {formatMoney(p.target)}
            </AppText>
            <AppText role="caption" style={{ color: theme.colors.heroArtTint }}>
              {p.complete ? 'Goal reached' : `${formatMoney(p.remaining)} to go`}
            </AppText>
          </View>
        </View>
      </AppCard>

      {pocket.targetDate ? (
        <AppCard>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Icon name="goal" size={18} color={theme.colors.primary} />
            <AppText role="body" color="textSecondary" style={{ flex: 1 }}>
              Target date
            </AppText>
            <AppText role="bodyStrong">{formatDate(pocket.targetDate)}</AppText>
          </View>
        </AppCard>
      ) : null}

      {/* Add money (simulated) */}
      <AppCard>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="subheading">Add money</AppText>
          <AppText role="caption" color="textMuted">
            Simulated only — no real money moves.
          </AppText>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            {QUICK_AMOUNTS.map((amt) => (
              <View key={amt} style={{ flex: 1 }}>
                <AppButton
                  label={`+ ${formatMoney(amt)}`}
                  variant="secondary"
                  loading={false}
                  disabled={busy}
                  onPress={() => addAmount(amt)}
                />
              </View>
            ))}
          </View>
          <AppInput
            label="Custom amount (SGD)"
            placeholder="e.g. 75"
            keyboardType="decimal-pad"
            value={custom}
            onChangeText={(t) => {
              setCustom(t.replace(/[^0-9.]/g, ''));
              if (error) setError(undefined);
            }}
            error={error}
          />
          <AppButton label="Add contribution" onPress={addCustom} disabled={busy || custom.trim() === ''} />
        </View>
      </AppCard>

      {/* Contribution history */}
      <AppCard>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="subheading">Contribution history</AppText>
          {history.length === 0 ? (
            <AppText role="body" color="textSecondary">
              No contributions yet. Add money above to get started.
            </AppText>
          ) : (
            history.map((c, index) => (
              <View key={c.id}>
                {index > 0 ? <Divider /> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xs }}>
                  <Icon name="plus" size={16} color={theme.colors.success} circle circleColor={theme.colors.successSoft} circleSize={34} />
                  <View style={{ flex: 1 }}>
                    <AppText role="body">{formatMoney(c.amount)}</AppText>
                    {c.note ? (
                      <AppText role="caption" color="textMuted">
                        {c.note}
                      </AppText>
                    ) : null}
                  </View>
                  <AppText role="caption" color="textMuted">
                    {formatDate(c.at)}
                  </AppText>
                </View>
              </View>
            ))
          )}
        </View>
      </AppCard>

      {/* Manage */}
      <AppButton
        label="Edit pocket"
        variant="secondary"
        onPress={() => router.push({ pathname: '/savings/[id]/edit', params: { id: pocket.id } })}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete pocket"
        onPress={confirmDelete}
        style={({ pressed }) => ({
          minHeight: 48,
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: theme.radius.md,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <AppText role="bodyStrong" color="danger">
          Delete pocket
        </AppText>
      </Pressable>
    </BankingScreen>
  );
}
