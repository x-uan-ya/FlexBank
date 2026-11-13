import { Pressable, View } from 'react-native';

import { AppCard, AppText, Icon } from '@/components';
import { useTheme } from '@/theme';
import { formatMoney, formatDate } from '@/utils';

import { statusOf } from '../logic';
import {
  COUPON_FREQUENCY_LABELS,
  type Investment,
} from '../types';

/** Summary card for one investment in the list. */
export function InvestmentCard({
  investment,
  onPress,
}: {
  investment: Investment;
  onPress: () => void;
}) {
  const theme = useTheme();
  const status = statusOf(investment);
  const isBond = investment.kind === 'bond';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${investment.name}, ${isBond ? 'bond' : 'fixed deposit'}, ${status}`}
      accessibilityHint="Opens investment details"
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.9 } : null)}
    >
      <AppCard>
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Icon
              name={isBond ? 'investments' : 'accounts'}
              size={20}
              color={theme.colors.primary}
              circle
              circleColor={theme.colors.accentSoft}
              circleSize={44}
            />
            <View style={{ flex: 1 }}>
              <AppText role="subheading">{investment.name}</AppText>
              <AppText role="caption" color="textMuted">
                {isBond ? 'Bond' : 'Fixed deposit'}
                {investment.demo ? ' · Demo' : ''}
              </AppText>
            </View>
            <StatusChip status={status} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText role="caption" color="textSecondary">
              {isBond ? 'Face value' : 'Principal'}
            </AppText>
            <AppText role="bodyStrong">
              {formatMoney(isBond ? investment.faceValue : investment.principal)}
            </AppText>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText role="caption" color="textSecondary">
              {investment.rate}% p.a.
              {isBond ? ` · ${COUPON_FREQUENCY_LABELS[investment.couponFrequency]}` : ''}
            </AppText>
            <AppText role="caption" color="textSecondary">
              Matures {formatDate(investment.maturityDate)}
            </AppText>
          </View>
        </View>
      </AppCard>
    </Pressable>
  );
}

function StatusChip({ status }: { status: 'active' | 'matured' }) {
  const theme = useTheme();
  const active = status === 'active';
  return (
    <View
      style={{
        paddingHorizontal: theme.spacing.sm,
        paddingVertical: 2,
        borderRadius: theme.radius.pill,
        backgroundColor: active ? theme.colors.successSoft : theme.colors.surfaceMuted,
      }}
    >
      <AppText role="label" color={active ? 'success' : 'textSecondary'}>
        {active ? 'Active' : 'Matured'}
      </AppText>
    </View>
  );
}
