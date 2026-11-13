import { Pressable, View } from 'react-native';

import { AppCard, AppText, Icon, type IconName } from '@/components';
import { useTheme } from '@/theme';
import { formatMoney, formatDate } from '@/utils';

import { pocketProgress } from '../logic';
import { categoryMeta, type SavingsPocket } from '../types';
import { ProgressBar } from './ProgressBar';

/** A tappable summary card for one savings pocket. */
export function PocketCard({
  pocket,
  onPress,
}: {
  pocket: SavingsPocket;
  onPress: () => void;
}) {
  const theme = useTheme();
  const p = pocketProgress(pocket);
  const meta = categoryMeta(pocket.category);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${pocket.name}. ${p.percent}% saved, ${formatMoney(p.remaining)} to go.`}
      accessibilityHint="Opens pocket details"
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.9 } : null)}
    >
      <AppCard>
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
            <Icon
              name={meta.icon as IconName}
              size={20}
              color={theme.colors.primary}
              circle
              circleColor={theme.colors.accentSoft}
              circleSize={44}
            />
            <View style={{ flex: 1 }}>
              <AppText role="subheading">{pocket.name}</AppText>
              <AppText role="caption" color="textMuted">
                {meta.label}
                {pocket.demo ? ' · Demo' : ''}
              </AppText>
            </View>
            <AppText role="heading" color="primary">
              {p.percent}%
            </AppText>
          </View>

          {/* Progress bar drawn with Views (see ProgressBar). */}
          <ProgressBar fraction={p.fraction} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <AppText role="caption" color="textSecondary">
              {formatMoney(p.saved)} of {formatMoney(p.target)}
            </AppText>
            <AppText role="caption" color="textSecondary">
              {p.complete ? 'Goal reached' : `${formatMoney(p.remaining)} to go`}
            </AppText>
          </View>

          {pocket.targetDate ? (
            <AppText role="caption" color="textMuted">
              Target date: {formatDate(pocket.targetDate)}
            </AppText>
          ) : null}
        </View>
      </AppCard>
    </Pressable>
  );
}
