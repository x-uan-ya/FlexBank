# FlexBank Backend Guide

This prototype runs **local-first**: authentication and user data persist
**on the device** (Expo SecureStore + AsyncStorage) behind a small service
interface. There is **no live backend running today**, and the app works fully
offline — ideal for a reliable competition demo.

This document describes (a) how the local layer is structured and (b) exactly
how to swap in a real **Supabase + Node/Express** backend later **without
changing any UI code**.

---

## 1. How persistence works today (local-first)

```
UI / screens
   │  useAuth() / useAuthState()        ← from @/state
   ▼
SessionProvider (global state)
   │  authService                       ← the ONLY thing to replace
   ▼
LocalAuthService  ──────────────┐
   │  crypto (expo-crypto)       │  src/services/
   │  secureStorage (SecureStore)│  storage.ts
   └  jsonStorage (AsyncStorage) ┘
```

- **Secrets** (session token, salted password hashes) → `expo-secure-store`
  (OS keychain/keystore).
- **Records** (profile, preferences) → `AsyncStorage`, namespaced `flexbank:`.
- **Passwords** are salted + SHA-256 hashed (`src/services/crypto.ts`). Plaintext
  is never stored or logged.
- The app depends only on the **`AuthService` interface**
  (`src/services/authService.ts`), so the implementation is swappable.

> Prototype note: client-side SHA-256 is fine for an offline demo but is NOT
> production auth. A real system hashes server-side with a slow KDF (bcrypt/
> argon2) and never ships password handling in the client.

---

## 2. Target architecture (when you add a real backend)

- **Frontend:** React Native + Expo (unchanged).
- **Backend:** Node.js + Express + TypeScript.
- **Database:** Supabase PostgreSQL.
- **Auth:** Supabase Auth (email/password), with Row Level Security (RLS).

The Express layer is the broker that holds the **service-role key** and talks to
Supabase. The app only ever receives the **anon/public key** and a user access
token. Never ship the service-role key or DB password in the Expo app.

---

## 3. Database schema (Supabase / PostgreSQL)

```sql
-- profiles: 1 row per user (id matches Supabase auth.users.id)
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  created_at timestamptz not null default now()
);

-- user_preferences: 1 row per user
create table user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  guidance_level text not null check (guidance_level in ('quick','balanced','guided')),
  display_mode  text not null check (display_mode in ('standard','largeText','highClarity')),
  language      text not null check (language in ('en','zh','ms','ta')),
  visual_theme  text not null default 'classic',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

-- user_banking_purposes: N rows per user (the primary personalisation driver)
create table user_banking_purposes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  purpose_key text not null check (purpose_key in
    ('saving','fixedDeposits','investments','everyday','managing','learning')),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, purpose_key)
);

-- widget_layouts: optional per-user custom ordering/visibility
create table widget_layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  widget_key text not null,
  display_order int not null default 0,
  is_visible boolean not null default true,
  unique (user_id, widget_key)
);
```

### Row Level Security (so users only see their own data)

```sql
alter table profiles enable row level security;
alter table user_preferences enable row level security;
alter table user_banking_purposes enable row level security;
alter table widget_layouts enable row level security;

-- Example policy (repeat per table, matching user_id / id to auth.uid()):
create policy "own rows" on user_preferences
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

---

## 4. API endpoints (Express)

All JSON. All user routes require a bearer token; the server resolves the user
from it and enforces per-user access (never trust a user_id from the client).

```
Auth
  POST /api/auth/register   { fullName, email, password, preferences } -> { token, profile, preferences }
  POST /api/auth/login      { email, password }                        -> { token, profile, preferences }
  POST /api/auth/logout     -> { ok: true }

Customer
  GET  /api/users/me          -> { profile }
  GET  /api/users/preferences -> { preferences }
  PUT  /api/users/preferences { preferences } -> { preferences }

Banking purposes
  GET  /api/banking-purposes            -> { purposes: string[] }
  POST /api/banking-purposes { purposes } -> { purposes }
  PUT  /api/banking-purposes { purposes } -> { purposes }

Homepage
  GET  /api/home/personalised -> { sections, explanations }   // may be computed client-side instead
  PUT  /api/home/layout { layout } -> { layout }
```

These shapes already match what the app consumes (`AuthResult`,
`CustomerPreferences`, `BankingPurpose[]`). The purpose engine
(`src/features/home/purposeEngine.ts`) can stay client-side, or move behind
`GET /api/home/personalised` with no UI change.

---

## 5. Environment variables

Frontend (`.env`, read via Expo public env — safe values only):

```
EXPO_PUBLIC_API_URL=https://your-api.example.com
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon/public key>   # safe to ship
```

Backend only (server environment — NEVER in the app):

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>      # secret, server only
DATABASE_URL=postgresql://...                     # if connecting directly
```

---

## 6. How to swap local → Supabase (no UI changes)

1. Stand up the Express server + Supabase project with the schema above.
2. Create `src/services/remoteAuthService.ts` that implements the SAME
   `AuthService` interface by calling your API with `fetch`:
   - `register` → `POST /api/auth/register`
   - `login` → `POST /api/auth/login`
   - `getSession` → read stored token (keep using SecureStore) then
     `GET /api/users/me` + `GET /api/users/preferences`
   - `updatePreferences` → `PUT /api/users/preferences`
   - `logout` → `POST /api/auth/logout` + clear the local token
3. In `src/services/index.ts`, export the remote implementation instead of the
   local one:
   ```ts
   // export { authService } from './authService';       // local (default)
   export { authService } from './remoteAuthService';     // remote
   ```
4. That's it — `SessionProvider`, all screens, and the purpose engine are
   unchanged because they depend only on the interface.

Keep the local implementation as an **offline fallback** for demos.

---

## 7. Demo accounts

Three synthetic users are seeded into the local store on first boot (see
`src/services/seedDemo.ts`, data in `src/data/demoAccounts.ts`):

| Name   | Email                 | Password   | Purposes                        |
| ------ | --------------------- | ---------- | ------------------------------- |
| Alex   | alex@flexbank.demo    | demo1234   | Saving, Fixed Deposits          |
| Jamie  | jamie@flexbank.demo   | demo1234   | Bonds & Investments, Learning   |
| Taylor | taylor@flexbank.demo  | demo1234   | Everyday, Managing (High Clarity) |

Reset the local store between demo runs with `resetDemoData()` (from
`@/services`). In a real backend, seed these server-side instead.
