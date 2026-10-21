# FlexBank Integration Guide

How to add your feature **without breaking existing functionality**. Read this
before you start, then your feature's `README.md` inside
`src/features/<yourArea>/`.

---

## Golden rules

1. **Stay in your folder.** Build inside `src/features/<yourArea>/`. Changing
   shared code (`@/types`, `@/state`, `@/theme`, `@/components`) should be rare
   and coordinated with the integration lead.
2. **Never mutate global state directly.** Dispatch a typed action
   (`src/types/actions.ts`); the reducer handles it.
3. **Use the design system.** Compose `@/components` and read `useTheme()`.
   Never hardcode colors, font sizes, or spacing.
4. **Keep the safety principles.** See the table in `ARCHITECTURE.md §9`.
5. **Synthetic data only.** No real PII, account numbers, or live APIs.
6. **Type-check before every PR:** `npm run typecheck`.

---

## The contracts (how modules talk)

All cross-feature communication goes through the interfaces in
`src/types/contracts.ts`. Implement your contract inside your feature folder and
keep the signature stable; other developers code against the interface, not your
internals.

| Feature | Contract                | Implementation (today)                          |
| ------- | ----------------------- | ----------------------------------------------- |
| A       | `PersonalisationContract` | `features/onboarding/personalisation.ts`      |
| B       | `PayNowContract`        | `features/paynow/usePayNow.ts` (hook)           |
| C       | `ConciergeContract`     | `features/concierge/concierge.ts` (fallback)    |
| D       | `SafetyContract`        | `features/safety/useSafety.ts` (hook)           |

> Changing a contract signature affects everyone — raise it with the integration
> lead first.

---

## Developer A — Personalisation

**Owns:** `features/onboarding`, `features/home`, and routes `/onboarding`,
`/home`, `/customize`.

Integrate by:

- Expanding onboarding to capture explicit preferences, then dispatching
  `SET_PREFERENCES` and `COMPLETE_ONBOARDING`.
- Implementing the real algorithm in `getPersonalisedHomeLayout(preferences)`.
  Return an ordered `HomeWidget[]` and dispatch `SET_HOME_LAYOUT`.
- Offering accessibility via `SET_DISPLAY_MODE` (re-themes the app instantly).

Do not: remove any widget type so a feature becomes unreachable; infer
preferences from behaviour.

---

## Developer B — PayNow

**Owns:** `features/paynow` and routes under `/paynow`.

Integrate by:

- Using `usePayNow()` for all transaction changes (start, setRecipient,
  setAmount, requestReview, confirmTransaction).
- Expanding `validation.ts` with customer-friendly messages.
- Keeping confirmation an **explicit** customer action on `ReviewScreen`.

Do not: call `confirmTransaction()` from anywhere except an explicit customer
press; bypass the review step; weaken `REVIEW_TRIGGERS`.

Hooks for others: Dev D may insert a checkpoint before confirm; Dev C may add an
"Explain this" affordance (already stubbed on `ReviewScreen`).

---

## Developer C — Concierge

**Owns:** `features/concierge` and route `/concierge`.

Integrate by:

- Adding a real AI provider behind `explain` / `simplify` / `translate` in
  `concierge.ts`.
- **Always** keeping the deterministic fallback path. On any error or when the
  provider is unavailable, return the fallback and set `usedFallback: true`.
- Reading the customer's `language` from `usePreferences()` for translation.

Do not: make the core app depend on AI; confirm transactions; claim AI is used
when the fallback produced the text.

Call it from any feature:

```ts
import { concierge } from '@/features/concierge/concierge';
const res = await concierge.explain('paynow-review');
```

---

## Developer D — Safety / UX

**Owns:** `features/safety`, the shared error/loading/empty states, routes
`/checkpoint` and `/human-assistance`.

Integrate by:

- Using `useSafety()` (requestCheckpoint, pause/resume, requestHumanAssistance).
- Inserting confidence checkpoints before sensitive actions (e.g. route to
  `/checkpoint` before confirm in guided mode — hook already marked on
  `ReviewScreen`).
- Building error recovery on `ErrorState` / `ErrorBoundary`; simulate failures
  with `FAIL_TRANSACTION`.
- Adding accessibility toggles via `SET_DISPLAY_MODE`.

Do not: confirm or cancel on the customer's behalf; remove banking access.

---

## Adding a new action (changes shared state)

1. Add the variant to `AppAction` in `src/types/actions.ts`.
2. Handle it in `sessionReducer` (`src/state/reducer.ts`). The exhaustiveness
   check will fail to compile until you do.
3. Prefer exposing it via your feature hook (e.g. `usePayNow`) rather than
   dispatching raw actions from screens.

## Adding a new route

1. Create the screen in `features/<x>/screens/`.
2. Add a thin re-export file in `src/app/` (see `README.md`).
3. Link to it with `router.push('/your-route')`.

## Pre-PR checklist

- [ ] `npm run typecheck` passes.
- [ ] Changes are confined to my feature folder (or shared changes are agreed).
- [ ] No hardcoded colors / font sizes / spacing (used `useTheme()`).
- [ ] No raw errors shown to the customer.
- [ ] Synthetic data only; no secrets committed.
- [ ] Relevant safety principles preserved (ARCHITECTURE.md §9).
- [ ] The end-to-end demo still runs:
      Onboarding → Home → PayNow → Recipient → Amount → Review → Success.
