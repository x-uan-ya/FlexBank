# Financial calendar

Shows bills, income, savings and reminders by date (More > Financial calendar). Synthetic data only; it never moves money.

- `calendar.ts` is pure logic (dates as `YYYY-MM-DD`, weekly / monthly repeats, month totals). Tested in `tests/calendar.test.cjs`.
- `useCalendar.ts` saves events on the device (`calendar:<userId>`). Sample events show until the customer changes something.
- Monthly events on the 29th to 31st move to the last day of shorter months.
- Limits: 100 events per customer, 62-day range per request.

## Keep in step with the backend
`backend/src/calendar.ts` holds the same date logic. Parity tests in `tests/calendar.test.cjs` fail if the two drift apart.

## Connecting to the backend later
Swap the storage in `useCalendar.ts` for `GET /api/calendar?from&to` and `POST/PUT/DELETE /api/calendar/events`. The database needs `supabase/migrations/02_quick_actions_and_calendar.sql` (run after 01).
