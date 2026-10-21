# FlexBank Architecture

This document explains how the foundation is structured so four developers can
build independently without constantly editing each other's code.

---

## 1. Feature ownership

The codebase is organised around **feature ownership**. Each developer owns a
folder under `src/features/` and the thin route files that re-export its screens.

| Developer | Area               | Owns (folders)                                           |
| --------- | ------------------ | -------------------------------------------------------- |
| **A**     | Personalisation    | `features/onboarding`, `features/home`                   |
| **B**     | PayNow             | `features/paynow`                                        |
| **C**     | AI Concierge       | `features/concierge`                                     |
| **D**     | Safety / UX        | `features/safety` (+ shared error/loading/empty states)  |
| **You**   | Integration lead   | `state`, `types`, `theme`, `components`, `app`, `data`   |

Shared foundation code (`state`, `types`, `theme`, `components`) is owned by the
integration lead. Features depend on it but should rarely need to change it.

---

## 2. State flow

```
         dispatch(action)                         read via hooks
Screen  ─────────────────▶  sessionReducer  ─────────────────────▶  Screen
                               │
                               ▼
                       AppSessionState
        { preferences, transaction, homeLayout,
          onboardingCompleted, interactionMode,
          assistanceRequested }
```

- **Single source of truth:** `AppSessionState` (`types/session.ts`), held by
  `SessionProvider` (`state/SessionProvider.tsx`).
- **One mutation point:** `sessionReducer` (`state/reducer.ts`). It is the only
  place state changes, so transitions are auditable and testable.
- **Typed actions:** `AppAction` (`types/actions.ts`) is a discriminated union.
  The reducer is exhaustively checked (`assertNever`), so adding an action
  without handling it is a compile error.
- **Focused hooks:** `usePreferences`, `useTransaction`, `useHomeLayout`,
  `useAppDispatch` give each feature a small surface instead of the whole tree.

Why Context + reducer (not Redux): for a student prototype this is the simplest
thing that keeps state changes explicit and typed. No extra dependencies.

---

## 3. Component boundaries

- **Shared UI** lives in `src/components` and is theme-aware. Features compose
  these rather than styling from scratch.
- **Feature UI** lives in `features/<x>/components` and `features/<x>/screens`.
  It is private to that feature.
- **Routes** (`src/app`) are deliberately thin: they only re-export a feature
  screen. This separates the navigation map from feature internals, so moving or
  renaming a screen's implementation never churns the route tree.

```
app/paynow/review.tsx  →  features/paynow/screens/ReviewScreen.tsx
```

---

## 4. Transaction lifecycle

Owned by the reducer; consumed by PayNow (Dev B) via `usePayNow()`.

```
 idle
  │  START_TRANSFER
  ▼
 editing  ──SET_RECIPIENT / SET_AMOUNT──▶ editing
  │  MARK_READY_FOR_REVIEW (after validation passes)
  ▼
 readyForReview
  │                 ╲ SET_RECIPIENT / SET_AMOUNT changed a REVIEW_TRIGGER
  │  CONFIRM_TRANSACTION           ▼
  │  (explicit customer action)   reviewRequired ──"I have reviewed"──▶ readyForReview
  ▼
 confirmed                 (FAIL_TRANSACTION → failed, CANCEL_TRANSACTION → cancelled)
```

Key rules encoded in `state/reducer.ts`:

- Changing recipient or amount **after** reaching review flips status to
  `reviewRequired` (see `REVIEW_TRIGGERS` in `types/transaction.ts`).
- `CONFIRM_TRANSACTION` only confirms from `readyForReview` with no pending
  re-review; otherwise it bumps back to `reviewRequired`. **It cannot skip
  review.**

---

## 5. Personalisation architecture

- Preferences are **explicit** (`CustomerPreferences`) and never inferred.
- The homepage renders an **ordered `homeLayout`** array; it contains no
  ordering logic itself.
- Dev A maps preferences → layout in **one function**:
  `personalisation.getPersonalisedHomeLayout(preferences)`
  (`features/onboarding/personalisation.ts`), then dispatches `SET_HOME_LAYOUT`.
- Changing `displayMode` re-themes the whole app because `ThemeProvider` reads
  `preferences.displayMode` (see the provider stack in `app/_layout.tsx`).

Invariant: personalisation only **reorders / re-emphasises / hides** widgets.
Every banking feature from `DEFAULT_HOME_LAYOUT` remains reachable (the layout
always includes all widgets; hidden ones stay reachable via other routes).

---

## 6. AI separation

The Concierge (Dev C) sits behind the `ConciergeContract` interface
(`types/contracts.ts`). The foundation ships a **deterministic fallback only**
(`features/concierge/concierge.ts`) and makes **no AI claims**.

```
caller ──▶ ConciergeContract { explain, simplify, translate }
                    │
         ┌──────────┴───────────┐
         ▼                      ▼
   (future) AI provider   deterministic fallback  ← always present
```

Each response returns `{ text, usedFallback }`. When Dev C adds a real provider,
the fallback must remain so the app works when AI is unavailable (principles
9 & 10). The Concierge never confirms transactions (principles 1 & 2).

---

## 7. Theme / accessibility architecture

- `theme/theme.ts` builds a `Theme` from a `DisplayMode`.
- Typography (`theme/typography.ts`) and spacing (`theme/spacing.ts`) **scale by
  display mode** (`standard` / `largeText` / `highClarity`). Screens read named
  roles (`theme.typography.body`) instead of hardcoding sizes, so the whole UI
  adapts when the mode changes.
- `ThemeProvider` is mounted **inside** `SessionProvider`, bridged by
  `preferences.displayMode`, so an explicit accessibility choice re-themes the
  app instantly.

---

## 8. Error handling / graceful failure

- App-level `ErrorBoundary` (`components/ErrorBoundary.tsx`) catches render
  crashes and shows a calm fallback — never a raw stack trace.
- `ErrorState`, `LoadingState`, `EmptyState` are shared and customer-friendly.
- `app/+not-found.tsx` handles unknown routes gracefully.
- Dev D owns richer error recovery and failure scenarios, building on these.

---

## 9. Safety principles → where they live

| # | Principle                                        | Enforced in |
| - | ------------------------------------------------ | ----------- |
| 1 | AI never confirms a transaction                  | `concierge.ts` (no confirm access); `reducer` only confirms via `CONFIRM_TRANSACTION` |
| 2 | Confirmation always explicit                     | `ReviewScreen` confirm button; `usePayNow.confirmTransaction` |
| 3 | Personalisation never removes banking access     | `personalisation.ts` (reorders only); `DEFAULT_HOME_LAYOUT` holds all features |
| 4 | Personalisation changes presentation, not security | reducer keeps transaction rules independent of preferences |
| 5 | Details reviewable before confirmation           | `ReviewScreen` |
| 6 | Important changes trigger review-required         | `REVIEW_TRIGGERS` + reducer |
| 7 | No inferred sensitive characteristics            | `CustomerPreferences` are explicit; personas are demo-only |
| 8 | Synthetic data only                              | `src/data/*`, masked identifiers |
| 9 | AI replaceable with deterministic fallback        | `ConciergeContract` + fallback |
| 10| Core works without AI                            | PayNow/Home/Onboarding have no AI dependency |
