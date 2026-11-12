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
- **Auth:** the existing Express scrypt password verification and HS256 JWTs in
  `backend/src/auth.ts`. Supabase Auth is not used yet.

The Express layer holds the **service-role key**, verifies its own JWTs, and
talks to PostgreSQL. The app only receives the Express API URL and JWT. Never
ship the service-role key, database password, or stored password hashes in the
Expo app.

---

## 3. Database schema (Supabase / PostgreSQL)

The complete, runnable schema is now maintained as a migration:

- `supabase/migrations/01_initial_schema.sql`
- `supabase/seed.sql` for synthetic demo users, accounts, and recipients
- `docs/database-schema.md` for setup, relationships, constraints, access controls, and the
  TypeScript-to-PostgreSQL naming map

Do not copy an abbreviated schema from this architecture document. Apply the
migration so all tables, indexes, triggers, constraints, and access grants are
created together.

---

## 4. API endpoints (Express)

All JSON. All user routes require a bearer token; the server resolves the user
from it and enforces per-user access (never trust a user_id from the client).

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/auth/register` | Create a user and return an Express JWT. |
| `POST` | `/api/auth/login` | Verify the scrypt hash and return an Express JWT. |
| `GET` | `/api/me` | Return the authenticated user and preferences. |
| `PUT` | `/api/me/preferences` | Replace explicit preferences. |
| `GET` | `/api/accounts` | Return the user's synthetic account. |
| `GET` | `/api/recipients` | List recipients without mobile lookup values. |
| `GET` | `/api/recipients/lookup` | Look up a recipient by validated mobile number. |
| `POST` | `/api/transfers/validate` | Validate recipient, amount, and balance. |
| `POST` | `/api/transfers/confirm` | Atomically apply an idempotent transfer. |
| `GET` | `/api/transactions` | Return newest-first history. |
| `POST` | `/api/demo/reset` | Reset synthetic data when `DEMO_KEY` is enabled. |

---

## 5. Environment variables

Frontend (`.env`, read via Expo public env — safe values only):

```
EXPO_PUBLIC_API_URL=https://your-api.example.com
```

Backend only (server environment — NEVER in the app):

```
JWT_SECRET=<long random value used by the existing Express auth>
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service role key>      # secret, server only
DATABASE_URL=postgresql://...                     # if connecting directly
```

---

## 6. How to swap local → Supabase (no UI changes)

1. Apply the schema after running the documented `public.users` preflight.
2. Implement `SupabaseStore` against the existing `Store` interface and use it
   in `backend/src/index.ts` instead of `MemoryStore`. Keep Express auth and JWT
   handling unchanged.
3. Create `src/services/remoteAuthService.ts` that implements the SAME
   `AuthService` interface by calling your API with `fetch`:
   - `register` → `POST /api/auth/register`
   - `login` → `POST /api/auth/login`
   - `getSession` → read stored token (keep using SecureStore) then
     `GET /api/me`
   - `updatePreferences` → `PUT /api/me/preferences`
   - `logout` → `POST /api/auth/logout` + clear the local token
4. In `src/services/index.ts`, export the remote implementation instead of the
   local one:
   ```ts
   // export { authService } from './authService';       // local (default)
   export { authService } from './remoteAuthService';     // remote
   ```
5. That's it — `SessionProvider`, all screens, and the purpose engine are
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

---

## 8. Concierge AI proxy (Google Gemini, optional)

The AI Concierge can run live via Google Gemini through a **separate** Express +
TypeScript server in [`server/`](./server/README.md). It is independent of the
auth/persistence backend above and independent of the Expo build.

**Why a proxy:** the Gemini API key must never ship in the app. The proxy holds
`GEMINI_API_KEY` server-side; the app only knows a URL
(`EXPO_PUBLIC_CONCIERGE_AI_URL`) and receives text back.

```
Expo app ──POST /concierge(/chat)──▶ Express proxy (server/) ──▶ Gemini (free tier)
  aiProvider.ts / concierge.ts        holds GEMINI_API_KEY        gemini-2.5-flash-lite
        │                                    │
        └── on 503/offline ◀─────────────────┴── no key / 429 / error → 503
            deterministic offline fallback (always available)
```

- Endpoints: `POST /concierge` (explain/simplify/translate), `POST
  /concierge/chat` (multi-turn), `GET /health`.
- Free tier only; no billing. Default model `gemini-2.5-flash-lite`.
- Offline-by-default: with no key, or no server, the app keeps working using the
  deterministic Concierge responses. The core demo needs no AI and no network.
- Safety: the proxy injects a banking-education system prompt and refuses to act
  on money, ask for credentials, or give personalised investment advice; a
  client-side guard mirrors this so offline mode is safe too.

Full setup, env vars, and run instructions: **[`server/README.md`](./server/README.md)**.
