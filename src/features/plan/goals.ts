export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  monthly: number;
}

/** Synthetic starting goal so the demo is never empty. */
export const SEED_GOALS: Goal[] = [
  { id: 'g-emergency', name: 'Emergency fund', target: 5000, saved: 3250, monthly: 650 },
];

export const goalsKey = (userId: string) => `plan:goals:${userId}`;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Whole months needed, 0 if already reached, null if monthly is 0 or less. */
export function monthsToGoal(target: number, saved: number, monthly: number): number | null {
  const remaining = target - saved;
  if (remaining <= 0) return 0;
  if (monthly <= 0) return null;
  return Math.ceil(remaining / monthly);
}

export function monthsFromNowLabel(months: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function goalPercent(goal: Goal): number {
  if (goal.target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((goal.saved / goal.target) * 100)));
}

/** Text to number. Returns NaN for empty or invalid input. */
export function parseAmount(text: string): number {
  const cleaned = text.replace(/[,\s]/g, '').replace(/^S\$/i, '');
  if (cleaned === '') return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}