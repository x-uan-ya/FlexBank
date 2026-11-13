import { useCallback } from 'react';
import { View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

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

import { InvestmentCard } from '../components/InvestmentCard';
import { MaturityTimeline } from '../components/MaturityTimeline';
import {
  daysUntil,
  dueReminders,
  statusOf,
  trackedValue,
  upcomingEvents,
} from '../logic';
import { useInvestments } from '../useInvestments';

/**
 * Investment Maturity Tracker — overview dashboard.
 * Totals, active count, upcoming events, breakdown by type, due reminders,
 * a maturity timeline, and the list of tracked investments.
 */
export function InvestmentsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { investments, reminderPrefs, loading, refresh } = useInvestments();

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  if (loading) {
    return (
      <BankingScreen title="Investment Tracker" backTo="/home">
        <LoadingState message="Loading investments…" />
      </BankingScreen>
    );
  }

  const total = investments.reduce((sum, i) => sum + trackedValue(i), 0);
  const active = investments.filter((i) => statusOf(i) === 'active').length;
  const upcoming = upcomingEvents(investments);
  const upcomingMaturities = upcoming.filter((e) => e.type === 'maturity').length;
  const upcomingCoupons = upcoming.filter((e) => e.type === 'coupon').length;
  const fdCount = investments.filter((i) => i.kind === 'fixedDeposit').length;
  const bondCount = investments.filter((i) => i.kind === 'bond').length;
  const reminders = dueReminders(investments, reminderPrefs);
  const nextEvents = upcoming.slice(0, 5);

  return (
    <BankingScreen
      title="Investment Tracker"
      subtitle="Monitor your fixed deposits and bonds."
      backTo="/home"
    >
      {investments.length === 0 ? (
        <EmptyState
          title="No investments tracked yet"
          message="Add a fixed deposit or bond to track maturities and coupon payments."
          actionLabel="Add an investment"
          onAction={() => router.push('/investments/new')}
        />
      ) : (
        <>
          {/* Summary hero */}
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
                Total tracked ({active} active)
              </AppText>
              <AppText role="display" style={{ color: theme.colors.onHero, fontVariant: ['tabular-nums'] }}>
                {formatMoney(total)}
              </AppText>
              <AppText role="caption" style={{ color: theme.colors.heroArtTint }}>
                {upcomingMaturities} upcoming {upcomingMaturities === 1 ? 'maturity' : 'maturities'} ·{' '}
                {upcomingCoupons} upcoming coupon {upcomingCoupons === 1 ? 'payment' : 'payments'} · Simulated
              </AppText>
            </View>
          </AppCard>

          {/* Breakdown by type */}
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <StatCard label="Fixed deposits" value={String(fdCount)} icon="accounts" />
            <StatCard label="Bonds" value={String(bondCount)} icon="investments" />
          </View>

          {/* Due reminders */}
          {reminders.length > 0 ? (
            <AppCard style={{ borderColor: theme.colors.warning }}>
              <View style={{ gap: theme.spacing.xs }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Icon name="bell" size={18} color={theme.colors.warning} />
                  <AppText role="subheading" style={{ flex: 1 }}>
                    Coming up in the next {reminderPrefs.daysBefore} days
                  </AppText>
                </View>
                {reminders.map((e) => (
                  <AppText key={e.id} role="caption" color="textSecondary">
                    {formatDate(e.date)} · {e.investmentName} ·{' '}
                    {e.type === 'coupon' ? 'coupon' : 'maturity'} {formatMoney(e.amount)}
                    {daysUntil(e.date) === 0 ? ' (today)' : ` (in ${daysUntil(e.date)} days)`}
                  </AppText>
                ))}
              </View>
            </AppCard>
          ) : null}

          {/* Maturity timeline */}
          <AppText role="heading">Maturity timeline</AppText>
          <AppCard>
            <MaturityTimeline events={nextEvents} emptyLabel="No upcoming coupons or maturities." />
          </AppCard>

          {/* Investment list */}
          <AppText role="heading">Your investments</AppText>
          <View style={{ gap: theme.spacing.sm }}>
            {investments.map((inv) => (
              <InvestmentCard
                key={inv.id}
                investment={inv}
                onPress={() =>
                  router.push({ pathname: '/investments/[id]', params: { id: inv.id } })
                }
              />
            ))}
          </View>

          <AppButton label="Add an investment" onPress={() => router.push('/investments/new')} />
          <AppButton
            label="Reminder settings"
            variant="secondary"
            onPress={() => router.push('/investments/reminders')}
          />
        </>
      )}

      <View style={{ flexDirection: 'row', gap: theme.spacing.xs, alignItems: 'center' }}>
        <Icon name="info" size={14} color={theme.colors.textMuted} />
        <AppText role="caption" color="textMuted" style={{ flex: 1 }}>
          Simulated data and estimates only. Not real products, rates or advice.
        </AppText>
      </View>
    </BankingScreen>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: 'accounts' | 'investments' }) {
  const theme = useTheme();
  return (
    <AppCard style={{ flex: 1 }}>
      <View style={{ gap: theme.spacing.xs }}>
        <Icon name={icon} size={18} color={theme.colors.primary} />
        <AppText role="title">{value}</AppText>
        <AppText role="caption" color="textSecondary">
          {label}
        </AppText>
      </View>
    </AppCard>
  );
}
