import { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText, Icon } from '@/components';
import { useAuthState, usePreferences } from '@/state';
import { useTheme } from '@/theme';

import {
  AccountsCards,
  BondsSection,
  EverydaySection,
  FixedDepositsSection,
  LearningSection,
  ManagingSection,
  QuickActions,
  SavingsSection,
  SecurityTipsSection,
} from '../components/PurposeSections';
import { getPurposeHome, type PurposeSection } from '../purposeEngine';

/**
 * Purpose-based personalised home.
 *
 * Reads the customer's EXPLICIT banking purposes and renders home sections in
 * the order chosen by the pure `purposeEngine`. Each personalised section can
 * reveal a "Why am I seeing this?" explanation, so the personalisation is
 * transparent. No feature is hidden; security stays visible.
 */
export function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const prefs = usePreferences();
  const { user } = useAuthState();

  const home = useMemo(() => getPurposeHome(prefs), [prefs]);
  const [balanceHidden, setBalanceHidden] = useState(true);

  const toggleBalance = () => setBalanceHidden((h) => !h);

  const sectionTitle: Record<PurposeSection, string> = {
    quickActions: 'Quick actions',
    accounts: 'Your accounts',
    savings: 'Saving money',
    fixedDeposits: 'Fixed deposits',
    bonds: 'Bonds & investments',
    everyday: 'Everyday banking',
    managing: 'Managing my money',
    learning: 'Learning',
    security: 'Stay safe',
  };

  function renderBody(section: PurposeSection) {
    switch (section) {
      case 'quickActions':
        return <QuickActions overlap={home.sections[0] === 'quickActions'} />;
      case 'accounts':
        return <AccountsCards balanceHidden={balanceHidden} onToggleBalance={toggleBalance} />;
      case 'savings':
        return <SavingsSection balanceHidden={balanceHidden} />;
      case 'fixedDeposits':
        return <FixedDepositsSection balanceHidden={balanceHidden} />;
      case 'bonds':
        return <BondsSection balanceHidden={balanceHidden} />;
      case 'everyday':
        return <EverydaySection balanceHidden={balanceHidden} />;
      case 'managing':
        return <ManagingSection balanceHidden={balanceHidden} />;
      case 'learning':
        return <LearningSection />;
      case 'security':
        return <SecurityTipsSection />;
      default:
        return null;
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: theme.spacing.xxl }}
      >
        {/* Hero band with top bar + greeting. */}
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
          <HeroGreeting name={user?.fullName} />
        </View>

        {/* Personalised sections. QuickActions floats over the hero when first. */}
        <View style={{ paddingHorizontal: theme.spacing.md, gap: theme.spacing.lg }}>
          {home.sections.map((section, index) => {
            const isQuickFirst = section === 'quickActions' && index === 0;
            return (
              <SectionShell
                key={section}
                title={section === 'quickActions' ? undefined : sectionTitle[section]}
                why={home.explanations[section]}
                flush={isQuickFirst}
              >
                {renderBody(section)}
              </SectionShell>
            );
          })}

          <AppText role="caption" color="textMuted" center>
            Synthetic demo data • FlexBank is not affiliated with any bank.
          </AppText>
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * Wraps a section with an optional title and a "Why am I seeing this?" toggle
 * that reveals the explanation from the purpose engine.
 */
function SectionShell({
  title,
  why,
  flush,
  children,
}: {
  title?: string;
  why?: string;
  flush?: boolean;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const [showWhy, setShowWhy] = useState(false);

  return (
    <View style={{ gap: theme.spacing.sm, marginTop: flush ? 0 : undefined }}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <AppText role="heading" style={{ flex: 1 }}>
            {title}
          </AppText>
          {why ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Why am I seeing this?"
              onPress={() => setShowWhy((s) => !s)}
              hitSlop={8}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Icon name="info" size={15} color={theme.colors.accent} />
              <AppText role="caption" color="accent">
                Why?
              </AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {showWhy && why ? (
        <View
          style={{
            flexDirection: 'row',
            gap: theme.spacing.sm,
            backgroundColor: theme.colors.accentSoft,
            borderRadius: theme.radius.md,
            padding: theme.spacing.sm,
          }}
        >
          <Icon name="info" size={15} color={theme.colors.accent} />
          <AppText role="caption" color="textSecondary" style={{ flex: 1 }}>
            {why}
          </AppText>
        </View>
      ) : null}

      {children}
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

function HeroGreeting({ name }: { name?: string }) {
  const theme = useTheme();
  const greeting = timeGreeting();
  const firstName = name?.split(' ')[0];

  return (
    <View style={{ gap: theme.spacing.xs }}>
      <AppText role="body" style={{ color: theme.colors.heroArtTint }}>
        {greeting}
      </AppText>
      <AppText role="title" style={{ color: theme.colors.onHero }}>
        {firstName ? `Welcome back, ${firstName}` : 'Welcome back'}
      </AppText>
      <AppText role="body" style={{ color: theme.colors.heroArtTint }}>
        Here is your money at a glance.
      </AppText>
    </View>
  );
}

function timeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
