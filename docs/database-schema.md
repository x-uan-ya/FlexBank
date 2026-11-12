# FlexBank database schema

The runnable schema is
[`supabase/migrations/01_initial_schema.sql`](../supabase/migrations/01_initial_schema.sql).
It matches the current Express backend in `backend/src`: custom scrypt password
hashes, custom HS256 JWTs, prefixed text IDs, and the `Store` interface. It does
not use Supabase Auth.

All users, accounts, recipients, balances, and transactions are synthetic
hackathon data.

## Preflight: check for a manually created `public.users`

Do this before applying the migration:

```sql
select to_regclass('public.users') as existing_users_relation;

select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'users'
order by ordinal_position;
```

If the first query returns `public.users`, stop and compare that table with this
document. Do not run the migration until the table has been reconciled manually.
The migration intentionally raises an error before creating schema objects when
`public.users` already exists. It never drops, truncates, or silently accepts an
unknown table with `IF NOT EXISTS`.

This repository cannot determine whether the hosted project already contains
that manually created table without a database connection.

## Applying the schema later

No deployment is performed by this change. When the project is ready:

```powershell
supabase init
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push --dry-run --remote
supabase db push --remote
supabase db push --include-seed --remote
```

Skip `supabase init` if `supabase/config.toml` already exists. The final command
is optional; it loads the same three users, accounts, and five recipients as
`MemoryStore`. Their public demo password is `Demo1234!`.

Avoid applying the file manually in SQL Editor and then pushing it as a CLI
migration. Those paths maintain migration history differently.

## Authentication boundary

Authentication stays in Express:

1. `POST /api/auth/register` validates the request and creates a scrypt hash in
   `backend/src/auth.ts`.
2. `Store.createUser` stores that hash; plaintext passwords never reach the
   database.
3. `POST /api/auth/login` loads the user by email and verifies the stored hash.
4. Express signs an HS256 JWT whose `sub` is the text user ID, such as
   `usr-a1b2c3d4`.
5. Protected API routes verify that JWT and pass the resolved user to `Store`.

An Express JWT is not a Supabase Auth token, so `auth.uid()` cannot represent
the logged-in FlexBank user. The Expo app must call Express only. It must not
receive the Supabase service-role key or query these tables directly.

## Data model

| Table | Store types and methods | Purpose |
|---|---|---|
| `users` | `User`; find/create user | Name, normalized email, scrypt password hash, creation time. |
| `user_preferences` | `Preferences`; update preferences | Guidance level, display mode, and language. |
| `user_priorities` | `Preferences.priorities` | One to three ordered backend priority values. |
| `accounts` | `Account`; `getAccounts` | One synthetic SGD everyday account per user. |
| `recipients` | `Recipient`; recipient lookups | Ordered synthetic recipients, including server-only mobile lookup. |
| `transactions` | `TransactionRecord`; transaction methods | Immutable transfer result, recipient snapshot, idempotency key, and reference. |

Relationships:

```text
users
  |-- user_preferences       one-to-one
  |-- user_priorities        one-to-many, ordered 0..2
  |-- accounts               one-to-one in the current backend
  `-- transactions           one-to-many
        |-- accounts         composite FK also verifies account ownership
        `-- recipients       FK plus a name/bank/identifier snapshot
```

Deleting a user cascades through their preferences, priorities, accounts, and
transactions. An account with transaction history cannot be deleted separately
because the transaction foreign key uses the default restrictive behavior.

## Exact backend values

| Field | Permitted values or format |
|---|---|
| User ID | `usr-` plus 8 lowercase hexadecimal characters |
| Account ID | `acc-usr-` plus 8 lowercase hexadecimal characters |
| Transaction ID | `txn-` plus 8 lowercase hexadecimal characters |
| Guidance | `quick`, `balanced`, `guided` |
| Display | `standard`, `largeText`, `highClarity` |
| Language | `en`, `zh`, `ms`, `ta` |
| Priority | `transfers`, `billPayments`, `accountOverview` |
| Priority count | 1 to 3, unique and ordered |
| Currency | `SGD` |
| Transfer amount | S$1.00 to S$25,000.00, at most 2 decimals |
| Request ID | 8 to 64 letters, numbers, `_`, or `-`; unique per user |
| Status | `confirmed` or `failed` |

PostgreSQL uses snake case. A `SupabaseStore` maps, for example,
`password_hash` to `passwordHash`, `masked_number` to `maskedNumber`, and
`created_at` to `createdAt`. Numeric balances and amounts should be converted to
JavaScript numbers at this mapping boundary if the database client returns
PostgreSQL `numeric` values as strings.

## Atomic Store operations

`create_store_user(...)` implements the multi-table part of `Store.createUser`
as one transaction. It creates:

- `users`
- `user_preferences`
- ordered `user_priorities`
- the S$8,420.55 everyday demo account

It returns `{ kind: "created", user }`, or `{ kind: "email-taken" }` for an
existing normalized email.

`apply_store_transfer(...)` implements `Store.applyTransfer` as one transaction.
It locks the user's account, checks the `(user_id, request_id)` idempotency key,
checks the balance, deducts a confirmed amount, snapshots the recipient, and
inserts the transaction. It returns the same `confirmed`, `failed`, `duplicate`,
or `insufficient` result shapes expected by the backend.

The unique `(user_id, request_id)` constraint is a second idempotency safeguard.
The composite `(account_id, user_id)` foreign key prevents a transaction from
being associated with another user's account.

## Access controls

RLS is enabled on all six public tables, but there are deliberately no policies
for `anon` or `authenticated`. All privileges are revoked from those roles.
Only `service_role` can access the tables, sequence, and Store RPC functions.

This means:

- Account and transaction writes are backend-only.
- Password hashes and recipient mobile numbers are never client-readable.
- The backend must always scope user queries with the user ID obtained from its
  verified Express JWT; it must never accept a body-supplied user ID as authority.
- The service-role key belongs only in the backend environment and must never
  use an `EXPO_PUBLIC_` variable.

## Connecting Express

Implement `SupabaseStore implements Store` beside `MemoryStore`. Construct a
server-only Supabase client with `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`, or use a server-only PostgreSQL connection from
`DATABASE_URL`. Never create this privileged client in frontend code.

Method mapping:

| Store method | Database operation |
|---|---|
| `findUserByEmail` | Read `users`, `user_preferences`, and ordered `user_priorities` by normalized email. |
| `findUserById` | Same join by text user ID. |
| `createUser` | Call `create_store_user`. |
| `updatePreferences` | Transactionally update `user_preferences` and replace ordered `user_priorities`. |
| Recipient methods | Read `recipients` by `sort_order`; omit `mobile` from API responses as `api.ts` already does. |
| `getAccounts` | Read `accounts` by verified user ID. |
| `findTransactionByRequestId` | Read by `(user_id, request_id)`. |
| `applyTransfer` | Call `apply_store_transfer`; do not reproduce it as separate client updates. |
| `listTransactions` | Read by user ID ordered by `created_at desc`. |
| `reset` | In one backend-only transaction, clear demo transactions, reset the reference sequence, and restore seed users, accounts, preferences, priorities, and recipients. |

`backend/src/index.ts` currently constructs `MemoryStore`. Switching persistence
requires constructing and initializing `SupabaseStore` there; the API routes,
password verification, JWT signing, and JWT verification remain unchanged.

## Seed behavior

`supabase/seed.sql` contains the exact three personas, preferences, ordered
priorities, balances, and five recipients from `backend/src/store.ts`. It does
not seed transactions. The shared password hash was generated with the same
Node scrypt parameters as `hashPassword` and is safe to commit only because
`Demo1234!` is an intentionally public synthetic-demo credential.
