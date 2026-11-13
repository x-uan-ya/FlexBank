import { View } from 'react-native';

import { AppCard, AppText, Icon } from '@/components';
import { useTheme } from '@/theme';
import { formatMoney, formatDate } from '@/utils';

import { daysUntil } from '../logic';
import type { TimelineEvent } from '../types';

/**
 * A simple vertical timeline of upcoming investment events (coupons +
 * maturities), ordered by date. Drawn with Views (no chart/timeline deps).
 * Clearly distinguishes coupon payments from principal/face repayment.
 */
export function MaturityTimeline({
  events,
  emptyLabel = 'No upcoming events.',
}: {
  events: TimelineEvent[];
  emptyLabel?: string;
}) {
  const theme = useTheme();

  if (events.length === 0) {
    return (
      <AppText role="body" color="textSecondary">
        {emptyLabel}
      </AppText>
    );
  }

  return (
    <View style={{ gap: 0 }}>
      {events.map((e, index) => {
        const isCoupon = e.type === 'coupon';
        const accent = isCoupon ? theme.colors.success : theme.colors.primary;
        const soft = isCoupon ? theme.colors.successSoft : theme.colors.accentSoft;
        const days = daysUntil(e.date);
        const last = index === events.length - 1;
        return (
          <View key={e.id} style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            {/* Rail + node */}
            <View style={{ alignItems: 'center', width: 36 }}>
              <View
                accessible={false}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: soft,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: theme.clarity ? 2 : 0,
                  borderColor: accent,
                }}
              >
                <Icon name={isCoupon ? 'plus' : 'goal'} size={14} color={accent} />
              </View>
              {!last ? (
                <View
                  accessible={false}
                  style={{ flex: 1, width: 2, backgroundColor: theme.colors.border, marginVertical: 2 }}
                />
              ) : null}
            </View>

            {/* Event detail */}
            <View style={{ flex: 1, paddingBottom: last ? 0 : theme.spacing.md }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm }}>
                <AppText role="bodyStrong" style={{ flex: 1 }}>
                  {e.investmentName}
                </AppText>
                <AppText role="bodyStrong" color={isCoupon ? 'success' : 'primary'}>
                  {formatMoney(e.amount)}
                </AppText>
              </View>
              <AppText role="caption" color="textSecondary">
                {isCoupon ? 'Coupon payment' : e.kind === 'bond' ? 'Bond matures (face value)' : 'Fixed deposit matures'}
                {' · '}
                {formatDate(e.date)}
              </AppText>
              <AppText role="caption" color="textMuted">
                {days === 0 ? 'Today' : days === 1 ? 'In 1 day' : `In ${days} days`}
              </AppText>
            </View>
          </View>
        );
      })}
    </View>
  );
}
