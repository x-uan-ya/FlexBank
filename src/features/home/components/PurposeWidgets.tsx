import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppButton, AppCard, AppText } from '@/components';
import { MOCK_SPENDING } from '@/data';
import {
  SEED_GOALS,
  goalPercent,
  goalsKey,
  monthsFromNowLabel,
  monthsToGoal,
  type Goal,
} from '@/features/plan/goals';
import { ProgressBar } from '@/features/plan/ProgressBar';
import { useCurrentUser } from '@/features/shell/useCurrentUser';
import { usePersistedState } from '@/features/shell/usePersistedState';
import { usePreferences } from '@/state';
import { useTheme } from '@/theme';
import { BANKING_PURPOSE_LABELS, type BankingPurpose } from '@/types/preferences';
import { formatMoney } from '@/utils';

const MAX_SHOWN = 3;
const FD_PRINCIPAL = 10000;
const FD_RATE = 0.025; // demo rate, 2.5% a year, simple interest
const FD_TENURES = [6, 12, 24];

function SavingBody({ balanceHidden }: { balanceHidden: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const user = useCurrentUser();
  const [goals] = usePersistedState<Goal[]>(goalsKey(user.id), SEED_GOALS);
  const goal = goals[0];
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText role="heading">Your savings goal</AppText>
      {goal ? (
        <View style={{ gap: theme.spacing.xs }}>
          <AppText role="bodyStrong">{goal.name}</AppText>
          <AppText role="caption" color="textSecondary">
            {balanceHidden ? 'Amounts hidden' : `${formatMoney(goal.saved)} of ${formatMoney(goal.target)} saved`} · {goalPercent(goal)}%
          </AppText>
          <ProgressBar percent={goalPercent(goal)} label={`${goal.name} progress`} />
          {(() => {
            const months = monthsToGoal(goal.target, goal.saved, goal.monthly);
            return months !== null && months > 0 ? (
              <AppText role="caption" color="textMuted">
                Estimate: about {months} month{months === 1 ? '' : 's'}, around {monthsFromNowLabel(months)}.
              </AppText>
            ) : null;
          })()}
        </View>
      ) : (
        <AppText color="textSecondary">Set a savings goal to track your progress here.</AppText>
      )}
      <AppButton label={goal ? 'See goals' : 'Set a goal'} variant="secondary" fullWidth={false}
        onPress={() => router.push('/plan')} />
    </View>
  );
}

function FixedDepositBody() {
  const theme = useTheme();
  const router = useRouter();
  const [months, setMonths] = useState(12);
  const interest = FD_PRINCIPAL * FD_RATE * (months / 12);
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText role="heading">Fixed deposit estimate</AppText>
      <AppText color="textSecondary">
        A fixed deposit locks your money for a set time in return for a stated interest rate.
      </AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {FD_TENURES.map((m) => (
          <AppButton key={m} label={`${m} months`} variant={months === m ? undefined : 'secondary'}
            fullWidth={false} accessibilityState={{ selected: months === m }} onPress={() => setMonths(m)} />
        ))}
      </View>
      <AppText role="bodyStrong">
        {formatMoney(FD_PRINCIPAL)} for {months} months: about {formatMoney(interest)} interest
      </AppText>
      <AppText role="caption" color="textMuted">
        Matures around {monthsFromNowLabel(months)}. Demo rate of 2.5% a year with simple interest. Real rates and terms differ.
      </AppText>
      <AppButton label="Ask the concierge" variant="secondary" fullWidth={false} onPress={() => router.push('/concierge')} />
    </View>
  );
}

function InfoBody({ title, text, action }: { title: string; text: string; action: string }) {
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText role="heading">{title}</AppText>
      <AppText color="textSecondary">{text}</AppText>
      <AppButton label={action} variant="secondary" fullWidth={false} onPress={() => router.push('/concierge')} />
    </View>
  );
}

function EverydayBody() {
  const theme = useTheme();
  const router = useRouter();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText role="heading">Everyday banking</AppText>
      <AppText color="textSecondary">Pay someone with PayNow or pay a bill.</AppText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        <AppButton label="Pay & Transfer" fullWidth={false} onPress={() => router.push('/pay')} />
        <AppButton label="Bills" variant="secondary" fullWidth={false} onPress={() => router.push('/bills')} />
      </View>
    </View>
  );
}

function ManagingBody({ balanceHidden }: { balanceHidden: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const top = [...MOCK_SPENDING.categories].sort((a, b) => b.amount - a.amount)[0];
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText role="heading">This month's spending</AppText>
      <AppText role="bodyStrong">
        {balanceHidden ? 'Amounts hidden' : `Total ${formatMoney(MOCK_SPENDING.total)}`}
      </AppText>
      {top ? (
        <AppText role="caption" color="textSecondary">
          Biggest category: {top.label}{balanceHidden ? '' : ` (${formatMoney(top.amount)})`}
        </AppText>
      ) : null}
      <AppButton label="See spending in Plan" variant="secondary" fullWidth={false} onPress={() => router.push('/plan')} />
    </View>
  );
}

function PurposeBody({ purpose, balanceHidden }: { purpose: BankingPurpose; balanceHidden: boolean }) {
  switch (purpose) {
    case 'saving':
      return <SavingBody balanceHidden={balanceHidden} />;
    case 'fixedDeposits':
      return <FixedDepositBody />;
    case 'investments':
      return (
        <InfoBody
          title="How a bond works"
          text="A bond is a loan you make to a company or government. It usually pays a fixed amount, called a coupon, at regular times and returns your money at maturity. Returns are not guaranteed, and the price can fall if you sell early."
          action="Ask: what is a coupon payment?"
        />
      );
    case 'everyday':
      return <EverydayBody />;
    case 'managing':
      return <ManagingBody balanceHidden={balanceHidden} />;
    case 'learning':
      return (
        <InfoBody
          title="Learn the basics"
          text="Start with three ideas: a fixed deposit locks money for a set time, a bond is a loan you make, and an interest rate is the price of borrowing or saving."
          action="Ask the concierge"
        />
      );
  }
}

function PurposeCard({ purpose, balanceHidden }: { purpose: BankingPurpose; balanceHidden: boolean }) {
  const theme = useTheme();
  const router = useRouter();
  const [why, setWhy] = useState(false);
  return (
    <AppCard>
      <View style={{ gap: theme.spacing.sm }}>
        <PurposeBody purpose={purpose} balanceHidden={balanceHidden} />
        <AppButton
          label={why ? 'Hide explanation' : 'Why am I seeing this?'}
          variant="ghost"
          fullWidth={false}
          accessibilityState={{ expanded: why }}
          onPress={() => setWhy((w) => !w)}
        />
        {why ? (
          <View style={{ gap: theme.spacing.sm }}>
            <AppText role="caption" color="textSecondary">
              You chose "{BANKING_PURPOSE_LABELS[purpose]}" as one of your banking purposes, so we show this near the top. It only changes what comes first. Nothing is hidden or locked.
            </AppText>
            <AppButton label="Change my purposes" variant="secondary" fullWidth={false} onPress={() => router.push('/purposes')} />
          </View>
        ) : null}
      </View>
    </AppCard>
  );
}

/** Purpose-based Home content. Uses only the customer's own explicit choices. */
export function PurposeWidgets({ balanceHidden }: { balanceHidden: boolean }) {
  const theme = useTheme();
  const preferences = usePreferences();
  const purposes = preferences.bankingPurposes ?? [];
  if (purposes.length === 0) return null;
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText role="heading" accessibilityRole="header">For what matters to you</AppText>
      {purposes.slice(0, MAX_SHOWN).map((purpose) => (
        <PurposeCard key={purpose} purpose={purpose} balanceHidden={balanceHidden} />
      ))}
      {purposes.length > MAX_SHOWN ? (
        <AppText role="caption" color="textSecondary">
          Showing your first {MAX_SHOWN} of {purposes.length} purposes. Change them in My banking purposes.
        </AppText>
      ) : null}
    </View>
  );
}