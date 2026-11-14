/**
 * Financial calendar logic: the customer's own reminders for money coming in and
 * going out (bills, income, savings, other reminders), by date.
 *
 * PURE and UI-free (no React, no storage), so it is easy to test.
 *
 * SAFETY: these are REMINDERS and plans only. Nothing here moves money, and
 * nothing here can start, approve or confirm a transfer.
 *
 * Dates are plain "YYYY-MM-DD" text, so there are no time-zone surprises. A
 * repeating event is stored once and expanded into dates when a range is asked
 * for. The backend keeps matching logic in backend/src/calendar.ts.
 */

export type EventKind = 'bill' | 'income' | 'savings' | 'reminder';
export type EventRepeat = 'none' | 'weekly' | 'monthly';

export const EVENT_KINDS: readonly EventKind[] = ['bill', 'income', 'savings', 'reminder'];
export const EVENT_REPEATS: readonly EventRepeat[] = ['none', 'weekly', 'monthly'];

export const EVENT_KIND_LABELS: Record<EventKind, string> = {
  bill: 'Bill',
  income: 'Income',
  savings: 'Savings',
  reminder: 'Reminder',
};

export const EVENT_REPEAT_LABELS: Record<EventRepeat, string> = {
  none: 'Once',
  weekly: 'Every week',
  monthly: 'Every month',
};

export const MAX_EVENTS = 100;
export const MAX_AMOUNT = 1_000_000;

export interface CalendarEvent {
  id: string;
  title: string;
  kind: EventKind;
  amount?: number;
  /** The first date. Weekly and monthly events carry on from it. */
  date: string;
  repeat: EventRepeat;
  note?: string;
}

/** What the customer fills in (an event without its id). */
export type EventInput = Omit<CalendarEvent, 'id'>;

/** One event on one date. */
export interface Occurrence {
  eventId: string;
  title: string;
  kind: EventKind;
  amount?: number;
  /** The date this occurrence falls on. */
  date: string;
  /** The event's first date (what editing changes). */
  startDate: string;
  repeat: EventRepeat;
  note?: string;
}

export interface CalendarSummary {
  billsTotal: number;
  incomeTotal: number;
  savingsTotal: number;
  /** Income minus bills minus savings. */
  leftover: number;
  count: number;
}

/* ------------------------------- Dates ---------------------------------- */

export interface Ymd {
  y: number;
  m: number; // 1 to 12
  d: number;
}

const DAY_MS = 86_400_000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
export const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const daysInMonth = (y: number, m: number): number => new Date(Date.UTC(y, m, 0)).getUTCDate();
const dayNumber = ({ y, m, d }: Ymd): number => Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
const pad = (n: number, width: number): string => String(n).padStart(width, '0');

export function formatDate({ y, m, d }: Ymd): string {
  return `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;
}

function fromDayNumber(n: number): Ymd {
  const date = new Date(n * DAY_MS);
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

/** The parts of a real calendar date between 2000 and 2100, otherwise undefined. */
export function parseDate(value: unknown): Ymd | undefined {
  if (typeof value !== 'string') return undefined;
  const match = DATE_PATTERN.exec(value.trim());
  if (!match) return undefined;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return undefined;
  return { y, m, d };
}

/** Today on the customer's own device clock. */
export function localToday(now: Date = new Date()): Ymd {
  return { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() };
}

export const addDays = (date: Ymd, days: number): Ymd => fromDayNumber(dayNumber(date) + days);

/** 0 = Sunday ... 6 = Saturday. */
export const weekdayOf = ({ y, m, d }: Ymd): number => new Date(Date.UTC(y, m - 1, d)).getUTCDay();

/** "Friday 13 November" */
export function longDateLabel(date: string): string {
  const parts = parseDate(date);
  if (!parts) return date;
  return `${WEEKDAY_NAMES[weekdayOf(parts)]} ${parts.d} ${MONTH_NAMES[parts.m - 1]}`;
}

/** "13 Nov" */
export function shortDateLabel(date: string): string {
  const parts = parseDate(date);
  if (!parts) return date;
  return `${parts.d} ${MONTH_NAMES[parts.m - 1]?.slice(0, 3)}`;
}

/** The first and last day of a month as "YYYY-MM-DD". */
export function monthRange(y: number, m: number): { from: string; to: string } {
  return { from: formatDate({ y, m, d: 1 }), to: formatDate({ y, m, d: daysInMonth(y, m) }) };
}

/** The month before or after, rolling over the year. */
export function shiftMonth({ y, m }: { y: number; m: number }, by: -1 | 1): { y: number; m: number } {
  const next = m + by;
  if (next < 1) return { y: y - 1, m: 12 };
  if (next > 12) return { y: y + 1, m: 1 };
  return { y, m: next };
}

/**
 * A month as weeks (Sunday first). Each week has 7 entries: the date text, or
 * null for the blank squares before the 1st and after the last day.
 */
export function buildMonthGrid(y: number, m: number): Array<Array<string | null>> {
  const cells: Array<string | null> = [];
  for (let blank = 0; blank < weekdayOf({ y, m, d: 1 }); blank += 1) cells.push(null);
  for (let d = 1; d <= daysInMonth(y, m); d += 1) cells.push(formatDate({ y, m, d }));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: Array<Array<string | null>> = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/* ----------------------------- Expansion --------------------------------- */

/**
 * Turns saved events into the dates that fall between `from` and `to` (both
 * included). Monthly events keep their day of the month, and on shorter months
 * they fall on the last day (the 31st becomes the 28th, 29th or 30th).
 * Sorted by date, then name.
 */
export function expandEvents(events: readonly CalendarEvent[], from: string, to: string): Occurrence[] {
  const rangeStart = parseDate(from);
  const rangeEnd = parseDate(to);
  if (!rangeStart || !rangeEnd) return [];
  const fromN = dayNumber(rangeStart);
  const toN = dayNumber(rangeEnd);
  const out: Occurrence[] = [];

  for (const event of events) {
    const start = parseDate(event.date);
    if (!start) continue;
    const startN = dayNumber(start);
    const dates: Ymd[] = [];

    if (event.repeat === 'none') {
      if (startN >= fromN && startN <= toN) dates.push(start);
    } else if (event.repeat === 'weekly') {
      let n = startN >= fromN ? startN : startN + Math.ceil((fromN - startN) / 7) * 7;
      for (; n <= toN; n += 7) dates.push(fromDayNumber(n));
    } else {
      let y = rangeStart.y;
      let m = rangeStart.m;
      while (y < rangeEnd.y || (y === rangeEnd.y && m <= rangeEnd.m)) {
        const candidate: Ymd = { y, m, d: Math.min(start.d, daysInMonth(y, m)) };
        const n = dayNumber(candidate);
        if (n >= startN && n >= fromN && n <= toN) dates.push(candidate);
        m += 1;
        if (m > 12) {
          m = 1;
          y += 1;
        }
      }
    }

    for (const date of dates) {
      out.push({
        eventId: event.id,
        title: event.title,
        kind: event.kind,
        ...(event.amount !== undefined ? { amount: event.amount } : {}),
        date: formatDate(date),
        startDate: event.date,
        repeat: event.repeat,
        ...(event.note ? { note: event.note } : {}),
      });
    }
  }

  return out.sort((a, b) => (a.date === b.date ? a.title.localeCompare(b.title) : a.date < b.date ? -1 : 1));
}

const round2 = (n: number): number => Math.round(n * 100) / 100;

export function summarise(occurrences: readonly Occurrence[]): CalendarSummary {
  let bills = 0;
  let income = 0;
  let savings = 0;
  for (const item of occurrences) {
    if (item.amount === undefined) continue;
    if (item.kind === 'bill') bills += item.amount;
    else if (item.kind === 'income') income += item.amount;
    else if (item.kind === 'savings') savings += item.amount;
  }
  return {
    billsTotal: round2(bills),
    incomeTotal: round2(income),
    savingsTotal: round2(savings),
    leftover: round2(income - bills - savings),
    count: occurrences.length,
  };
}

/* ------------------------------ The form --------------------------------- */

/** What the customer has typed into the form (all text, nothing checked yet). */
export interface EventDraft {
  title: string;
  kind: EventKind | null;
  amountText: string;
  date: string;
  repeat: EventRepeat;
  note: string;
}

export type EventDraftErrors = Partial<Record<'title' | 'kind' | 'amount' | 'date' | 'note', string>>;

export type EventDraftResult = { ok: true; value: EventInput } | { ok: false; errors: EventDraftErrors };

const hasTooManyDecimals = (n: number): boolean => Math.abs(n * 100 - Math.round(n * 100)) > 1e-6;

/** Checks the form. Every message is written for the customer. */
export function validateEventDraft(draft: EventDraft): EventDraftResult {
  const errors: EventDraftErrors = {};

  const title = draft.title.trim();
  if (title.length < 1 || title.length > 60) {
    errors.title = 'Enter a name for this event (up to 60 characters).';
  }
  if (!draft.kind) {
    errors.kind = 'Choose bill, income, savings or reminder.';
  }

  let amount: number | undefined;
  const amountText = draft.amountText.trim().replace(/^S?\$/i, '').replace(/,/g, '').trim();
  if (amountText !== '') {
    const parsed = Number(amountText);
    if (!Number.isFinite(parsed)) {
      errors.amount = 'Enter a valid amount, for example 12.50.';
    } else if (parsed <= 0) {
      errors.amount = 'Enter an amount above S$0.00, or leave it empty.';
    } else if (hasTooManyDecimals(parsed)) {
      errors.amount = 'Use at most 2 decimal places, for example 12.50.';
    } else if (parsed > MAX_AMOUNT) {
      errors.amount = `For this demo the limit is S$${MAX_AMOUNT.toLocaleString('en-US')}.`;
    } else {
      amount = round2(parsed);
    }
  }

  const date = parseDate(draft.date);
  if (!date) {
    errors.date = 'Enter a real date like 2026-12-25 (year, month, day).';
  }

  const note = draft.note.trim();
  if (note.length > 200) {
    errors.note = 'Keep the note under 200 characters.';
  }

  if (Object.keys(errors).length > 0 || !draft.kind || !date) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    value: {
      title,
      kind: draft.kind,
      ...(amount !== undefined ? { amount } : {}),
      date: formatDate(date),
      repeat: draft.repeat,
      ...(note ? { note } : {}),
    },
  };
}

/** A fresh id for an event made on this device. */
export function newEventId(): string {
  return `evt-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/* ------------------------------ Demo data -------------------------------- */

/**
 * Synthetic example events, dated around today so the calendar is never empty
 * on demo day. They show until the customer changes anything. Nothing here is real.
 */
export function sampleEvents(today: Ymd = localToday()): CalendarEvent[] {
  const previous = today.m === 1 ? { y: today.y - 1, m: 12 } : { y: today.y, m: today.m - 1 };
  const onDay = (day: number): string =>
    formatDate({ ...previous, d: Math.min(day, daysInMonth(previous.y, previous.m)) });
  return [
    { id: 'sample-salary', title: 'Salary', kind: 'income', amount: 3200, date: onDay(25), repeat: 'monthly', note: 'Sample entry for the demo.' },
    { id: 'sample-phone', title: 'Phone bill', kind: 'bill', amount: 38.9, date: onDay(12), repeat: 'monthly' },
    { id: 'sample-card', title: 'Credit card payment', kind: 'bill', amount: 250, date: onDay(20), repeat: 'monthly' },
    { id: 'sample-savings', title: 'Savings top-up', kind: 'savings', amount: 200, date: onDay(1), repeat: 'monthly' },
    { id: 'sample-insurance', title: 'Car insurance renewal', kind: 'reminder', date: formatDate(addDays(today, 10)), repeat: 'none' },
  ];
}
