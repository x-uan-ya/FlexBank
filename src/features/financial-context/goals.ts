import type { Goal } from '@/features/plan/goals';
import { savedAmount } from '@/features/savings/logic';
import type { SavingsPocket } from '@/features/savings/types';

import type { GoalCoachingResult, GoalContextRecord } from './types';

const AVERAGE_DAYS_PER_MONTH = 365.2425 / 12;
const DAY_MS = 24 * 60 * 60 * 1000;

export function goalContextFromPlanGoal(
  goal: Goal,
  targetDate?: string | null,
): GoalContextRecord {
  return {
    id: goal.id,
    name: goal.name,
    target: goal.target,
    saved: goal.saved,
    monthlyContribution: goal.monthly,
    targetDate,
    sourceRecordIds: [goal.id],
  };
}

/**
 * Adapts Xuan Ya's pocket record without changing its contract. Contribution
 * history is averaged across observed contribution months; no history means 0.
 */
export function goalContextFromSavingsPocket(pocket: SavingsPocket): GoalContextRecord {
  const validContributions = pocket.contributions.filter(
    (item) => Number.isFinite(item.amount) && item.amount > 0 && validDate(item.at),
  );
  const contributionMonths = new Set(
    validContributions.map((item) => item.at.slice(0, 7)),
  );
  const contributed = validContributions.reduce((sum, item) => sum + item.amount, 0);
  return {
    id: pocket.id,
    name: pocket.name,
    target: pocket.target,
    saved: savedAmount(pocket),
    monthlyContribution:
      contributionMonths.size === 0 ? 0 : roundMoney(contributed / contributionMonths.size),
    targetDate: pocket.targetDate,
    synthetic: pocket.demo,
    sourceRecordIds: [pocket.id, ...validContributions.map((item) => item.id)],
  };
}

export function calculateGoalCoaching(
  goal: GoalContextRecord,
  asOf: string | Date,
): GoalCoachingResult {
  const invalidReasons: string[] = [];
  if (!Number.isFinite(goal.target) || goal.target <= 0) {
    invalidReasons.push('Target must be a finite amount greater than zero.');
  }
  if (!Number.isFinite(goal.saved) || goal.saved < 0) {
    invalidReasons.push('Saved amount must be a finite non-negative amount.');
  }
  if (!Number.isFinite(goal.monthlyContribution) || goal.monthlyContribution < 0) {
    invalidReasons.push('Monthly contribution must be a finite non-negative amount.');
  }
  const asOfDate = parseDate(asOf);
  if (!asOfDate) invalidReasons.push('As-of date must be valid.');

  if (invalidReasons.length > 0) {
    return {
      valid: false,
      completionPercentage: 0,
      remainingAmount: 0,
      estimatedMonthsToGoal: null,
      requiredMonthlySaving: null,
      monthsUntilTarget: null,
      targetDateStatus: goal.targetDate ? 'invalid' : 'missing',
      invalidReasons,
    };
  }

  const targetAmount = goal.target;
  const saved = goal.saved;
  const remainingAmount = roundMoney(Math.max(0, targetAmount - saved));
  const completionPercentage = Math.round(
    Math.max(0, Math.min(100, (saved / targetAmount) * 100)) * 10,
  ) / 10;
  const estimatedMonthsToGoal =
    remainingAmount === 0
      ? 0
      : goal.monthlyContribution > 0
        ? Math.ceil(remainingAmount / goal.monthlyContribution)
        : null;

  const targetWindow = targetDateWindow(goal.targetDate, asOfDate!);
  return {
    valid: true,
    completionPercentage,
    remainingAmount,
    estimatedMonthsToGoal,
    requiredMonthlySaving:
      remainingAmount === 0
        ? 0
        : targetWindow.months === null
          ? null
          : roundMoney(remainingAmount / targetWindow.months),
    monthsUntilTarget: targetWindow.months,
    targetDateStatus: targetWindow.status,
    invalidReasons,
  };
}

function targetDateWindow(
  targetDate: string | null | undefined,
  asOf: Date,
): { months: number | null; status: GoalCoachingResult['targetDateStatus'] } {
  if (!targetDate) return { months: null, status: 'missing' };
  const parsed = parseDate(targetDate);
  if (!parsed) return { months: null, status: 'invalid' };
  const milliseconds = parsed.getTime() - asOf.getTime();
  if (milliseconds <= 0) return { months: null, status: 'passed' };
  const months = Math.max(1, Math.ceil(milliseconds / DAY_MS / AVERAGE_DAYS_PER_MONTH));
  return { months, status: 'valid' };
}

function parseDate(value: string | Date): Date | null {
  const parsed = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function validDate(value: string): boolean {
  return parseDate(value) !== null;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
