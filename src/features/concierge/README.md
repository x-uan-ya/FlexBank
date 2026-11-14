# AI Banking Concierge (Developer C)

Contextual explanations for PayNow steps, plain-language simplification,
optional translation, and a safe AI adapter that never confirms a transfer.

## Files

| Path | Role |
|------|------|
| `concierge.ts` | Public `ConciergeContract` (`explain`, `simplify`, `translate`) |
| `contextualFinance.ts` | Pure local resolver for authorised financial-context insights |
| `provider/aiProvider.ts` | Optional live-AI client (off by default, timeout + validation) |
| `components/ConciergeHelpPanel.tsx` | Embeddable help panel for transfer screens |
| `screens/ConciergeScreen.tsx` | Full help screen at `/concierge` |
| `server/concierge-proxy.example.mjs` (repo root) | Example **server-side** proxy for real API keys |

## Behaviour

- **Offline by default.** Prepared English explanations and Mandarin translations
  for `paynow-recipient`, `paynow-amount`, `paynow-review`, `paynow-proxy`.
- **Simplify** maps known contexts to shorter copy and applies light rules for
  other text. It no longer only trims.
- **Translate** supports prepared Mandarin. Malay/Tamil return an honest
  “unavailable” message unless live AI is configured.
- **Live AI (optional).** If `EXPO_PUBLIC_CONCIERGE_AI_URL` is set, the client
  POSTs to that URL with a 4s timeout. Any failure → deterministic fallback and
  `usedFallback: true`. The real API key must live only on the server.
- **UI honesty.** Caption shows “Prepared explanation · No AI used” or
  “AI-assisted explanation”. Never claims AI when the fallback ran.
- **Safety.** No import of PayNow confirm APIs. Help cannot edit recipient,
  amount, or send money. Transfer state is preserved when opening help.
- **Contextual finance.** Spending, recurring-expense, Plan goal and synthetic
  maturity questions reuse the financial-context engine. These prepared answers
  are local and deterministic; financial records never enter the optional proxy.
- **Ownership and privacy.** Only user-keyed Plan goals are eligible
  for account-specific insights. App-wide savings pockets and saved
  investments remain excluded because ownership cannot be verified.
  Contextual Concierge chat starts with financial amounts hidden.
  Switching users resets the chat session, and previously revealed
  financial information is removed when privacy is re-enabled.
  Synthetic spending and investment examples are explicitly labelled.
- **Remote AI consent and privacy.** The contextual Concierge chat
  requires explicit per-session opt-in before eligible standalone
  general banking-education questions can reach the optional AI proxy.
  Personal financial records, contextual questions, numeric details
  and chat history are excluded from remote requests.
  Account-specific financial explanations are generated locally.

- **Legacy AI helpers.** The existing explain(), simplify(), and
  translate() methods retain their optional AI-provider functionality.
  These methods do not use the new chat-specific consent control.
  User-specific financial information must not be supplied to these
  legacy helper methods.

## Integration (already wired)

- `ReviewScreen`, `AmountScreen`, `RecipientScreen` open `ConciergeHelpPanel`
  **inline** so the customer does not leave the step.
- Full Concierge screen remains available at `/concierge`.
- Optional `insightId` navigation allows the Concierge to explain
  a selected financial insight. The insight is resolved against
  the currently authenticated user's authorised context.
- Unknown or stale insight IDs cannot reveal another user's records.
- Call from code:

```ts
import { concierge } from '@/features/concierge/concierge';
const res = await concierge.explain('paynow-review');
// res.text, res.usedFallback
```

## Conflict: “no live APIs” vs “add a real AI provider”

`INTEGRATION.md` / `ARCHITECTURE.md` require synthetic data and a core app that
works without AI (principles 9 & 10), **and** ask Dev C to add a real provider
behind the same contract.

**Resolution used here:**

1. Default path = prepared offline content only (demo-safe).
2. Optional live path = client → **your** backend URL only.
3. Secrets never in Expo client or `EXPO_PUBLIC_*` values that embed keys.
4. Example server: `server/concierge-proxy.example.mjs`.

## Optional live-AI setup

1. Implement a real provider call inside a copy of `server/concierge-proxy.example.mjs`.
2. Set **server** env: `CONCIERGE_AI_API_KEY=...` (never commit).
3. Run the server (example: `node server/concierge-proxy.example.mjs`).
4. Start Expo with the optional AI endpoint configured.

   Windows PowerShell:

   ```powershell
   $env:EXPO_PUBLIC_CONCIERGE_AI_URL="http://localhost:8787/concierge"
   npx expo start
   ```

   Without this environment variable, FlexBank continues using
   prepared offline responses.
5. Without the URL, the app stays fully offline.

This repository does **not** ship a live key and was **not** tested against a
paid provider.

## Demo script (about 2 minutes)

1. Onboarding → Home → PayNow → pick recipient **Alex Tan** → amount **9.00**.
2. On Review, confirm recipient and amount are visible.
3. Tap **Explain this screen**. Help opens **on the same screen**.
4. Read the explanation. Tap **Simplify**, then **用中文阅读**, then **Read in English**.
5. Tap **Close help**. Recipient and amount are unchanged.
6. Optionally open full Help from the same flow (`/concierge`).
7. Press **Confirm and send** only when you intend to. Success uses synthetic data.
8. (Optional) Repeat with live URL configured; turn the proxy off and confirm the
   caption returns to “Prepared explanation · No AI used”.

## Limitations

- Prepared translations: English + Mandarin only.
- Live AI requires your own backend and key; not enabled in the default demo.
- Contextual answers are currently prepared in English; the existing general
  Concierge translation contract remains unchanged.

## Validation

```bash
npm run typecheck
npm test
```
