import { View } from 'react-native';

import { AppCard, AppText, Divider } from '@/components';
import { useTheme } from '@/theme';
import { formatMoney } from '@/utils';

interface Activity {
  id: string;
  title: string;
  category: string;
  daysAgo: number;
  amount: number; // negative = money out
}

// Synthetic demo activity.
const ACTIVITY: Activity[] = [
  { id: 'a1', title: 'Grocery shopping', category: 'Groceries', daysAgo: 1, amount: -42.5 },
  { id: 'a2', title: 'Monthly allowance', category: 'Income', daysAgo: 3, amount: 800 },
  { id: 'a3', title: 'Transport top-up', category: 'Transport', daysAgo: 4, amount: -20 },
  { id: 'a4', title: 'Dinner with friends', category: 'Dining', daysAgo: 5, amount: -36.8 },
  { id: 'a5', title: 'Phone bill', category: 'Bills', daysAgo: 8, amount: -48.9 },
];

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dateLabel(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
}

export function RecentActivity({ hidden }: { hidden: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText role="heading" accessibilityRole="header">Recent activity</AppText>
      <AppCard>
        {ACTIVITY.length === 0 ? (
          <AppText color="textSecondary">No activity yet. Your payments will appear here.</AppText>
        ) : (
          <View style={{ gap: theme.spacing.sm }}>
            {ACTIVITY.map((item, index) => {
              const incoming = item.amount > 0;
              const money = hidden ? 'S$ ••••' : `${incoming ? '+' : '−'}${formatMoney(Math.abs(item.amount))}`;
              return (
                <View key={item.id} style={{ gap: theme.spacing.sm }}>
                  {index > 0 ? <Divider /> : null}
                  <View
                    accessible
                    accessibilityLabel={`${item.title}, ${hidden ? 'amount hidden' : `${formatMoney(Math.abs(item.amount))} ${incoming ? 'received' : 'paid'}`}, ${dateLabel(item.daysAgo)}`}
                    style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md }}
                  >
                    <View style={{ flex: 1, gap: theme.spacing.xs }}>
                      <AppText role="bodyStrong">{item.title}</AppText>
                      <AppText role="caption" color="textSecondary">
                        {item.category} · {dateLabel(item.daysAgo)} · {incoming ? 'Money in' : 'Money out'}
                      </AppText>
                    </View>
                    <AppText role="bodyStrong">{money}</AppText>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </AppCard>
      <AppText role="caption" color="textMuted">Synthetic demo activity.</AppText>
    </View>
  );
}