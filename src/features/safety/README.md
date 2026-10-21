# Safety / UX feature

**Owner: Developer D (Safety / UX)**

Scope owned here: confidence checkpoints, error recovery, human assistance
handoff, accessibility adaptations, and failure scenarios.

## Files

- `useSafety.ts` — the `SafetyContract` as a hook (requestCheckpoint,
  pauseTransaction, resumeTransaction, requestHumanAssistance).
- `screens/CheckpointScreen.tsx` — confidence checkpoint interstitial.
- `screens/HumanAssistanceScreen.tsx` — simulated human handoff.

## Shared pieces you already have

- `ErrorState`, `LoadingState`, `EmptyState`, and the app-level `ErrorBoundary`
  live in `@/components`. Use/extend these for error recovery and graceful
  failure. Always show customer-friendly messages — never raw errors.
- Simulate a failure with `dispatch({ type: 'FAIL_TRANSACTION', payload: {
  reason } })` and recover from there.

## SAFETY rules (the point of this feature)

1. Checkpoints and pauses add safeguards; they never remove access to banking.
2. Safety never confirms a transaction. Confirmation stays an explicit customer
   action on the PayNow review screen.
3. Accessibility: changing `displayMode` re-themes the whole app. You can
   dispatch `SET_DISPLAY_MODE` to offer quick accessibility toggles.
4. Human assistance never cancels progress or confirms on the customer's behalf.
