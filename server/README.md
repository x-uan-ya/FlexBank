# FlexBank Concierge Proxy

A small, **optional** Express + TypeScript server that powers the FlexBank
Concierge with Google Gemini. It exists so the Gemini API key stays
**server-side only** — it is never shipped in the Expo app.

The Expo app works **without** this server: when the proxy is not running or
not configured, the Concierge falls back to deterministic offline answers. This
server only adds live AI on top.

> This server is separate from the Expo build. It is never bundled into the app.

---

## What it does

- `POST /concierge` — one-shot `explain` / `simplify` / `translate`.
- `POST /concierge/chat` — multi-turn banking Q&A (education only).
- `GET /health` — liveness + whether a key is configured.

Behaviour:
- **No `GEMINI_API_KEY`** → AI routes return `503`, so the app uses its offline
  fallback. This is the default demo state.
- **Quota / 429 / any upstream error** → `503` (same safe fallback path).
- **Unsafe input** (asking to move money, for credentials, or for personalised
  investment advice) → a safe canned refusal; Gemini is not called.

---

## Free tier only

- Default model: **`gemini-2.5-flash-lite`** — the highest free-tier quota,
  ideal for short banking answers. `gemini-2.5-flash` is also free.
- **Do not enable billing.** Do not switch to Pro (not free for most accounts)
  or paid grounding features.
- Output is capped (`GEMINI_MAX_OUTPUT_TOKENS`, default 512) and a per-IP rate
  limit keeps usage well inside free limits.
- Free-tier limits are roughly: flash-lite ~15 requests/min and ~1,000/day;
  flash ~10/min and ~250/day. Check the current limits at
  https://ai.google.dev/gemini-api/docs/rate-limits

---

## Setup

Requires **Node.js 22+** (the `@google/genai` SDK v3 requires it).

```bash
cd server
npm install
cp .env.example .env     # then edit .env
```

Get a **free** Gemini API key at https://aistudio.google.com/apikey (no credit
card required) and put it in `.env`:

```
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash-lite
PORT=8787
CORS_ORIGIN=*
```

Run it:

```bash
npm run dev     # watch mode (tsx)
# or
npm run build && npm start
```

You should see: `FlexBank Concierge proxy on http://localhost:8787 (AI configured)`.

---

## Point the app at it

Set this in the Expo app environment (it is a URL, **not** a secret, so
`EXPO_PUBLIC_` is fine):

```
EXPO_PUBLIC_CONCIERGE_AI_URL=http://localhost:8787/concierge
```

- On a real device/emulator, replace `localhost` with your machine's LAN IP
  (e.g. `http://192.168.1.20:8787/concierge`) so the phone can reach it.
- The app derives the chat endpoint automatically (`…/concierge/chat`).
- Leave this unset to run the app fully offline with deterministic answers.

---

## Security

- The API key lives only in `server/.env` (gitignored) and this process's
  environment. It is never returned to the client and never logged.
- Never put the key in the Expo app or any `EXPO_PUBLIC_*` variable.
- The app only ever receives a URL and the model's text output.

---

## Test

```bash
npm run typecheck
```

Deterministic server logic (safety guards, prompt building) is covered by the
repo's test suite at `../tests/concierge-proxy.test.cjs`. The live Gemini call
and its 429→503 mapping are verified by running the server and hitting `/health`
and the routes.
