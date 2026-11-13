import { useCallback, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppText,
  Divider,
  EmptyState,
  Icon,
  LoadingState,
} from '@/components';
import { BankingScreen } from '@/components/BankingScreen';
import { useTheme } from '@/theme';
import { formatMoney, formatDate } from '@/utils';

import { MaturityTimeline } from '../components/MaturityTimeline';
import {
  bondCouponAmount,
  buildTimeline,
  fixedDepositMaturityValue,
  statusOf,
} from '../logic';
import { getInvestment } from '../storage';
import { COUPON_FREQUENCY_LABELS, type Investment } from '../types';
import { useInvestments } from '../useInvestments';

/** Full detail for one investment, incl. payment schedule and estimates. */
export function InvestmentDetailScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { remove } = useInvestments();

  const [investment, setInvestment] = useState<Investment | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) return;
    setInvestment((await getInvestment(id)) ?? null);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function confirmDelete() {
    if (!investment) return;
    Alert.alert(
      'Remove this investment?',
      `"${investment.name}" will be removed from your tracker. This cannot be undone. (No real money is affected.)`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void remove(investment.id).then(() => router.replace('/investments'));
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <BankingScreen title="Investment" backTo="/investments">
        <LoadingState message="Loading investment…" />
      </BankingScreen>
    );
  }

  if (!investment) {
    return (
      <BankingScreen title="Investment" backTo="/investments">
        <EmptyState
          title="Investment not found"
          message="It may have been removed."
          actionLabel="Back to tracker"
          onAction={() => router.replace('/investments')}
        />
      </BankingScreen>
    );
  }

  const isBond = investment.kind === 'bond';
  const status = statusOf(investment);
  const events = buildTimeline([investment]);
  const estMaturity = isBond ? investment.faceValue : fixedDepositMaturityValue(investment);

  return (
    <BankingScreen
      title={investment.name}
      subtitle={`${isBond ? 'Bond' : 'Fixed deposit'}${investment.demo ? ' · Demo' : ''}`}
      backTo="/investments"
    >
      {/* Key figures */}
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
            {isBond ? 'Estimated value at maturity (face value)' : 'Estimated value at maturity'}
          </AppText>
          <AppText role="display" style={{ color: theme.colors.onHero, fontVariant: ['tabular-nums'] }}>
            {formatMoney(estMaturity)}
          </AppText>
          <AppText role="caption" style={{ color: theme.colors.heroArtTint }}>
            {status === 'active' ? 'Active' : 'Matured'} · Simulated estimate
          </AppText>
        </View>
      </AppCard>

      {/* Facts */}
      <AppCard>
        <Row label={isBond ? 'Principal invested' : 'Principal'} value={formatMoney(investment.principal)} />
        <Divider />
        {isBond ? (
          <>
            <Row label="Face value (repaid at maturity)" value={formatMoney(investment.faceValue)} />
            <Divider />
            <Row label="Coupon rate" value={`${investment.rate}% p.a.`} />
            <Divider />
            <Row label="Coupon frequency" value={COUPON_FREQUENCY_LABELS[investment.couponFrequency]} />
            <Divider />
            <Row label="Each coupon pays" value={formatMoney(bondCouponAmount(investment))} />
          </>
        ) : (
          <Row label="Interest rate" value={`${investment.rate}% p.a.`} />
        )}
        <Divider />
        <Row label="Start date" value={formatDate(investment.startDate)} />
        <Divider />
        <Row label="Maturity date" value={formatDate(investment.maturityDate)} />
      </AppCard>

      {/* Bond: explain coupon vs principal */}
      {isBond ? (
        <AppCard style={{ backgroundColor: theme.colors.surfaceMuted }}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Icon name="info" size={16} color={theme.colors.textSecondary} />
            <AppText role="caption" color="textSecondary" style={{ flex: 1 }}>
              Coupons are regular interest payments while you hold the bond. The
              face value is repaid separately at maturity. General information,
              not advice.
            </AppText>
          </View>
        </AppCard>
      ) : null}

      {/* Payment schedule */}
      <AppText role="heading">Payment schedule</AppText>
      <AppCard>
        <MaturityTimeline events={events} emptyLabel="No scheduled payments." />
      </AppCard>

      {/* Manage */}
      <AppButton
        label="Edit investment"
        variant="secondary"
        onPress={() => router.push({ pathname: '/investments/[id]/edit', params: { id: investment.id } })}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Remove investment"
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
          Remove from tracker
        </AppText>
      </Pressable>
    </BankingScreen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: theme.spacing.md,
        paddingVertical: theme.spacing.xs,
      }}
    >
      <AppText role="body" color="textSecondary" style={{ flex: 1 }}>
        {label}
      </AppText>
      <AppText role="bodyStrong" style={{ textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}
