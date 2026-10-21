import { Pressable, ScrollView, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AppCard, AppText, Divider, Icon, Pill, type IconName } from '@/components';
import {
  MOCK_ACCOUNTS,
  MOCK_GOALS,
  MOCK_SECURITY_TIPS,
  MOCK_SPENDING,
  MOCK_TRANSACTION_HISTORY,
} from '@/data';
import { useTheme, type Theme } from '@/theme';
import { formatMoney } from '@/utils';

import type { HomeConfig } from '../personalisationRules';

/**
 * Presentational home sections. Each is a small, reusable piece the HomeScreen
 * composes in the order chosen by the deterministic personalisation rules.
 * They read `config` for verbosity / contextual help but contain NO rules
 * themselves (presentation only).
 */

interface SectionProps {
  config: HomeConfig;
  balanceHidden: boolean;
  onToggleBalance: () => void;
}

/* ----------------------------- Quick actions ----------------------------- */

const QUICK_ACTIONS: {
  id: string;
  label: string;
  icon: IconName;
  href: Href;
  help: string;
}[] = [
  { id: 'paynow', label: 'PayNow', icon: 'paynow', href: '/paynow', help: 'Send money instantly' },
  { id: 'scan', label: 'Scan & Pay', icon: 'scan', href: '/scan', help: 'Pay by scanning a code' },
  { id: 'bills', label: 'Bill Payment', icon: 'bill', href: '/bills', help: 'Pay a bill' },
];

export function QuickActionsPanel({ config, overlap = true }: SectionProps & { overlap?: boolean }) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.xl,
        borderWidth: theme.clarity ? 2 : 1,
        borderColor: theme.clarity ? theme.colors.borderStrong : theme.colors.border,
        padding: theme.spacing.md,
        // Float over the hero only when this panel sits at the very top.
        marginTop: overlap ? -theme.spacing.xl : 0,
        ...(theme.clarity ? theme.shadows.none : theme.shadows.lg),
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            accessibilityHint={action.help}
            onPress={() => router.push(action.href)}
            style={({ pressed }) => [
              { flex: 1, alignItems: 'center', gap: theme.spacing.xs, paddingVertical: theme.spacing.xs },
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <Icon
              name={action.icon}
              size={22}
              color={theme.colors.primary}
              circle
              circleColor={theme.colors.accentSoft}
              circleSize={52}
            />
            <AppText role="label" center>
              {action.label}
            </AppText>
            {config.showContextualHelp ? (
              <AppText role="caption" color="textMuted" center>
                {action.help}
              </AppText>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ------------------------------ Categories ------------------------------- */

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'cards', label: 'Cards' },
  { id: 'investments', label: 'Investments' },
  { id: 'loans', label: 'Loans' },
];

export function CategoryTabs({
  active,
  onChange,
}: {
  active: string;
  onChange: (id: string) => void;
}) {
  const theme = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: theme.spacing.sm, paddingVertical: theme.spacing.xs }}
    >
      {CATEGORIES.map((cat) => (
        <Pill
          key={cat.id}
          label={cat.label}
          active={active === cat.id}
          onPress={() => onChange(cat.id)}
        />
      ))}
    </ScrollView>
  );
}

/* ------------------------------- Accounts -------------------------------- */

export function AccountsSection({ balanceHidden, onToggleBalance, config }: SectionProps) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <SectionBlock
      title="Your accounts"
      help={config.showContextualHelp ? 'Tap an account to see details.' : undefined}
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={balanceHidden ? 'Show balances' : 'Hide balances'}
          onPress={onToggleBalance}
          hitSlop={10}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Icon name={balanceHidden ? 'eyeOff' : 'eye'} size={18} color={theme.colors.textSecondary} />
          <AppText role="label" color="textSecondary">
            {balanceHidden ? 'Show' : 'Hide'}
          </AppText>
        </Pressable>
      }
    >
      <View style={{ gap: theme.spacing.sm }}>
        {MOCK_ACCOUNTS.map((account) => (
          <Pressable
            key={account.id}
            accessibilityRole="button"
            accessibilityLabel={`${account.name}, ${
              balanceHidden ? 'balance hidden' : formatMoney(account.balance, account.currency)
            }`}
            onPress={() => router.push('/paynow')}
            style={({ pressed }) => (pressed ? { opacity: 0.9 } : null)}
          >
            <AppCard>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
                <Icon
                  name="accounts"
                  size={20}
                  color={theme.colors.primary}
                  circle
                  circleColor={theme.colors.accentSoft}
                  circleSize={44}
                />
                <View style={{ flex: 1 }}>
                  <AppText role="subheading">{account.name}</AppText>
                  <AppText role="caption" color="textMuted">
                    {account.maskedNumber}
                  </AppText>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <AppText role="heading">
                    {balanceHidden ? '••••••' : formatMoney(account.balance, account.currency)}
                  </AppText>
                  <AppText role="caption" color="textMuted">
                    Available
                  </AppText>
                </View>
              </View>
            </AppCard>
          </Pressable>
        ))}
      </View>
    </SectionBlock>
  );
}

/* ------------------------------- Spending -------------------------------- */

export function SpendingSection({ balanceHidden, config }: SectionProps) {
  const theme = useTheme();
  const { month, total, categories } = MOCK_SPENDING;

  return (
    <SectionBlock
      title="Spending insights"
      help={config.showContextualHelp ? `A summary of your ${month} spending.` : undefined}
    >
      <AppCard>
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <AppText role="label" color="textSecondary">
              {month} total
            </AppText>
            <AppText role="heading">{balanceHidden ? '••••••' : formatMoney(total)}</AppText>
          </View>
          <Divider />
          <View style={{ gap: theme.spacing.sm }}>
            {categories.map((cat) => (
              <View key={cat.id} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText role="body">{cat.label}</AppText>
                  <AppText role="bodyStrong">
                    {balanceHidden ? '•••' : formatMoney(cat.amount)}
                  </AppText>
                </View>
                <BarMeter fraction={cat.share} theme={theme} />
              </View>
            ))}
          </View>
        </View>
      </AppCard>
    </SectionBlock>
  );
}

/* --------------------------------- Goals --------------------------------- */

export function GoalsSection({ balanceHidden, config }: SectionProps) {
  const theme = useTheme();
  return (
    <SectionBlock
      title="Savings goals"
      help={config.showContextualHelp ? 'Track progress towards what matters.' : undefined}
    >
      <View style={{ gap: theme.spacing.sm }}>
        {MOCK_GOALS.map((goal) => {
          const fraction = Math.min(1, goal.saved / goal.target);
          return (
            <AppCard key={goal.id}>
              <View style={{ gap: theme.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                  <Icon
                    name="goal"
                    size={18}
                    color={theme.colors.primary}
                    circle
                    circleColor={theme.colors.accentSoft}
                    circleSize={40}
                  />
                  <AppText role="subheading" style={{ flex: 1 }}>
                    {goal.label}
                  </AppText>
                  <AppText role="label" color="textSecondary">
                    {Math.round(fraction * 100)}%
                  </AppText>
                </View>
                <BarMeter fraction={fraction} theme={theme} />
                <AppText role="caption" color="textMuted">
                  {balanceHidden
                    ? 'Progress hidden'
                    : `${formatMoney(goal.saved)} of ${formatMoney(goal.target)}`}
                </AppText>
              </View>
            </AppCard>
          );
        })}
      </View>
    </SectionBlock>
  );
}

/* ----------------------------- Transactions ------------------------------ */

export function TransactionsSection({ balanceHidden, config }: SectionProps) {
  const theme = useTheme();
  return (
    <SectionBlock
      title="Recent activity"
      help={config.showContextualHelp ? 'Your latest simulated transfers.' : undefined}
    >
      <AppCard>
        {MOCK_TRANSACTION_HISTORY.map((txn, index) => (
          <View key={txn.id}>
            {index > 0 ? <Divider /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.xs }}>
              <Icon
                name="transfer"
                size={18}
                color={theme.colors.textSecondary}
                circle
                circleColor={theme.colors.surfaceMuted}
                circleSize={40}
              />
              <View style={{ flex: 1 }}>
                <AppText role="body">{txn.recipientName}</AppText>
                <AppText role="caption" color="textMuted">
                  {txn.recipientBank} {txn.recipientIdentifier}
                </AppText>
              </View>
              <AppText role="bodyStrong">
                {balanceHidden ? '•••' : `- ${formatMoney(txn.amount, txn.currency)}`}
              </AppText>
            </View>
          </View>
        ))}
      </AppCard>
    </SectionBlock>
  );
}

/* ------------------------------- Security -------------------------------- */

export function SecuritySection({ config }: SectionProps) {
  const theme = useTheme();
  // In minimal chrome (quick, no guidance) show a single compact reminder.
  const tips = config.minimalChrome ? MOCK_SECURITY_TIPS.slice(0, 1) : MOCK_SECURITY_TIPS;

  return (
    <SectionBlock title="Stay safe">
      <View style={{ gap: theme.spacing.sm }}>
        {tips.map((tip) => (
          <AppCard key={tip.id} style={{ borderColor: theme.colors.warning }}>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
              <Icon name="shield" size={18} color={theme.colors.warning} />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText role="bodyStrong">{tip.title}</AppText>
                {!config.minimalChrome ? (
                  <AppText role="caption" color="textSecondary">
                    {tip.body}
                  </AppText>
                ) : null}
              </View>
            </View>
          </AppCard>
        ))}
      </View>
    </SectionBlock>
  );
}

/* ------------------------------- Helpers --------------------------------- */

function SectionBlock({
  title,
  help,
  action,
  children,
}: {
  title: string;
  help?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <AppText role="heading">{title}</AppText>
          {help ? (
            <AppText role="caption" color="textSecondary">
              {help}
            </AppText>
          ) : null}
        </View>
        {action}
      </View>
      {children}
    </View>
  );
}

function BarMeter({ fraction, theme }: { fraction: number; theme: Theme }) {
  return (
    <View
      style={{
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.surfaceMuted,
        overflow: 'hidden',
      }}
    >
      <View
        style={{
          width: `${Math.max(0, Math.min(1, fraction)) * 100}%`,
          height: '100%',
          backgroundColor: theme.colors.accent,
          borderRadius: 4,
        }}
      />
    </View>
  );
}
