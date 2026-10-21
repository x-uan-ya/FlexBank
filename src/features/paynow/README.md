# PayNow feature

**Owner: Developer B (PayNow)**

Scope owned here: recipient selection, amount entry, validation, review, and
simulated confirmation.

## Files

- `usePayNow.ts` — the `PayNowContract` as a hook. Screens call these methods;
  they do not dispatch transaction actions directly.
- `validation.ts` — pure, customer-friendly validation.
- `screens/` — `PayNowStartScreen`, `RecipientScreen`, `AmountScreen`,
  `ReviewScreen`, `SuccessScreen`.

## State machine (owned by the reducer, see `@/state/reducer`)

`idle → editing → readyForReview → confirmed`

- Changing recipient/amount after review → `reviewRequired` (must re-review).
- `confirmTransaction()` only confirms from `readyForReview`; otherwise it bumps
  back to `reviewRequired`.

## SAFETY rules (do not weaken)

1. AI must never confirm a transaction. Only an explicit customer press calls
   `confirmTransaction()`.
2. Details must be reviewable before confirmation (`ReviewScreen`).
3. Important changes must trigger re-review (handled in the reducer via
   `REVIEW_TRIGGERS`).
4. Synthetic data only. Masked identifiers only.

## Extending

Read the draft with `usePayNow().draft` (or `useTransaction()`); change it only
through the hook methods / typed actions.
