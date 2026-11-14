/**
 * Financial calendar: the customer's own reminders for money coming in and going out
 * (bills, income, savings, other reminders), by date.
 *
 * Rules:
 * - These are REMINDERS and plans only. Nothing here moves money. Paying a bill
 *   still goes through the normal flow, where only the customer's own press on
 *   Confirm sends anything.
 * - Dates are plain "YYYY-MM-DD" text, so there are no time-zone surprises.
 * - A repeating event is stored once and "expanded" into dates when asked for a range.
 * - The app keeps a matching copy of the date logic (src/features/calendar/calendar.ts).
 */

export const EVENT_KINDS = ['bill', 'income', 'savings', 'reminder'] as const;
export const EVENT_REPEATS = ['none', 'weekly', 'monthly'] as const;

export type EventKind = (typeof EVENT_KINDS)[number];
export type EventRepeat = (typeof EVENT_REPEATS)[number];

export const MAX_EVENTS_PER_USER = 100;
/** The longest date range one request can ask for (a little over two months). */
export const MAX_RANGE_DAYS = 62;
export const MAX_AMOUNT = 1_000_000;

/** What the customer fills in. `date` is the first date; repeating events carry on from it. */
export interface EventInput {
  title: string;
  kind: EventKind;
  amount?: number;
  date: string;
  repeat: EventRepeat;
  note?: string;
}

/** One event on one date, as shown in the calendar. */
export interface Occurrence {
  eventId: string;
  title: string;
  kind: EventKind;
  amount?: number;
  /** The date this occurrence falls on. */
  date: string;
  /** The first date of the event (what the customer edits). */
  startDate: string;
  repeat: EventRepeat;
  note?: string;
}

export interface CalendarSummary {
  currency: 'SGD';
  billsTotal: number;
  incomeTotal: number;
  savingsTotal: number;
  /** Income minus bills minus savings for the dates asked for. */
  leftover: number;
  count: number;
}

/* ------------------------------- Dates ---------------------------------- */

interface Ymd {
  y: number;
  m: number; // 1 to 12
  d: number;
}

const DAY_MS = 86_400_000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const daysInMonth = (y: number, m: number): number => new Date(Date.UTC(y, m, 0)).getUTCDate();
const dayNumber = ({ y, m, d }: Ymd): number => Math.floor(Date.UTC(y, m - 1, d) / DAY_MS);
const pad = (n: number, width: number): string => String(n).padStart(width, '0');

export function formatDate({ y, m, d }: Ymd): string {
  return `${pad(y, 4)}-${pad(m, 2)}-${pad(d, 2)}`;
}

function fromDayNumber(n: number): Ymd {
  const date = new Date(n * DAY_MS);
  return { y: date.getUTCFullYear(), m: date.getUTCMonth() + 1, d: date.getUTCDate() };
}

/** Returns the parts of a real calendar date between 2000 and 2100, otherwise undefined. */
export function parseDate(value: unknown): Ymd | undefined {
  if (typeof value !== 'string') return undefined;
  const match = DATE_PATTERN.exec(value);
  if (!match) return undefined;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > daysInMonth(y, m)) return undefined;
  return { y, m, d };
}

/** Today's date in UTC as "YYYY-MM-DD" (used for demo data). */
export const todayAsDate = (now: Date = new Date()): Ymd => ({
  y: now.getUTCFullYear(),
  m: now.getUTCMonth() + 1,
  d: now.getUTCDate(),
});

export const addDays = (date: Ymd, days: number): Ymd => fromDayNumber(dayNumber(date) + days);

/* ----------------------------- Validation -------------------------------- */

const round2 = (n: number): number => Math.round(n * 100) / 100;
const hasTooManyDecimals = (n: number): boolean => Math.abs(n * 100 - Math.round(n * 100)) > 1e-6;

function oneOf<T extends string>(allowed: readonly T[], value: unknown): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

export type EventInputResult =
  | { ok: true; value: EventInput }
  | { ok: false; fields: Record<string, string> };

/** Checks what the customer typed. Every message is written for the customer. */
export function readEventInput(raw: unknown): EventInputResult {
  const body = raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const fields: Record<string, string> = {};

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (title.length < 1 || title.length > 60) {
    fields.title = 'Enter a name for this event (up to 60 characters).';
  }

  const kind = oneOf(EVENT_KINDS, body.kind);
  if (!kind) {
    fields.kind = 'Choose bill, income, savings or reminder.';
  }

  let amount: number | undefined;
  if (body.amount !== undefined && body.amount !== null && body.amount !== '') {
    if (typeof body.amount !== 'number' || !Number.isFinite(body.amount)) {
      fields.amount = 'Enter a valid amount.';
    } else if (body.amount <= 0) {
      fields.amount = 'Enter an amount above S$0.00, or leave it empty.';
    } else if (hasTooManyDecimals(body.amount)) {
      fields.amount = 'Use at most 2 decimal places, for example 12.50.';
    } else if (body.amount > MAX_AMOUNT) {
      fields.amount = `For this demo the limit is S$${MAX_AMOUNT.toLocaleString('en-US')}.`;
    } else {
      amount = round2(body.amount);
    }
  }

  const date = parseDate(body.date);
  if (!date) {
    fields.date = 'Enter a real date, for example 2026-12-25.';
  }

  const repeat = body.repeat === undefined ? 'none' : oneOf(EVENT_REPEATS, body.repeat);
  if (!repeat) {
    fields.repeat = 'Choose once, every week or every month.';
  }

  let note: string | undefined;
  if (body.note !== undefined && body.note !== null) {
    if (typeof body.note !== 'string' || body.note.trim().length > 200) {
      fields.note = 'Keep the note under 200 characters.';
    } else if (body.note.trim()) {
      note = body.note.trim();
    }
  }

  if (Object.keys(fields).length > 0 || !kind || !date || !repeat) {
    return { ok: false, fields };
  }
  return {
    ok: true,
    value: {
      title,
      kind,
      ...(amount !== undefined ? { amount } : {}),
      date: formatDate(date),
      repeat,
      ...(note ? { note } : {}),
    },
  };
}

export type RangeResult = { ok: true; from: string; to: string } | { ok: false; message: string };

/** Checks the "from" and "to" dates of a calendar request. */
export function readRange(from: unknown, to: unknown): RangeResult {
  const start = parseDate(from);
  const end = parseDate(to);
  if (!start || !end) {
    return { ok: false, message: 'Choose a start and end date, for example 2026-12-01.' };
  }
  const span = dayNumber(end) - dayNumber(start) + 1;
  if (span < 1) {
    return { ok: false, message: 'The end date must not be before the start date.' };
  }
  if (span > MAX_RANGE_DAYS) {
    return { ok: false, message: 'Please look at about two months at a time.' };
  }
  return { ok: true, from: formatDate(start), to: formatDate(end) };
}

/* ----------------------------- Expansion --------------------------------- */

interface EventLike extends EventInput {
  id: string;
}

/**
 * Turns saved events into the dates that fall between `from` and `to` (both included).
 * Monthly events keep their day of the month, and on shorter months they fall on the
 * last day (the 31st becomes the 28th, 29th or 30th). Sorted by date, then name.
 */
export function expandEvents(events: readonly EventLike[], from: string, to: string): Occurrence[] {
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
      // Walk the months the range touches. Dates before the event's first date are skipped below.
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
    currency: 'SGD',
    billsTotal: round2(bills),
    incomeTotal: round2(income),
    savingsTotal: round2(savings),
    leftover: round2(income - bills - savings),
    count: occurrences.length,
  };
}

/* ------------------------------ Demo data -------------------------------- */

/**
 * Synthetic example events for the demo customers, dated around "today" so the
 * calendar is never empty on demo day. Nothing here is real.
 */
export function demoEvents(now: Date = new Date()): EventInput[] {
  const today = todayAsDate(now);
  const previousMonth: Ymd = today.m === 1 ? { y: today.y - 1, m: 12, d: 1 } : { y: today.y, m: today.m - 1, d: 1 };
  const onDay = (day: number): string =>
    formatDate({ y: previousMonth.y, m: previousMonth.m, d: Math.min(day, daysInMonth(previousMonth.y, previousMonth.m)) });
  return [
    { title: 'Salary', kind: 'income', amount: 3200, date: onDay(25), repeat: 'monthly', note: 'Sample entry for the demo.' },
    { title: 'Phone bill', kind: 'bill', amount: 38.9, date: onDay(12), repeat: 'monthly' },
    { title: 'Credit card payment', kind: 'bill', amount: 250, date: onDay(20), repeat: 'monthly' },
    { title: 'Savings top-up', kind: 'savings', amount: 200, date: onDay(1), repeat: 'monthly' },
    { title: 'Car insurance renewal', kind: 'reminder', date: formatDate(addDays(today, 10)), repeat: 'none' },
  ];
}
