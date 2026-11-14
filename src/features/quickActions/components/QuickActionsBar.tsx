import { Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';

import { AppCard, AppText } from '@/components';
import { HomeIcon } from '@/features/home/components/HomeIcon';
import { useTheme } from '@/theme';

import { useQuickActions } from '../useQuickActions';

/**
 * The customer's quick actions at the top of Home. It only OPENS screens: it never
 * starts, approves or confirms a transfer (PayNow is entered through its Start screen).
 * The first action is highlighted; "Edit" opens the screen where the customer
 * chooses and orders them.
 */
export function QuickActionsBar() {
  const theme = useTheme();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const { selected } = useQuickActions();

  const count = selected.length;
  const contentWidth = Math.min(560, width - theme.spacing.md * 2);
  // Same rule Home used before: allow labels to wrap, but keep room for the longest word.
  const minActionWidth = (theme.typography.label.fontSize ?? 14) * fontScale * 5
    + theme.spacing.sm * 2 + (theme.clarity ? 4 : 2);
  const perRowWanted = count >= 4 ? 2 : Math.max(1, count);
  const sideBySide = perRowWanted > 1
    && contentWidth >= minActionWidth * perRowWanted + theme.spacing.sm * (perRowWanted - 1);
  const columns = sideBySide ? perRowWanted : 1;
  const notes = selected.flatMap((action) => (action.note ? [action.note] : []));

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {selected.map((action, index) => {
          const primary = index === 0;
          const stacked = columns > 1;
          return (
            <Pressable
              key={action.id}
              accessibilityRole="button"
              accessibilityLabel={action.note ? `${action.label}, preview only` : action.label}
              accessibilityHint={action.description}
              onPress={() => router.push(action.route)}
              style={({ pressed }) => ({
                flexGrow: 1,
                flexBasis: columns === 1 ? '100%' : `${Math.floor(100 / columns) - 3}%`,
                minWidth: 0,
                opacity: pressed ? 0.75 : 1,
              })}
            >
              <AppCard
                style={{
                  flex: 1,
                  minHeight: stacked ? 96 : 56,
                  flexDirection: stacked ? 'column' : 'row',
                  alignItems: 'center',
                  justifyContent: stacked ? 'center' : 'flex-start',
                  gap: theme.spacing.sm,
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.lg,
                  ...(primary ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryStrong } : {}),
                }}
              >
                <HomeIcon name={action.icon} size={28} color={primary ? theme.colors.onPrimary : theme.colors.primary} />
                <AppText
                  role="label"
                  center={stacked}
                  style={{ flexShrink: 1, color: primary ? theme.colors.onPrimary : theme.colors.textPrimary }}
                >
                  {action.label}
                </AppText>
              </AppCard>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          {notes.length > 0 ? (
            <AppText role="caption" color="textSecondary">{notes.join(' ')}</AppText>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit quick actions"
          accessibilityHint="Choose and reorder the shortcuts at the top of your home screen"
          onPress={() => router.push('/quick-actions')}
          style={({ pressed }) => ({
            minWidth: 48,
            minHeight: 48,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: theme.spacing.sm,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <AppText role="bodyStrong" color="primary">Edit</AppText>
        </Pressable>
      </View>
    </View>
  );
}
