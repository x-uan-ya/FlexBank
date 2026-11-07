import { useState } from 'react';
import { Modal, Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, AppCard, AppText } from '@/components';
import { MOCK_ACCOUNTS, MOCK_SPENDING } from '@/data';
import { useHomeLayout } from '@/state';
import { useTheme } from '@/theme';
import type { HomeWidgetType } from '@/types/home';
import { formatMoney } from '@/utils';

import { HomeIcon } from '../components/HomeIcon';
import { WidgetRenderer } from '../components/WidgetRenderer';

type HomeDetail = 'transfer' | 'accounts' | 'spending';

/** Dashboard presentation only: reads saved layout and never dispatches state changes. */
export function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width, fontScale } = useWindowDimensions();
  const [balanceHidden, setBalanceHidden] = useState(false);
  const [detail, setDetail] = useState<HomeDetail | null>(null);
  const account = MOCK_ACCOUNTS[0];
  const enlarged = theme.mode !== 'standard';
  const narrow = width < 375 || enlarged;
  const contentWidth = Math.min(560, width - theme.spacing.md * 2);
  // Allow Scan & Pay to wrap, while leaving room for the longest single word.
  // System font scaling can require the row layout even on a wider phone.
  const minActionWidth = (theme.typography.label.fontSize ?? 14) * fontScale * 5
    + theme.spacing.sm * 2 + (theme.clarity ? 4 : 2);
  const actionsInRow = contentWidth >= minActionWidth * 3 + theme.spacing.sm * 2;
  const visibleShortcuts = [...useHomeLayout()]
    .sort((a, b) => a.position - b.position)
    .filter((widget) => widget.visible)
    .slice(0, 4);

  function openShortcut(type: HomeWidgetType) {
    switch (type) {
      case 'accounts': case 'spending': case 'transfer': setDetail(type); break;
      case 'bills': router.push('/bills'); break;
      case 'concierge': router.push('/concierge'); break;
      case 'help': router.push('/human-assistance'); break;
      // Enter through Start so a recent recipient shortcut cannot skip the flow.
      case 'paynow': case 'recentRecipients': router.push('/paynow'); break;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{
        paddingTop: insets.top + theme.spacing.md,
        paddingBottom: insets.bottom + theme.spacing.lg,
        paddingHorizontal: theme.spacing.md, alignItems: 'center',
      }}>
        <View style={{ width: '100%', maxWidth: 560, gap: theme.spacing.lg }}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center',
            justifyContent: 'space-between', gap: theme.spacing.sm }}>
            <View accessibilityLabel="FlexBank" accessible style={{ flexDirection: 'row',
              alignItems: 'center', gap: theme.spacing.sm }}>
              <View accessible={false} style={{ width: 32, height: 34, justifyContent: 'center', gap: 4 }}>
                {[0, 1].map((part) => <View key={part} style={{ width: part ? 21 : 29,
                  height: 12, marginLeft: part ? 0 : 3, borderTopLeftRadius: 8,
                  borderBottomRightRadius: 8, backgroundColor: theme.colors.primary,
                  transform: [{ skewX: '-20deg' }],
                }} />)}
              </View>
              <AppText role="title">FlexBank</AppText>
            </View>
            <View style={{ flexDirection: 'row' }}>
              <HeaderAction icon="help" label="Help and assistance" onPress={() => router.push('/human-assistance')} />
              <HeaderAction icon="settings" label="Settings" onPress={() => router.push('/settings')} />
            </View>
          </View>

          <View style={{ gap: theme.spacing.xs }}>
            <AppText role="display" accessibilityRole="header">Hello,</AppText>
            <AppText role="subheading" color="textSecondary" style={{ fontWeight: '400' }}>Your money, at a glance.</AppText>
          </View>

          {account ? <AppCard elevation="md" style={{ backgroundColor: theme.colors.heroDeep,
            borderColor: theme.colors.heroDeep, borderRadius: theme.radius.xl, overflow: 'hidden', padding: theme.spacing.md }}>
            <View pointerEvents="none" accessible={false} style={{ position: 'absolute',
              right: -100, bottom: -170, width: 280, height: 280, borderRadius: 140,
              borderWidth: 24, borderColor: theme.colors.hero, opacity: 0.55 }} />
            <View style={{ gap: theme.spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <AppText role="heading" style={{ flex: 1, color: theme.colors.onHero }}>{account.name}</AppText>
                <Pressable accessibilityRole="button" accessibilityLabel={balanceHidden ? 'Show account balance' : 'Hide account balance'}
                  onPress={() => setBalanceHidden((hidden) => !hidden)}
                  style={({ pressed }) => ({ minWidth: 48, minHeight: 48, alignItems: 'center',
                    justifyContent: 'center', borderRadius: theme.radius.pill, opacity: pressed ? 0.65 : 1 })}>
                  <HomeIcon name={balanceHidden ? 'eyeOff' : 'eye'} size={28} color={theme.colors.onHero} />
                </Pressable>
              </View>
              <View style={{ gap: theme.spacing.xs }}>
                <AppText role="body" style={{ color: theme.colors.onHero }}>Available balance</AppText>
                <AppText role="display" accessibilityLabel={balanceHidden ? 'Balance hidden' : `Available balance ${formatMoney(account.balance, account.currency)}`}
                  accessibilityLiveRegion="polite" style={{ color: theme.colors.onHero, fontVariant: ['tabular-nums'] }}>
                  {balanceHidden ? 'S$ ••••••' : formatMoney(account.balance, account.currency)}
                </AppText>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.sm }}>
                <AppText role="body" style={{ color: theme.colors.onHero }}>{account.maskedNumber}</AppText>
                <View style={{ backgroundColor: theme.colors.accentSoft, borderRadius: theme.radius.pill,
                  paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xs }}>
                  <AppText role="label" style={{ color: theme.colors.heroDeep }}>Demo account</AppText>
                </View>
              </View>
            </View>
          </AppCard> : null}

          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: actionsInRow ? 'row' : 'column', gap: theme.spacing.sm }}>
              {([
                { label: 'PayNow', icon: 'paynow', onPress: () => router.push('/paynow'), primary: true },
                { label: 'Scan & Pay', icon: 'scan', onPress: () => router.push('/scan'), hint: 'Preview only' },
                { label: 'Transfer', icon: 'transfer', onPress: () => setDetail('transfer'), hint: 'PayNow demo only' },
              ] as const).map((action) => <Pressable key={action.label} accessibilityRole="button"
                accessibilityLabel={`${action.label}${'hint' in action ? `, ${action.hint}` : ''}`}
                onPress={action.onPress} style={({ pressed }) => ({ flex: actionsInRow ? 1 : undefined,
                  minWidth: 0, opacity: pressed ? 0.75 : 1 })}>
                <AppCard style={{ flex: 1, minHeight: actionsInRow ? 96 : 56,
                  flexDirection: actionsInRow ? 'column' : 'row', alignItems: 'center',
                  justifyContent: actionsInRow ? 'center' : 'flex-start', gap: theme.spacing.sm,
                  padding: theme.spacing.sm, borderRadius: theme.radius.lg,
                  ...('primary' in action ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primaryStrong } : {}),
                }}>
                  <HomeIcon name={action.icon} size={28} color={'primary' in action ? theme.colors.onPrimary : theme.colors.primary} />
                  <AppText role="label" center={actionsInRow} style={{ flexShrink: 1,
                    color: 'primary' in action ? theme.colors.onPrimary : theme.colors.textPrimary }}>{action.label}</AppText>
                </AppCard>
              </Pressable>)}
            </View>
            <AppText role="caption" color="textSecondary">Scan &amp; Pay: preview only. Transfers: PayNow demo only.</AppText>
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="Made for you. Personalise your home dashboard"
            onPress={() => router.push('/customize')} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
            <AppCard style={{ borderRadius: theme.radius.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                {!narrow ? <View style={{ width: 48, height: 48, backgroundColor: theme.colors.accentSoft,
                  borderRadius: theme.radius.lg, alignItems: 'center', justifyContent: 'center' }}><HomeIcon name="layers" /></View> : null}
                <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xs }}>
                  <AppText role="heading">Made for you</AppText>
                  <AppText role="caption" color="textSecondary">Put the tools you use most within reach.</AppText>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                    <AppText role="label" color="primary">Personalise</AppText><HomeIcon name="chevron" size={18} />
                  </View>
                </View>
              </View>
            </AppCard>
          </Pressable>

          <View style={{ gap: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
              <AppText role="heading" accessibilityRole="header" style={{ flex: 1 }}>Your shortcuts</AppText>
              <Pressable accessibilityRole="button" accessibilityLabel="Edit homepage shortcuts" onPress={() => router.push('/customize')}
                style={({ pressed }) => ({ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
                <AppText role="bodyStrong" color="primary">Edit</AppText>
              </Pressable>
            </View>
            {visibleShortcuts.length ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
              {visibleShortcuts.map((widget) => <View key={widget.id} style={{ flexGrow: 1,
                flexBasis: widget.type === 'paynow' || widget.type === 'transfer' ? '100%' : narrow ? '45%' : '21%',
                minWidth: 0 }}>
                <WidgetRenderer widget={widget} compact
                  availableAbove={widget.type === 'paynow' || widget.type === 'transfer'}
                  onPress={() => openShortcut(widget.type)} />
              </View>)}
            </View> : <AppCard elevation="none"><AppText color="textSecondary">No shortcuts shown. Select Edit to choose your tools.</AppText></AppCard>}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ask Banking Concierge"
            accessibilityHint="Opens Banking Concierge for plain-language help"
            onPress={() => router.push('/concierge')}
            style={({ pressed }) => ({
              minHeight: 48,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: theme.spacing.sm,
              paddingVertical: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              borderRadius: theme.radius.lg,
              borderWidth: theme.clarity ? 2 : 1,
              borderColor: theme.clarity ? theme.colors.borderStrong : theme.colors.border,
              backgroundColor: pressed ? theme.colors.selectedBg : theme.colors.surface,
            })}
          >
            <HomeIcon name="message" size={20} />
            <AppText role="bodyStrong" color="primary" center style={{ flexShrink: 1 }}>
              Ask Banking Concierge
            </AppText>
          </Pressable>
          <AppText role="caption" color="textSecondary" center>Synthetic demo data · No real money moves.</AppText>
        </View>
      </ScrollView>

      <Modal visible={detail !== null} transparent animationType="fade" onRequestClose={() => setDetail(null)}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: theme.spacing.md, backgroundColor: theme.colors.heroDeep }}>
          <View accessibilityViewIsModal style={{ maxWidth: 520, width: '100%', maxHeight: '90%' }}>
            <AppCard style={{ gap: theme.spacing.md, flexShrink: 1, maxHeight: '100%' }}>
              <AppText role="heading" accessibilityRole="header">{detail === 'transfer' ? 'Transfers in this demo' : detail === 'accounts' ? 'Your demo accounts' : 'Your demo spending'}</AppText>
              <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: theme.spacing.md }}>
                {detail === 'transfer' ? <AppText>Bank transfers are not available in this prototype. You can try a simulated PayNow transfer instead. No real money moves.</AppText> :
                  detail === 'accounts' ? MOCK_ACCOUNTS.map((item) => <View key={item.id} style={{ gap: theme.spacing.xs }}>
                    <AppText role="bodyStrong">{item.name}</AppText>
                    <AppText color="textSecondary">{item.maskedNumber}</AppText>
                    <AppText accessibilityLabel={balanceHidden ? 'Balance hidden' : undefined}>{balanceHidden ? 'Balance hidden' : formatMoney(item.balance, item.currency)}</AppText>
                  </View>) : <View style={{ gap: theme.spacing.sm }}>
                    <AppText color="textSecondary">{MOCK_SPENDING.month} · Synthetic example</AppText>
                    <AppText role="bodyStrong">{balanceHidden ? 'Amounts hidden' : `Total ${formatMoney(MOCK_SPENDING.total)}`}</AppText>
                    {MOCK_SPENDING.categories.map((category) => <AppText key={category.id}>{category.label}: {balanceHidden ? 'Hidden' : formatMoney(category.amount)}</AppText>)}
                  </View>}
              </ScrollView>
              {detail === 'transfer' ? <AppButton label="Try PayNow demo" onPress={() => { setDetail(null); router.push('/paynow'); }} /> : null}
              <AppButton label="Close" variant="secondary" onPress={() => setDetail(null)} />
            </AppCard>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function HeaderAction({ icon, label, onPress }: { icon: 'help' | 'settings'; label: string; onPress: () => void }) {
  const theme = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
    style={({ pressed }) => ({ width: 48, height: 48, alignItems: 'center', justifyContent: 'center',
      borderRadius: theme.radius.pill, backgroundColor: pressed ? theme.colors.accentSoft : undefined })}>
    <HomeIcon name={icon} size={26} color={theme.colors.textPrimary} />
  </Pressable>;
}
