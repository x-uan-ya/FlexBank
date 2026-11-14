-- FlexBank PostgreSQL schema, part 2: customisable quick actions and the
-- financial calendar. Apply AFTER 01_initial_schema.sql.
--
-- Like part 1, there are deliberately no anon/authenticated RLS policies: the
-- Expo app only talks to the trusted Express backend (using its own JWT), and
-- the backend reaches the database with the service_role key.
--
-- Nothing in these tables moves money. Quick actions are screen shortcuts and
-- calendar events are the customer's own reminders. All data is synthetic.

-- The shortcuts a customer chose for the top of their home screen, in order.
-- No row means "use the defaults built from their registration priorities".
-- The list of allowed ids lives in backend/src/quickActions.ts, so it can grow
-- without a database change; the backend checks every id before saving.
create table public.user_quick_actions (
  user_id text primary key references public.users (id) on delete cascade,
  action_ids text[] not null,
  updated_at timestamptz not null default now(),
  constraint user_quick_actions_count_check
    check (cardinality(action_ids) between 1 and 4)
);

-- A customer's own financial reminders. `event_date` is the first date;
-- weekly and monthly events carry on from it (the backend expands them).
create table public.calendar_events (
  id text primary key default ('evt-' || left(replace(gen_random_uuid()::text, '-', ''), 8)),
  user_id text not null references public.users (id) on delete cascade,
  title text not null,
  kind text not null,
  amount numeric(14, 2),
  event_date date not null,
  repeat text not null default 'none',
  note text,
  created_at timestamptz not null default now(),
  constraint calendar_events_id_format check (id ~ '^evt-[0-9a-f]{8}$'),
  constraint calendar_events_title_length check (char_length(title) between 1 and 60),
  constraint calendar_events_kind_check
    check (kind in ('bill', 'income', 'savings', 'reminder')),
  constraint calendar_events_amount_check check (amount is null or (amount > 0 and amount <= 1000000)),
  constraint calendar_events_date_check
    check (event_date between date '2000-01-01' and date '2100-12-31'),
  constraint calendar_events_repeat_check check (repeat in ('none', 'weekly', 'monthly')),
  constraint calendar_events_note_length check (note is null or char_length(note) between 1 and 200)
);

create index calendar_events_user_date_idx
  on public.calendar_events (user_id, event_date);

-- Remembers that a demo customer has already been given their example events,
-- so events they delete never come back.
create table public.user_calendar_state (
  user_id text primary key references public.users (id) on delete cascade,
  seeded_at timestamptz not null default now()
);

create trigger user_quick_actions_set_updated_at
before update on public.user_quick_actions
for each row execute function public.set_updated_at();

alter table public.user_quick_actions enable row level security;
alter table public.calendar_events enable row level security;
alter table public.user_calendar_state enable row level security;

revoke all privileges on table
  public.user_quick_actions,
  public.calendar_events,
  public.user_calendar_state
from anon, authenticated;

grant all privileges on table
  public.user_quick_actions,
  public.calendar_events,
  public.user_calendar_state
to service_role;
