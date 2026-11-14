import type {
  CategoryChange,
  MonthlySpending,
  RecurringExpense,
  SpendingTransaction,
} from './types';

export function calculateMonthlySpending(
  transactions: SpendingTransaction[],
): MonthlySpending[] {
  const months = new Map<string, MonthlySpending>();

  validDebits(transactions).forEach((transaction) => {
    const month = monthKey(transaction.occurredAt);
    if (!month) return;
    const existing = months.get(month) ?? {
      month,
      total: 0,
      categoryTotals: {},
      transactionIds: [],
    };
    existing.total = roundMoney(existing.total + transaction.amount);
    existing.categoryTotals[transaction.category] = roundMoney(
      (existing.categoryTotals[transaction.category] ?? 0) + transaction.amount,
    );
    existing.transactionIds.push(transaction.id);
    months.set(month, existing);
  });

  return [...months.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Compare consecutive calendar months only; gaps are not described as month-to-month. */
export function calculateMonthToMonthChanges(
  monthly: MonthlySpending[],
): CategoryChange[] {
  const ordered = [...monthly].sort((a, b) => a.month.localeCompare(b.month));
  const changes: CategoryChange[] = [];

  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const current = ordered[index];
    if (!areConsecutiveMonths(previous.month, current.month)) continue;
    const categories = new Set([
      ...Object.keys(previous.categoryTotals),
      ...Object.keys(current.categoryTotals),
    ]);
    categories.forEach((category) => {
      const previousAmount = previous.categoryTotals[category] ?? 0;
      const currentAmount = current.categoryTotals[category] ?? 0;
      const absoluteChange = roundMoney(currentAmount - previousAmount);
      changes.push({
        category,
        fromMonth: previous.month,
        toMonth: current.month,
        previousAmount,
        currentAmount,
        absoluteChange,
        percentageChange:
          previousAmount === 0
            ? null
            : roundPercentage((absoluteChange / previousAmount) * 100),
        transactionIds: [...previous.transactionIds, ...current.transactionIds],
      });
    });
  }
  return changes;
}

/**
 * A recurring expense needs the same merchant, category and amount in at least
 * two distinct months. This intentionally favours evidence over guessing.
 */
export function detectRecurringExpenses(
  transactions: SpendingTransaction[],
  minimumMonths = 2,
): RecurringExpense[] {
  if (!Number.isInteger(minimumMonths) || minimumMonths < 2) return [];
  const groups = new Map<string, RecurringExpense>();

  validDebits(transactions).forEach((transaction) => {
    const month = monthKey(transaction.occurredAt);
    if (!month) return;
    const merchant = transaction.merchant.trim();
    const category = transaction.category.trim();
    if (!merchant || !category) return;
    const amount = roundMoney(transaction.amount);
    const key = `${merchant.toLocaleLowerCase()}|${category.toLocaleLowerCase()}|${amount}`;
    const group = groups.get(key) ?? {
      merchant,
      category,
      amount,
      months: [],
      transactionIds: [],
    };
    if (!group.months.includes(month)) group.months.push(month);
    group.transactionIds.push(transaction.id);
    groups.set(key, group);
  });

  return [...groups.values()]
    .filter((group) => group.months.length >= minimumMonths)
    .map((group) => ({ ...group, months: [...group.months].sort() }))
    .sort((a, b) => a.merchant.localeCompare(b.merchant));
}

function validDebits(transactions: SpendingTransaction[]): SpendingTransaction[] {
  return transactions.filter(
    (transaction) =>
      transaction.direction === 'debit' &&
      Number.isFinite(transaction.amount) &&
      transaction.amount > 0 &&
      transaction.category.trim().length > 0,
  );
}

function monthKey(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-\d{2}(?:T|$)/.exec(value);
  if (!match) return null;
  const month = Number(match[2]);
  return month >= 1 && month <= 12 ? `${match[1]}-${match[2]}` : null;
}

function areConsecutiveMonths(from: string, to: string): boolean {
  const [fromYear, fromMonth] = from.split('-').map(Number);
  const [toYear, toMonth] = to.split('-').map(Number);
  return toYear * 12 + toMonth === fromYear * 12 + fromMonth + 1;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function roundPercentage(value: number): number {
  return Math.round(value * 10) / 10;
}
