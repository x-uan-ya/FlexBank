# FlexBank server

Node.js + Express + TypeScript backend for the FlexBank demo. **All data is synthetic. No real money, accounts or people.**

What it does:

- **Register and log in.** Customers choose their preferences (guidance level, display mode, language, top priorities) **at registration**, so the app can be tailored from the first screen. Preferences are always explicit choices, never guesses.
- **Demo customers** already in the data, one per persona.
- **PayNow rules on the server** (recipient exists, amount limits, balance, mobile-number lookup, simulated success or failure). The server is the final judge even if the app is bypassed. A double press never sends twice.

What it does NOT do (other teammates add these, see the bottom): the database, the AI Concierge, translations, and the app screens.

## Run it

You need Node.js 20.12 or newer.

```
cd backend
npm install
copy .env.example .env
npm run dev
```

Open `http://localhost:4000/api/health`. You should see `{"ok":true}`.

Edit `.env` before the real demo (see the comments inside). **Never commit `.env`.**

The default `STORE_DRIVER=memory` keeps the reset-on-restart demo behavior. To
use the migrated Supabase PostgreSQL database, set `STORE_DRIVER=postgres` and
`DATABASE_URL` in the server-only `.env`. The Expo app still talks only to this
Express API and never receives the database URL.

## Demo logins

Password for all three: `Demo1234!` (demo only)

| Email | Guidance | Display | Language |
|---|---|---|---|
| quick@demo.flexbank.test | quick | standard | en |
| careful@demo.flexbank.test | guided | standard | en |
| readable@demo.flexbank.test | balanced | largeText | zh |

Each starts with S$8,420.55. Demo recipient numbers: `9000 4821` Alex Tan, `9000 1293` Sarah Lim, `9000 7356` Marcus Lee, `9000 9014` Priya Nair, `9000 2680` Wei Zhang (made up).
Amount `13.13` simulates a failed transfer.

## API

Send `Authorization: Bearer <token>` on everything except health, register, login and demo reset. Errors always look like `{"error":{"message":"..."}}` with a friendly message.

| Method | Path | What it does |
|---|---|---|
| GET | /api/health | Is the server up |
| POST | /api/auth/register | `{name, email, password, preferences}` creates a customer and logs them in |
| POST | /api/auth/login | `{email, password}` returns a token, the user and their preferences |
| GET | /api/me | The logged-in customer and their preferences |
| PUT | /api/me/preferences | Change preferences |
| GET | /api/accounts | Accounts and balance |
| GET | /api/recipients | Saved recipients |
| GET | /api/recipients/lookup?mobile=... | Find a recipient by PayNow mobile number |
| POST | /api/transfers/validate | `{recipientId, amount}` returns `{valid, messages}` |
| POST | /api/transfers/confirm | `{recipientId, amount, requestId}` the customer pressed Confirm. Make a NEW `requestId` for each transfer (8 to 64 letters, numbers, `-` or `_`) and reuse it only when retrying the same press |
| GET | /api/transactions | History, newest first |
| POST | /api/demo/reset | Put the demo data back to the start (needs the `x-demo-key` header) |

`preferences` looks like:

```json
{ "guidanceLevel": "guided", "displayMode": "largeText", "language": "ms", "priorities": ["transfers", "billPayments"] }
```

Allowed values: guidanceLevel `quick|balanced|guided`, displayMode `standard|largeText|highClarity`, language `en|zh|ms|ta`, priorities (1 to 3 of) `transfers|billPayments|accountOverview`.

## Connecting the app

Where the app finds the server depends on where it runs:

| App runs on | Server address |
|---|---|
| Browser (`npm run web`) | `http://localhost:4000` |
| Android Studio emulator | `http://10.0.2.2:4000` (`localhost` would be the emulator itself) |
| Real phone on the same Wi-Fi | `http://<your laptop's IP>:4000` (run `ipconfig`, allow Node through the Windows firewall when asked) |

Keep the address in ONE place in the app (for example `src/config/api.ts`) so it is easy to change before the demo.

## Resetting the demo

Set `DEMO_KEY=something-secret` in `.env`, restart, then in PowerShell:

```
Invoke-RestMethod -Method Post -Uri http://localhost:4000/api/demo/reset -Headers @{ 'x-demo-key' = 'something-secret' }
```

## Tests

```
npm test
npm run typecheck
```

When `DATABASE_URL` is present, `npm test` also runs the PostgreSQL persistence
suite. It creates a uniquely named synthetic user and removes it afterward.

## Where teammates plug in

- **Database (Supabase):** `src/supabaseStore.ts` implements the same `Store`
  contract as `MemoryStore`. `src/index.ts` selects it when
  `STORE_DRIVER=postgres`; the routes do not change.
- **AI Concierge:** add routes to the `routes` list in `src/api.ts` (one `authed('POST', '/api/...', ...)` line each). Keep the AI key in `.env` only, and keep it on this server, never in the app. The AI must never be able to start or confirm a transfer.
- **Languages:** the server stores each customer's chosen language (`en`, `zh`, `ms`, `ta`). Translations of screen text and explanations belong with the AI and frontend work.
- **Frontend:** call the API in the table above.

## Notes

- Data is kept in memory, so restarting the server resets everything. That is handy as a demo backup.
- If the app's root `npm run typecheck` complains about files in `backend/`, add `"backend"` to `exclude` in the root `tsconfig.json` (a shared file, so tell the integration lead).
- No HTTPS and a simple login token: fine for a demo, not for a real bank.
