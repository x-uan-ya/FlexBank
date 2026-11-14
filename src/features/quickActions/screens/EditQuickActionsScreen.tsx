import { useState } from 'react';
import { AccessibilityInfo, Platform, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppButton, AppCard, AppText, Header, ScreenContainer } from '@/components';
import { HomeIcon } from '@/features/home/components/HomeIcon';
import { useTheme } from '@/theme';

import { MIN_QUICK_ACTIONS, type QuickAction } from '../quickActions';
import { useQuickActions } from '../useQuickActions';

/**
 * Choose and order the shortcuts shown at the top of Home. Every change saves
 * straight away. Shortcuts only open screens; they never send money.
 */
export function EditQuickActionsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { selected, available, isDefault, max, atMax, add, remove, move, reset } = useQuickActions();
  const [status, setStatus] = useState('');

  function announce(message: string) {
    setStatus(message);
    // Web and Android read the live region below; avoid announcing twice there.
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  function handleAdd(action: QuickAction) {
    add(action.id);
    announce(`${action.label} added to your quick actions.`);
  }

  function handleRemove(action: QuickAction) {
    remove(action.id);
    announce(`${action.label} removed from your quick actions.`);
  }

  function handleMove(action: QuickAction, direction: -1 | 1) {
    move(action.id, direction);
    announce(`${action.label} moved ${direction === -1 ? 'up' : 'down'}.`);
  }

  return (
    <ScreenContainer>
      <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', gap: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.xs }}>
          <Header title="Quick actions" subtitle="Shortcuts at the top of your home screen" onBack={goBack} />
          <AppText color="textSecondary">
            Choose up to {max} and put them in the order you like. The first one is highlighted. They only open
            screens; they never send money.
          </AppText>
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="heading" accessibilityRole="header">On your home screen</AppText>
          <AppText role="caption" color="textSecondary">
            {selected.length} of {max} · {isDefault ? 'Suggested for you. Change anything to make it yours.' : 'Your choice'}
          </AppText>
          {selected.map((action, index) => (
            <AppCard key={action.id} elevation="none">
              <View style={{ gap: theme.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <HomeIcon name={action.icon} size={28} />
                  <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xs }}>
                    <AppText role="bodyStrong">{action.label}</AppText>
                    <AppText role="caption" color="textSecondary">
                      {index + 1} of {selected.length}{index === 0 ? ' · Highlighted' : ''}
                    </AppText>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                  <AppButton
                    label="↑"
                    variant="secondary"
                    fullWidth={false}
                    disabled={index === 0}
                    onPress={() => handleMove(action, -1)}
                    accessibilityLabel={`Move ${action.label} up`}
                  />
                  <AppButton
                    label="↓"
                    variant="secondary"
                    fullWidth={false}
                    disabled={index === selected.length - 1}
                    onPress={() => handleMove(action, 1)}
                    accessibilityLabel={`Move ${action.label} down`}
                  />
                  <AppButton
                    label="Remove"
                    variant="secondary"
                    fullWidth={false}
                    disabled={selected.length <= MIN_QUICK_ACTIONS}
                    onPress={() => handleRemove(action)}
                    accessibilityLabel={`Remove ${action.label}`}
                  />
                </View>
              </View>
            </AppCard>
          ))}
          {selected.length <= MIN_QUICK_ACTIONS ? (
            <AppText role="caption" color="textSecondary">Keep at least one. Add another before removing this one.</AppText>
          ) : null}
        </View>

        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="heading" accessibilityRole="header">Add a shortcut</AppText>
          {atMax ? (
            <AppText role="caption" color="textSecondary">
              You have {max} shortcuts. Remove one to add another.
            </AppText>
          ) : null}
          {available.map((action) => (
            <AppCard key={action.id} elevation="none">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <HomeIcon name={action.icon} size={28} />
                <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xs }}>
                  <AppText role="bodyStrong">{action.label}</AppText>
                  <AppText role="caption" color="textSecondary">{action.description}</AppText>
                </View>
                <AppButton
                  label="Add"
                  variant="secondary"
                  fullWidth={false}
                  disabled={atMax}
                  onPress={() => handleAdd(action)}
                  accessibilityLabel={`Add ${action.label}`}
                />
              </View>
            </AppCard>
          ))}
        </View>

        <AppText accessibilityLiveRegion="polite" role="caption" color="textSecondary">{status}</AppText>

        <View style={{ gap: theme.spacing.sm }}>
          <AppButton
            label="Use suggested shortcuts"
            variant="secondary"
            disabled={isDefault}
            onPress={() => {
              reset();
              announce('Quick actions reset to the suggested shortcuts.');
            }}
            accessibilityHint="Goes back to the shortcuts chosen from your banking purposes"
          />
          <AppButton label="Done" onPress={goBack} />
        </View>
      </View>
    </ScreenContainer>
  );
}
