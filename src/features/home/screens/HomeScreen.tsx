import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Icon } from '@/components';
import { usePreferences } from '@/state';
import { useTheme } from '@/theme';

import {
  AccountsSection,
  CategoryTabs,
  GoalsSection,
  QuickActionsPanel,
  SecuritySection,
  SpendingSection,
  TransactionsSection,
} from '../components/HomeSections';
import { getHomeConfig, type HomeSection } from '../personalisationRules';

/**
 * Adaptive banking home (Developer A / UI lead).
 *
 * The screen is a thin composer: it reads the deterministic HomeConfig from the
 * customer's explicit preferences and renders sections in the chosen order.
 * Section components are presentational; ordering/verbosity lives in the rules
 * module. Changing preferences visibly re-arranges and re-words this screen.
 */
export function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const prefs = usePreferences();

  const config = useMemo(() => getHomeConfig(prefs), [prefs]);

  const [balanceHidden, setBalanceHidden] = useState(true);
  const [category, setCategory] = useState('overview');

  const sectionProps = {
    config,
    balanceHidden,
    onToggleBalance: () => setBalanceHidden((h) => !h),
  };

  const renderSection = (section: HomeSection) => {
    switch (section) {
      case 'quickActions':
        return (
          <QuickActionsPanel
            key={section}
            {...sectionProps}
            overlap={config.sectionOrder[0] === 'quickActions'}
          />
        );
      case 'categories':
        return <CategoryTabs key={section} active={category} onChange={setCategory} />;
      case 'accounts':
        return <AccountsSection key={section} {...sectionProps} />;
      case 'spending':
        return <SpendingSection key={section} {...sectionProps} />;
      case 'goals':
        return <GoalsSection key={section} {...sectionProps} />;
      case 'transactions':
        return <TransactionsSection key={section} {...sectionProps} />;
      case 'security':
        return <SecuritySection key={section} {...sectionProps} />;
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}
      >
        {/* Hero (also hosts the top bar so it sits on the coloured band). */}
        <View
          style={{
            backgroundColor: theme.colors.hero,
            paddingTop: insets.top + theme.spacing.sm,
            paddingHorizontal: theme.spacing.md,
            paddingBottom: theme.spacing.xl + theme.spacing.lg,
            borderBottomLeftRadius: theme.radius.xl,
            borderBottomRightRadius: theme.radius.xl,
          }}
        >
          <TopBar />
          <HeroGreeting highlightAccessibility={config.highlightAccessibility} />
        </View>

        {/* Body — sections in personalised order. The first section (quick
            actions) overlaps the hero via a negative margin for the floating
            panel effect. */}
        <View style={{ paddingHorizontal: theme.spacing.md, gap: theme.spacing.lg }}>
          {config.sectionOrder.map(renderSection)}

          <AppText role="caption" color="textMuted" center>
            Synthetic demo data • FlexBank is not affiliated with any bank.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

function TopBar() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.md,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: theme.radius.sm,
            backgroundColor: theme.colors.onHero,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AppText role="bodyStrong" style={{ color: theme.colors.hero }}>
            F
          </AppText>
        </View>
        <AppText role="subheading" style={{ color: theme.colors.onHero }}>
          FlexBank
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
        <HeroIconButton name="scan" label="Scan and pay" onPress={() => router.push('/scan')} />
        <HeroIconButton
          name="bell"
          label="Notifications, 1 unread"
          onPress={() => router.push('/human-assistance')}
          badge
        />
        <HeroIconButton name="settings" label="Settings" onPress={() => router.push('/settings')} />
      </View>
    </View>
  );
}

function HeroIconButton({
  name,
  label,
  onPress,
  badge = false,
}: {
  name: Parameters<typeof Icon>[0]['name'];
  label: string;
  onPress: () => void;
  badge?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon name={name} size={18} color={theme.colors.onHero} />
      {badge ? (
        <View
          style={{
            position: 'absolute',
            top: 8,
            right: 9,
            width: 8,
            height: 8,
            borderRadius: 4,
            backgroundColor: theme.colors.onHero,
          }}
        />
      ) : null}
    </Pressable>
  );
}

function HeroGreeting({ highlightAccessibility }: { highlightAccessibility: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const greeting = timeGreeting();

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <AppText role="body" style={{ color: theme.colors.heroArtTint }}>
        {greeting}
      </AppText>
      <AppText role="title" style={{ color: theme.colors.onHero }}>
        Welcome back
      </AppText>
      <AppText role="body" style={{ color: theme.colors.heroArtTint }}>
        Here is your money at a glance.
      </AppText>

      {highlightAccessibility ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open accessibility and display settings"
          onPress={() => router.push('/settings')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            alignSelf: 'flex-start',
            marginTop: theme.spacing.sm,
            backgroundColor: 'rgba(255,255,255,0.18)',
            paddingVertical: 6,
            paddingHorizontal: theme.spacing.sm,
            borderRadius: theme.radius.pill,
          }}
        >
          <Icon name="settings" size={14} color={theme.colors.onHero} />
          <AppText role="label" style={{ color: theme.colors.onHero }}>
            Display & accessibility
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
