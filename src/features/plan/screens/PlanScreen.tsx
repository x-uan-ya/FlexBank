import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import {
  AppButton,
  AppCard,
  AppInput,
  AppText,
  Divider,
  Header,
  ScreenContainer,
} from '@/components';
import { MOCK_ACCOUNTS, MOCK_SPENDING } from '@/data';
import { useCurrentUser } from '@/features/shell/useCurrentUser';
import { usePersistedState } from '@/features/shell/usePersistedState';
import { useTheme } from '@/theme';
import { formatMoney } from '@/utils';

import {
  SEED_GOALS,
  goalPercent,
  goalsKey,
  monthsFromNowLabel,
  monthsToGoal,
  parseAmount,
  type Goal,
} from '../goals';
import { ProgressBar } from '../ProgressBar';

// Synthetic demo figures. No real data is connected.
const DEMO_MONTHLY_INCOME = 3200;
const DEMO_CARD_BALANCE = 420;
const EXTRA_OPTIONS = [0, 100, 200, 500];

function Section({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <AppText role="heading" accessibilityRole="header">
        {title}
      </AppText>
      {children}
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.md }}>
      <AppText role="body" color="textSecondary">
        {label}
      </AppText>
      <AppText role={strong ? 'bodyStrong' : 'body'} style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </AppText>
    </View>
  );
}

function SpendingBars() {
  const theme = useTheme();
  const categories = MOCK_SPENDING.categories;
  const total = categories.reduce((sum, c) => sum + c.amount, 0) || 1;
  return (
    <View style={{ gap: theme.spacing.sm }}>
      {categories.map((c) => (
        <View key={c.id} style={{ gap: theme.spacing.xs }}>
          <Row label={c.label} value={formatMoney(c.amount)} />
          <ProgressBar
            percent={Math.max(2, Math.round((c.amount / total) * 100))}
            label={`${c.label} share of spending`}
          />
        </View>
      ))}
    </View>
  );
}

function GoalCard({ goal, onRemove }: { goal: Goal; onRemove: () => void }) {
  const theme = useTheme();
  const [extra, setExtra] = useState(0);
  const percent = goalPercent(goal);
  const monthly = goal.monthly + extra;
  const months = monthsToGoal(goal.target, goal.saved, monthly);

  let estimate = 'Add a monthly amount to see an estimate.';
  if (months === 0) estimate = 'Goal reached.';
  else if (months !== null) {
    estimate = `At ${formatMoney(monthly)} a month: about ${months} month${months === 1 ? '' : 's'}, around ${monthsFromNowLabel(months)}.`;
  }

  return (
    <AppCard>
      <View style={{ gap: theme.spacing.sm }}>
        <AppText role="bodyStrong">{goal.name}</AppText>
        <AppText role="caption" color="textSecondary">
          {formatMoney(goal.saved)} of {formatMoney(goal.target)} saved · {percent}%
        </AppText>
        <ProgressBar percent={percent} label={`${goal.name} progress`} />
        <AppText role="body">{estimate}</AppText>
        <AppText role="caption" color="textMuted">
          Estimate only. It ignores interest and changes in your spending.
        </AppText>
        <AppText role="label" color="textSecondary">
          What if I save more each month?
        </AppText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
          {EXTRA_OPTIONS.map((option) => (
            <AppButton
              key={option}
              label={option === 0 ? 'As planned' : `+${formatMoney(option)}`}
              variant={extra === option ? undefined : 'secondary'}
              fullWidth={false}
              accessibilityState={{ selected: extra === option }}
              onPress={() => setExtra(option)}
            />
          ))}
        </View>
        <AppButton label="Remove goal" variant="ghost" fullWidth={false} onPress={onRemove} />
      </View>
    </AppCard>
  );
}

/**
 * Plan (Frontend). Synthetic overview, spending breakdown, savings goals and a
 * "what if" estimate. Goals are saved on this device for the signed-in user.
 */
export function PlanScreen() {
  const theme = useTheme();
  const user = useCurrentUser();
  const [goals, setGoals] = usePersistedState<Goal[]>(goalsKey(user.id), SEED_GOALS);

  const [name, setName] = useState('');
  const [targetText, setTargetText] = useState('');
  const [savedText, setSavedText] = useState('');
  const [monthlyText, setMonthlyText] = useState('');
  const [formError, setFormError] = useState('');

  const assets = MOCK_ACCOUNTS.reduce((sum, account) => sum + account.balance, 0);
  const spent = MOCK_SPENDING.total;
  const left = DEMO_MONTHLY_INCOME - spent;

  const draftTarget = parseAmount(targetText);
  const draftSaved = savedText.trim() === '' ? 0 : parseAmount(savedText);
  const draftMonthly = parseAmount(monthlyText);
  const draftMonths =
    draftTarget > 0 && draftSaved >= 0 && draftSaved <= draftTarget && draftMonthly > 0
      ? monthsToGoal(draftTarget, draftSaved, draftMonthly)
      : null;

  function addGoal() {
    if (!name.trim()) return setFormError('Give your goal a name.');
    if (!(draftTarget > 0)) return setFormError('Enter a target amount above S$0.');
    if (!(draftSaved >= 0) || draftSaved > draftTarget) {
      return setFormError('Saved so far must be between S$0 and your target.');
    }
    if (!(draftMonthly > 0)) return setFormError('Enter a monthly contribution above S$0.');
    setGoals([
      ...goals,
      { id: `g-${Date.now()}`, name: name.trim(), target: draftTarget, saved: draftSaved, monthly: draftMonthly },
    ]);
    setName('');
    setTargetText('');
    setSavedText('');
    setMonthlyText('');
    setFormError('');
  }

  return (
    <ScreenContainer scroll>
      <Header title="Plan" subtitle="Your money, goals and spending" />

      <Section title="Financial overview">
        <AppCard>
          <View style={{ gap: theme.spacing.sm }}>
            <Row label="Assets (demo accounts)" value={formatMoney(assets)} />
            <Row label="Liabilities (demo card)" value={formatMoney(DEMO_CARD_BALANCE)} />
            <Row label="Net worth" value={formatMoney(assets - DEMO_CARD_BALANCE)} strong />
            <Divider />
            <Row label="Income this month" value={formatMoney(DEMO_MONTHLY_INCOME)} />
            <Row label="Spending this month" value={formatMoney(spent)} />
            <Row label={left >= 0 ? 'Left over' : 'Over income by'} value={formatMoney(Math.abs(left))} strong />
          </View>
        </AppCard>
      </Section>

      <Section title="Where your money went">
        <AppCard>
          <SpendingBars />
        </AppCard>
      </Section>

      <Section title="Savings goals">
        {goals.length === 0 ? (
          <AppCard elevation="none">
            <AppText color="textSecondary">No goals yet. Add one below to see how long it could take.</AppText>
          </AppCard>
        ) : (
          goals.map((goal) => (
            <GoalCard key={goal.id} goal={goal} onRemove={() => setGoals(goals.filter((g) => g.id !== goal.id))} />
          ))
        )}
      </Section>

      <Section title="Add a goal">
        <AppCard>
          <View style={{ gap: theme.spacing.md }}>
            <AppInput label="Goal name" placeholder="e.g. Holiday fund" value={name}
              onChangeText={(t) => { setName(t); setFormError(''); }} />
            <AppInput label="Target amount (S$)" placeholder="5000" keyboardType="decimal-pad" value={targetText}
              onChangeText={(t) => { setTargetText(t); setFormError(''); }} />
            <AppInput label="Saved so far (S$)" placeholder="0" keyboardType="decimal-pad" value={savedText}
              onChangeText={(t) => { setSavedText(t); setFormError(''); }} />
            <AppInput label="Monthly contribution (S$)" placeholder="200" keyboardType="decimal-pad" value={monthlyText}
              onChangeText={(t) => { setMonthlyText(t); setFormError(''); }} />
            {draftMonths !== null ? (
              <AppText role="caption" color="textSecondary">
                {draftMonths === 0
                  ? 'Estimate: you have already reached this goal.'
                  : `Estimate: about ${draftMonths} month${draftMonths === 1 ? '' : 's'}, around ${monthsFromNowLabel(draftMonths)}.`}
              </AppText>
            ) : null}
            {formError ? (
              <View accessibilityRole="alert">
                <AppText role="caption" color="danger">{formError}</AppText>
              </View>
            ) : null}
            <AppButton label="Add goal" onPress={addGoal} />
          </View>
        </AppCard>
      </Section>

      <AppText role="caption" color="textMuted" center>
        Synthetic demo data. Estimates only, not financial advice.
      </AppText>
    </ScreenContainer>
  );
}