-- FlexBank PostgreSQL schema for the current Express backend.
--
-- Authentication remains in backend/src/auth.ts. User IDs, password hashes,
-- preferences, and transfer records match backend/src/types.ts and Store.

-- Fail before making schema changes when a manually-created users relation is
-- present. Do not hide an incompatible table behind CREATE TABLE IF NOT EXISTS.
do $preflight$
begin
  if to_regclass('public.users') is not null then
    raise exception using
      errcode = '42P07',
      message = 'public.users already exists; inspect and reconcile it before applying 01_initial_schema.sql. Nothing is dropped automatically.';
  end if;
end;
$preflight$;

create extension if not exists pgcrypto;

create sequence public.transfer_reference_seq;

create table public.users (
  id text primary key default ('usr-' || left(replace(gen_random_uuid()::text, '-', ''), 8)),
  name text not null,
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  constraint users_id_format check (id ~ '^usr-[0-9a-f]{8}$'),
  constraint users_name_length check (char_length(name) between 1 and 60),
  constraint users_email_length check (char_length(email) between 3 and 254),
  constraint users_email_lowercase check (email = lower(email)),
  constraint users_email_shape check (email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint users_password_hash_shape check (
    char_length(password_hash) between 20 and 300
    and password_hash like 'scrypt$%$%'
  )
);

create table public.user_preferences (
  user_id text primary key references public.users (id) on delete cascade,
  guidance_level text not null,
  display_mode text not null,
  language text not null,
  updated_at timestamptz not null default now(),
  constraint user_preferences_guidance_level_check
    check (guidance_level in ('quick', 'balanced', 'guided')),
  constraint user_preferences_display_mode_check
    check (display_mode in ('standard', 'largeText', 'highClarity')),
  constraint user_preferences_language_check
    check (language in ('en', 'zh', 'ms', 'ta'))
);

create table public.user_priorities (
  user_id text not null references public.users (id) on delete cascade,
  priority_key text not null,
  sort_order smallint not null,
  primary key (user_id, priority_key),
  constraint user_priorities_key_check
    check (priority_key in ('transfers', 'billPayments', 'accountOverview')),
  constraint user_priorities_sort_order_check check (sort_order between 0 and 2),
  constraint user_priorities_user_order_unique unique (user_id, sort_order)
);

create table public.accounts (
  id text primary key,
  user_id text not null unique references public.users (id) on delete cascade,
  name text not null,
  masked_number text not null,
  balance numeric(14, 2) not null default 0,
  currency text not null default 'SGD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_id_format check (id ~ '^acc-usr-[0-9a-f]{8}$'),
  constraint accounts_name_length check (char_length(name) between 1 and 100),
  constraint accounts_masked_number_length
    check (char_length(masked_number) between 1 and 40),
  constraint accounts_balance_check check (balance >= 0),
  constraint accounts_currency_check check (currency = 'SGD'),
  constraint accounts_id_user_unique unique (id, user_id)
);

create table public.recipients (
  id text primary key,
  name text not null,
  bank text not null,
  masked_identifier text not null,
  initials text not null,
  mobile text not null unique,
  sort_order smallint not null,
  created_at timestamptz not null default now(),
  constraint recipients_id_format check (id ~ '^rcp-[a-z0-9-]+$'),
  constraint recipients_name_length check (char_length(name) between 1 and 100),
  constraint recipients_bank_length check (char_length(bank) between 1 and 100),
  constraint recipients_initials_length check (char_length(initials) between 1 and 8),
  constraint recipients_mobile_format check (mobile ~ '^[89][0-9]{7}$'),
  constraint recipients_sort_order_check check (sort_order >= 0),
  constraint recipients_sort_order_unique unique (sort_order)
);

create table public.transactions (
  id text primary key default ('txn-' || left(replace(gen_random_uuid()::text, '-', ''), 8)),
  user_id text not null references public.users (id) on delete cascade,
  account_id text not null,
  request_id text not null,
  recipient_id text not null references public.recipients (id),
  recipient_name text not null,
  recipient_bank text not null,
  recipient_identifier text not null,
  amount numeric(14, 2) not null,
  currency text not null default 'SGD',
  status text not null,
  failure_reason text,
  reference text not null unique,
  created_at timestamptz not null default now(),
  constraint transactions_id_format check (id ~ '^txn-[0-9a-f]{8}$'),
  constraint transactions_request_id_format
    check (request_id ~ '^[A-Za-z0-9_-]{8,64}$'),
  constraint transactions_amount_check check (amount between 1 and 25000),
  constraint transactions_currency_check check (currency = 'SGD'),
  constraint transactions_status_check check (status in ('confirmed', 'failed')),
  constraint transactions_failure_reason_check check (
    (status = 'confirmed' and failure_reason is null)
    or
    (status = 'failed' and failure_reason is not null and char_length(failure_reason) > 0)
  ),
  constraint transactions_reference_format
    check (reference ~ '^FB-[0-9]{8}-[0-9]+$'),
  constraint transactions_user_request_unique unique (user_id, request_id),
  constraint transactions_account_owner_fk
    foreign key (account_id, user_id)
    references public.accounts (id, user_id)
);

create index user_priorities_user_order_idx
  on public.user_priorities (user_id, sort_order);
create index transactions_user_created_at_idx
  on public.transactions (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger user_preferences_set_updated_at
before update on public.user_preferences
for each row execute function public.set_updated_at();

create trigger accounts_set_updated_at
before update on public.accounts
for each row execute function public.set_updated_at();

-- Enforce the complete User shape at transaction commit while still allowing
-- Store implementations to replace ordered priority rows inside a transaction.
create or replace function public.validate_store_user_shape()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_user_id text;
  v_priority_count integer;
begin
  if tg_table_name = 'users' then
    v_user_id := new.id;
  elsif tg_op = 'DELETE' then
    v_user_id := old.user_id;
  else
    v_user_id := new.user_id;
  end if;

  -- A cascading user delete has already removed the parent, so there is no
  -- remaining Store record to validate.
  if not exists (select 1 from public.users where id = v_user_id) then
    return null;
  end if;

  if not exists (select 1 from public.user_preferences where user_id = v_user_id) then
    raise exception using errcode = '23514', message = 'each user must have one preferences row';
  end if;

  select count(*) into v_priority_count
  from public.user_priorities
  where user_id = v_user_id;

  if v_priority_count not between 1 and 3 then
    raise exception using errcode = '23514', message = 'each user must have between 1 and 3 priorities';
  end if;

  return null;
end;
$$;

create constraint trigger users_validate_store_shape
after insert on public.users
deferrable initially deferred
for each row execute function public.validate_store_user_shape();

create constraint trigger user_preferences_validate_store_shape
after insert or update or delete on public.user_preferences
deferrable initially deferred
for each row execute function public.validate_store_user_shape();

create constraint trigger user_priorities_validate_store_shape
after insert or update or delete on public.user_priorities
deferrable initially deferred
for each row execute function public.validate_store_user_shape();

-- Implements Store.createUser as one database transaction. The caller supplies
-- the scrypt hash produced by backend/src/auth.ts; plaintext never reaches SQL.
create or replace function public.create_store_user(
  p_name text,
  p_email text,
  p_password_hash text,
  p_guidance_level text,
  p_display_mode text,
  p_language text,
  p_priorities text[]
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_user_id text := 'usr-' || left(replace(gen_random_uuid()::text, '-', ''), 8);
  v_email text := lower(trim(p_email));
begin
  if cardinality(p_priorities) is null or cardinality(p_priorities) not between 1 and 3 then
    raise exception using errcode = '23514', message = 'priorities must contain between 1 and 3 values';
  end if;

  if (
    select count(distinct item)
    from unnest(p_priorities) as selected(item)
  ) <> cardinality(p_priorities) then
    raise exception using errcode = '23514', message = 'priorities must not contain duplicates';
  end if;

  insert into public.users (id, name, email, password_hash)
  values (v_user_id, trim(p_name), v_email, p_password_hash);

  insert into public.user_preferences (user_id, guidance_level, display_mode, language)
  values (v_user_id, p_guidance_level, p_display_mode, p_language);

  insert into public.user_priorities (user_id, priority_key, sort_order)
  select v_user_id, item, (position - 1)::smallint
  from unnest(p_priorities) with ordinality as selected(item, position);

  insert into public.accounts (id, user_id, name, masked_number, balance, currency)
  values ('acc-' || v_user_id, v_user_id, 'Everyday Account', U&'\2022\2022\2022\2022 2847', 8420.55, 'SGD');

  return jsonb_build_object(
    'kind', 'created',
    'user', jsonb_build_object(
      'id', v_user_id,
      'name', trim(p_name),
      'email', v_email,
      'passwordHash', p_password_hash,
      'preferences', jsonb_build_object(
        'guidanceLevel', p_guidance_level,
        'displayMode', p_display_mode,
        'language', p_language,
        'priorities', to_jsonb(p_priorities)
      ),
      'createdAt', (select created_at from public.users where id = v_user_id)
    )
  );
exception
  when unique_violation then
    if exists (select 1 from public.users where email = v_email) then
      return jsonb_build_object('kind', 'email-taken');
    end if;
    raise;
end;
$$;

-- Implements Store.applyTransfer atomically. Locking the user's account makes
-- the balance check, debit, and transaction insert safe under concurrency.
create or replace function public.apply_store_transfer(
  p_user_id text,
  p_request_id text,
  p_recipient_id text,
  p_amount numeric,
  p_simulated_failure_reason text default null
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_account public.accounts%rowtype;
  v_recipient public.recipients%rowtype;
  v_transaction public.transactions%rowtype;
  v_reference_number bigint;
  v_reference_suffix text;
  v_status text;
begin
  if p_amount is null or p_amount < 1 or p_amount > 25000 or p_amount <> round(p_amount, 2) then
    raise exception using errcode = '23514', message = 'amount must be between 1.00 and 25000.00 with at most 2 decimal places';
  end if;

  select * into v_account
  from public.accounts
  where user_id = p_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'account not found for user';
  end if;

  select * into v_transaction
  from public.transactions
  where user_id = p_user_id and request_id = p_request_id;

  if found then
    return jsonb_build_object(
      'kind', 'duplicate',
      'record', jsonb_build_object(
        'id', v_transaction.id,
        'userId', v_transaction.user_id,
        'requestId', v_transaction.request_id,
        'recipientId', v_transaction.recipient_id,
        'recipientName', v_transaction.recipient_name,
        'recipientBank', v_transaction.recipient_bank,
        'recipientIdentifier', v_transaction.recipient_identifier,
        'amount', v_transaction.amount,
        'currency', v_transaction.currency,
        'status', v_transaction.status,
        'failureReason', v_transaction.failure_reason,
        'reference', v_transaction.reference,
        'createdAt', v_transaction.created_at
      ),
      'balance', v_account.balance
    );
  end if;

  select * into v_recipient
  from public.recipients
  where id = p_recipient_id;

  if not found then
    raise exception using errcode = '23503', message = 'recipient not found';
  end if;

  v_status := case when p_simulated_failure_reason is null then 'confirmed' else 'failed' end;

  if v_status = 'confirmed' and v_account.balance < p_amount then
    return jsonb_build_object('kind', 'insufficient', 'balance', v_account.balance);
  end if;

  if v_status = 'confirmed' then
    update public.accounts
    set balance = balance - p_amount
    where id = v_account.id
    returning * into v_account;
  end if;

  v_reference_number := nextval('public.transfer_reference_seq');
  v_reference_suffix := case
    when v_reference_number < 10000 then lpad(v_reference_number::text, 4, '0')
    else v_reference_number::text
  end;

  insert into public.transactions (
    user_id,
    account_id,
    request_id,
    recipient_id,
    recipient_name,
    recipient_bank,
    recipient_identifier,
    amount,
    currency,
    status,
    failure_reason,
    reference
  )
  values (
    p_user_id,
    v_account.id,
    p_request_id,
    v_recipient.id,
    v_recipient.name,
    v_recipient.bank,
    v_recipient.masked_identifier,
    p_amount,
    'SGD',
    v_status,
    p_simulated_failure_reason,
    'FB-' || to_char(current_timestamp at time zone 'UTC', 'YYYYMMDD') || '-' || v_reference_suffix
  )
  returning * into v_transaction;

  return jsonb_build_object(
    'kind', v_status,
    'record', jsonb_build_object(
      'id', v_transaction.id,
      'userId', v_transaction.user_id,
      'requestId', v_transaction.request_id,
      'recipientId', v_transaction.recipient_id,
      'recipientName', v_transaction.recipient_name,
      'recipientBank', v_transaction.recipient_bank,
      'recipientIdentifier', v_transaction.recipient_identifier,
      'amount', v_transaction.amount,
      'currency', v_transaction.currency,
      'status', v_transaction.status,
      'failureReason', v_transaction.failure_reason,
      'reference', v_transaction.reference,
      'createdAt', v_transaction.created_at
    ),
    'balance', v_account.balance
  );
end;
$$;

-- The Expo app uses the Express JWT, not a Supabase access token. Consequently
-- there are deliberately no anon/authenticated RLS policies. All database
-- access goes through the trusted Express backend using service_role.
alter table public.users enable row level security;
alter table public.user_preferences enable row level security;
alter table public.user_priorities enable row level security;
alter table public.accounts enable row level security;
alter table public.recipients enable row level security;
alter table public.transactions enable row level security;

revoke all privileges on table
  public.users,
  public.user_preferences,
  public.user_priorities,
  public.accounts,
  public.recipients,
  public.transactions
from anon, authenticated;

revoke all privileges on sequence public.transfer_reference_seq
from anon, authenticated;

grant all privileges on table
  public.users,
  public.user_preferences,
  public.user_priorities,
  public.accounts,
  public.recipients,
  public.transactions
to service_role;

grant usage, select, update on sequence public.transfer_reference_seq to service_role;

revoke execute on function public.set_updated_at() from public, anon, authenticated;
revoke execute on function public.validate_store_user_shape() from public, anon, authenticated;
revoke execute on function public.create_store_user(text, text, text, text, text, text, text[])
  from public, anon, authenticated;
revoke execute on function public.apply_store_transfer(text, text, text, numeric, text)
  from public, anon, authenticated;

grant execute on function public.create_store_user(text, text, text, text, text, text, text[])
  to service_role;
grant execute on function public.apply_store_transfer(text, text, text, numeric, text)
  to service_role;
grant execute on function public.set_updated_at() to service_role;
grant execute on function public.validate_store_user_shape() to service_role;
