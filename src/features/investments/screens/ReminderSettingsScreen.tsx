import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppCard, AppText, Icon, LoadingState } from '@/components';
import { BankingScreen } from '@/components/BankingScreen';
import { useTheme } from '@/theme';
import { formatMoney, formatDate } from '@/utils';

import { daysUntil, dueReminders } from '../logic';
import { REMINDER_DAY_OPTIONS } from '../types';
import { useInvestments } from '../useInvestments';

/**
 * Reminder preferences + in-app upcoming reminders.
 * Choose how many days before an event to be reminded. Reminders are shown
 * in-app only (no external notification services), per the prototype scope.
 */
export function ReminderSettingsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { investments, reminderPrefs, loading, updateReminderPrefs } = useInvestments();

  if (loading) {
    return (
      <BankingScreen title="Reminders" backTo="/investments">
        <LoadingState message="Loading reminders…" />
      </BankingScreen>
    );
  }

  const due = dueReminders(investments, reminderPrefs);

  return (
    <BankingScreen
      title="Reminder settings"
      subtitle="Choose when to be reminded of maturities and coupons."
      backTo="/investments"
    >
      <AppCard>
        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="subheading">Remind me before an event</AppText>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Days before to remind"
            style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}
          >
            {REMINDER_DAY_OPTIONS.map((days) => {
              const active = reminderPrefs.daysBefore === days;
              return (
                <Pressable
                  key={days}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${days} days before`}
                  onPress={() => void updateReminderPrefs({ daysBefore: days })}
                  style={({ pressed }) => ({
                    paddingVertical: theme.spacing.sm,
                    paddingHorizontal: theme.spacing.md,
                    minWidth: 72,
                    alignItems: 'center',
                    borderRadius: theme.radius.md,
                    borderColor: active ? theme.colors.selectedBorder : theme.colors.border,
                    borderWidth: active || theme.clarity ? 2 : 1,
                    backgroundColor: active
                      ? theme.colors.selectedBg
                      : pressed
                        ? theme.colors.surfaceMuted
                        : theme.colors.surface,
                  })}
                >
                  <AppText role="bodyStrong" color={active ? 'primary' : 'textSecondary'}>
                    {days} days
                  </AppText>
                </Pressable>
              );
            })}
          </View>
          <AppText role="caption" color="textMuted">
            Reminders appear inside the app only.
          </AppText>
        </View>
      </AppCard>

      <AppText role="heading">Upcoming in the next {reminderPrefs.daysBefore} days</AppText>
      {due.length === 0 ? (
        <AppCard>
          <AppText role="body" color="textSecondary">
            Nothing due in this window. Try a longer reminder period, or check back later.
          </AppText>
        </AppCard>
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {due.map((e) => (
            <AppCard key={e.id}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <Icon
                  name="bell"
                  size={16}
                  color={theme.colors.warning}
                  circle
                  circleColor={theme.colors.warningSoft}
                  circleSize={38}
                />
                <View style={{ flex: 1 }}>
                  <AppText role="bodyStrong">{e.investmentName}</AppText>
                  <AppText role="caption" color="textSecondary">
                    {e.type === 'coupon' ? 'Coupon payment' : 'Maturity'} · {formatMoney(e.amount)}
                  </AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText role="caption" color="textSecondary">
                    {formatDate(e.date)}
                  </AppText>
                  <AppText role="caption" color="textMuted">
                    {daysUntil(e.date) === 0 ? 'Today' : `${daysUntil(e.date)}d`}
                  </AppText>
                </View>
              </View>
            </AppCard>
          ))}
        </View>
      )}
    </BankingScreen>
  );
}
