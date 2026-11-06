import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { AppCard, AppText, Divider, Icon, type IconName } from '@/components';
import {
  MOCK_ACCOUNTS,
  MOCK_BONDS,
  MOCK_BUDGET,
  MOCK_FD_RATES,
  MOCK_FIXED_DEPOSITS,
  MOCK_GOALS,
  MOCK_LEARNING,
  MOCK_PORTFOLIO,
  MOCK_SECURITY_TIPS,
  MOCK_SPENDING,
  MOCK_TRANSACTION_HISTORY,
} from '@/data';
import { useTheme } from '@/theme';
import { formatMoney, formatDate } from '@/utils';

/**
 * Purpose-driven home sections (presentational only).
 *
 * Each export renders one `PurposeSection`. The HomeScreen decides WHICH to
 * show and in WHAT ORDER (from the pure purposeEngine) and wraps each in a
 * "Why am I seeing this?" container. These components contain no ordering rules.
 *
 * `balanceHidden` hides monetary values behind an explicit show/hide action.
 */

interface Props {
  balanceHidden: boolean;
}

/* ------------------------------ Shared bits ------------------------------ */

function BarMeter({ fraction }: { fraction: number }) {
  const theme = useTheme();
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

function Row({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md, paddingVertical: 2 }}>
      <AppText role="body" color="textSecondary">
        {label}
      </AppText>
      <AppText role="bodyStrong" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

function hide(value: string, hidden: boolean): string {
  return hidden ? '••••••' : value;
}

/* -------------------------------- Savings -------------------------------- */

export function SavingsSection({ balanceHidden }: Props) {
  const theme = useTheme();
  const saver = MOCK_ACCOUNTS[0];
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppCard>
        <View style={{ gap: theme.spacing.sm }}>
          <Row label="Total saved" value={hide(formatMoney(saver.balance), balanceHidden)} />
          <Divider />
          {MOCK_GOALS.map((goal) => {
            const fraction = Math.min(1, goal.saved / goal.target);
            return (
              <View key={goal.id} style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <AppText role="body">{goal.label}</AppText>
                  <AppText role="label" color="textSecondary">
                    {Math.round(fraction * 100)}%
                  </AppText>
                </View>
                <BarMeter fraction={fraction} />
                <AppText role="caption" color="textMuted">
                  {balanceHidden
                    ? 'Progress hidden'
                    : `${formatMoney(goal.saved)} of ${formatMoney(goal.target)}`}
                </AppText>
              </View>
            );
          })}
          <View
            style={{
              flexDirection: 'row',
              gap: theme.spacing.sm,
              backgroundColor: theme.colors.accentSoft,
              borderRadius: theme.radius.md,
              padding: theme.spacing.sm,
              marginTop: theme.spacing.xs,
            }}
          >
            <Icon name="shield" size={16} color={theme.colors.accent} />
            <AppText role="caption" color="textSecondary" style={{ flex: 1 }}>
              Emergency fund tip: aim for 3–6 months of expenses kept easy to
              access.
            </AppText>
          </View>
        </View>
      </AppCard>
    </View>
  );
}

/* ----------------------------- Fixed deposits ---------------------------- */

export function FixedDepositsSection({ balanceHidden }: Props) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      {MOCK_FIXED_DEPOSITS.map((fd) => (
        <AppCard key={fd.id}>
          <View style={{ gap: theme.spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <AppText role="subheading">{fd.nickname}</AppText>
              <View
                style={{
                  backgroundColor: theme.colors.successSoft,
                  paddingHorizontal: theme.spacing.sm,
                  paddingVertical: 2,
                  borderRadius: theme.radius.pill,
                }}
              >
                <AppText role="label" color="success">
                  {fd.rate.toFixed(2)}% p.a.
                </AppText>
              </View>
            </View>
            <Row label="Principal" value={hide(formatMoney(fd.principal), balanceHidden)} />
            <Row label="Tenure" value={`${fd.tenureMonths} months`} />
            <Row label="Matures" value={formatDate(fd.maturityDate)} />
          </View>
        </AppCard>
      ))}

      <AppCard>
        <View style={{ gap: theme.spacing.xs }}>
          <AppText role="label" color="textSecondary">
            Indicative rates
          </AppText>
          {MOCK_FD_RATES.map((r) => (
            <Row key={r.tenureMonths} label={`${r.tenureMonths} months`} value={`${r.rate.toFixed(2)}% p.a.`} />
          ))}
          <AppText role="caption" color="textMuted">
            Example interest: S$10,000 at 3.25% for 12 months ≈ S$325 (synthetic).
          </AppText>
        </View>
      </AppCard>
    </View>
  );
}

/* --------------------------- Bonds & investments -------------------------- */

export function BondsSection({ balanceHidden }: Props) {
  const theme = useTheme();
  const gain = MOCK_PORTFOLIO.currentValue - MOCK_PORTFOLIO.investedValue;
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppCard>
        <View style={{ gap: theme.spacing.xs }}>
          <Row label="Portfolio value" value={hide(formatMoney(MOCK_PORTFOLIO.currentValue), balanceHidden)} />
          <Row
            label="Total return"
            value={balanceHidden ? '••••' : `${gain >= 0 ? '+' : ''}${formatMoney(gain)}`}
          />
        </View>
      </AppCard>

      {MOCK_BONDS.map((bond) => (
        <AppCard key={bond.id}>
          <View style={{ gap: theme.spacing.xs }}>
            <AppText role="subheading">{bond.name}</AppText>
            <Row label="Face value" value={hide(formatMoney(bond.faceValue), balanceHidden)} />
            <Row label="Coupon" value={`${bond.couponRate.toFixed(2)}% p.a.`} />
            <Row label="Next coupon" value={formatDate(bond.nextCouponDate)} />
            <Row label="Matures" value={formatDate(bond.maturityDate)} />
          </View>
        </AppCard>
      ))}

      <View
        style={{
          flexDirection: 'row',
          gap: theme.spacing.sm,
          backgroundColor: theme.colors.warningSoft,
          borderRadius: theme.radius.md,
          padding: theme.spacing.sm,
        }}
      >
        <Icon name="info" size={16} color={theme.colors.warning} />
        <AppText role="caption" color="textSecondary" style={{ flex: 1 }}>
          Investments can go up or down. A coupon is the regular interest a bond
          pays while you hold it. This is synthetic demo data, not advice.
        </AppText>
      </View>
    </View>
  );
}

/* ------------------------------- Everyday -------------------------------- */

export function EverydaySection({ balanceHidden }: Props) {
  const theme = useTheme();
  const router = useRouter();

  const actions: { label: string; icon: IconName; href: Href }[] = [
    { label: 'PayNow', icon: 'paynow', href: '/paynow' },
    { label: 'Transfer', icon: 'transfer', href: '/paynow' },
    { label: 'Pay bills', icon: 'bill', href: '/bills' },
  ];

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppCard>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {actions.map((a) => (
            <Pressable
              key={a.label}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              onPress={() => router.push(a.href)}
              style={({ pressed }) => [{ flex: 1, alignItems: 'center', gap: 6 }, pressed ? { opacity: 0.85 } : null]}
            >
              <Icon name={a.icon} size={20} color={theme.colors.primary} circle circleColor={theme.colors.accentSoft} circleSize={48} />
              <AppText role="label" center>
                {a.label}
              </AppText>
            </Pressable>
          ))}
        </View>
      </AppCard>

      <AppCard>
        <AppText role="label" color="textSecondary">
          Recent activity
        </AppText>
        {MOCK_TRANSACTION_HISTORY.map((txn, i) => (
          <View key={txn.id}>
            {i > 0 ? <Divider /> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingVertical: theme.spacing.xs }}>
              <Icon name="transfer" size={16} color={theme.colors.textSecondary} circle circleColor={theme.colors.surfaceMuted} circleSize={38} />
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
    </View>
  );
}

/* ---------------------------- Managing my money --------------------------- */

export function ManagingSection({ balanceHidden }: Props) {
  const theme = useTheme();
  const budgetFraction = Math.min(1, MOCK_BUDGET.spent / MOCK_BUDGET.limit);
  const overBudget = MOCK_BUDGET.spent > MOCK_BUDGET.limit;

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppCard>
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <AppText role="label" color="textSecondary">
              {MOCK_BUDGET.month} budget
            </AppText>
            <AppText role="bodyStrong" color={overBudget ? 'danger' : 'textPrimary'}>
              {balanceHidden
                ? '••••'
                : `${formatMoney(MOCK_BUDGET.spent)} / ${formatMoney(MOCK_BUDGET.limit)}`}
            </AppText>
          </View>
          <BarMeter fraction={budgetFraction} />
        </View>
      </AppCard>

      <AppCard>
        <View style={{ gap: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <AppText role="label" color="textSecondary">
              {MOCK_SPENDING.month} spending
            </AppText>
            <AppText role="heading">{hide(formatMoney(MOCK_SPENDING.total), balanceHidden)}</AppText>
          </View>
          <Divider />
          {MOCK_SPENDING.categories.map((cat) => (
            <View key={cat.id} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <AppText role="body">{cat.label}</AppText>
                <AppText role="bodyStrong">{balanceHidden ? '•••' : formatMoney(cat.amount)}</AppText>
              </View>
              <BarMeter fraction={cat.share} />
            </View>
          ))}
        </View>
      </AppCard>
    </View>
  );
}

/* -------------------------------- Learning ------------------------------- */

export function LearningSection() {
  const theme = useTheme();
  const [openId, setOpenId] = useState<string | null>(MOCK_LEARNING[0]?.id ?? null);

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {MOCK_LEARNING.map((item) => {
        const open = openId === item.id;
        return (
          <AppCard key={item.id}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={item.term}
              onPress={() => setOpenId(open ? null : item.id)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}
            >
              <Icon name="help" size={18} color={theme.colors.primary} circle circleColor={theme.colors.accentSoft} circleSize={40} />
              <AppText role="subheading" style={{ flex: 1 }}>
                {item.term}
              </AppText>
              <Icon name="chevron" size={20} color={theme.colors.textMuted} />
            </Pressable>
            {open ? (
              <AppText role="body" color="textSecondary" style={{ marginTop: theme.spacing.sm }}>
                {item.explanation}
              </AppText>
            ) : null}
          </AppCard>
        );
      })}
    </View>
  );
}

/* -------------------------------- Security ------------------------------- */

export function SecurityTipsSection() {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      {MOCK_SECURITY_TIPS.map((tip) => (
        <AppCard key={tip.id} style={{ borderColor: theme.colors.warning }}>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Icon name="shield" size={18} color={theme.colors.warning} />
            <View style={{ flex: 1, gap: 2 }}>
              <AppText role="bodyStrong">{tip.title}</AppText>
              <AppText role="caption" color="textSecondary">
                {tip.body}
              </AppText>
            </View>
          </View>
        </AppCard>
      ))}
    </View>
  );
}

/* -------------------------------- Accounts ------------------------------- */

export function AccountsCards({
  balanceHidden,
  onToggleBalance,
}: {
  balanceHidden: boolean;
  onToggleBalance: () => void;
}) {
  const theme = useTheme();
  const router = useRouter();

  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
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
      </View>
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
              <Icon name="accounts" size={20} color={theme.colors.primary} circle circleColor={theme.colors.accentSoft} circleSize={44} />
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
  );
}

/* ------------------------------ Quick actions ---------------------------- */

export function QuickActions({ overlap }: { overlap: boolean }) {
  const theme = useTheme();
  const router = useRouter();

  const actions: { id: string; label: string; icon: IconName; href: Href }[] = [
    { id: 'paynow', label: 'PayNow', icon: 'paynow', href: '/paynow' },
    { id: 'scan', label: 'Scan & Pay', icon: 'scan', href: '/scan' },
    { id: 'bills', label: 'Bill Payment', icon: 'bill', href: '/bills' },
  ];

  return (
    <View
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: theme.radius.xl,
        borderWidth: theme.clarity ? 2 : 1,
        borderColor: theme.clarity ? theme.colors.borderStrong : theme.colors.border,
        padding: theme.spacing.md,
        marginTop: overlap ? -theme.spacing.xl : 0,
        ...(theme.clarity ? theme.shadows.none : theme.shadows.lg),
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {actions.map((a) => (
          <Pressable
            key={a.id}
            accessibilityRole="button"
            accessibilityLabel={a.label}
            onPress={() => router.push(a.href)}
            style={({ pressed }) => [{ flex: 1, alignItems: 'center', gap: 6 }, pressed ? { opacity: 0.85 } : null]}
          >
            <Icon name={a.icon} size={22} color={theme.colors.primary} circle circleColor={theme.colors.accentSoft} circleSize={52} />
            <AppText role="label" center>
              {a.label}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
