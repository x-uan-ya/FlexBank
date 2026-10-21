# FlexBank

**Adaptive Banking: One Experience for Every Customer** — a competition-grade
mobile banking prototype foundation (OCBC Innovation Challenge, Problem 4).

FlexBank is a **customer-controlled** adaptive banking experience. The customer
explicitly chooses how they want to bank during onboarding, and the app adapts
its homepage and interaction style to those choices. The system **never infers**
sensitive customer characteristics, and the customer can change or override any
preference at any time.

> This repository is the **foundation and architecture** only. The full features
> are built by four feature developers on top of it. See `ARCHITECTURE.md` and
> `INTEGRATION.md`.

---

## Quick start

```bash
npm install
npx expo start
```

Then open the project in **Expo Go** (scan the QR code) or press `i` / `a` for a
simulator. Everything uses **synthetic data** — no real accounts, no live APIs.

### Useful scripts

| Script              | What it does                        |
| ------------------- | ----------------------------------- |
| `npm run start`     | Start the Expo dev server           |
| `npm run android`   | Start on Android                    |
| `npm run ios`       | Start on iOS                        |
| `npm run web`       | Start on web                        |
| `npm run typecheck` | Type-check the project (no emit)    |

### Demo mode

In development a floating **Demo** button (bottom-right) switches between three
synthetic personas (fast / wants-explanations / accessibility-focused). These
are explicit preference bundles for demos, **not** inferred customer categories.
The control only renders in `__DEV__`.

---

## Project structure

```
src/
  app/            Expo Router routes (thin — delegate to feature screens)
    paynow/       Nested PayNow stack
  components/     Shared, theme-aware UI (AppButton, AppText, ScreenContainer…)
  features/       Feature-owned modules (one folder per developer area)
    onboarding/   Dev A — onboarding + personalisation algorithm
    home/         Dev A — adaptive homepage + customise
    paynow/       Dev B — PayNow transfer journey
    concierge/    Dev C — AI concierge (deterministic fallback for now)
    safety/       Dev D — checkpoints, human assistance, error recovery
    demo/         Dev-only persona switcher
  state/          Global session state (Context + useReducer + typed actions)
  data/           Synthetic mock data (accounts, recipients, personas)
  types/          Shared domain types + feature contracts
  theme/          Design system (colors, typography, spacing, ThemeProvider)
  utils/          Small shared helpers (formatters)
```

---

## State management

Lightweight by design: **React Context + `useReducer`**. No Redux.

- The single source of truth is `AppSessionState` (`src/types/session.ts`).
- `SessionProvider` (`src/state`) owns it and exposes typed hooks.
- Screens never mutate state directly — they **dispatch typed actions**
  (`src/types/actions.ts`), handled in one place (`src/state/reducer.ts`).

```ts
import { usePreferences, useTransaction, useAppDispatch } from '@/state';

const prefs = usePreferences();            // read customer preferences
const draft = useTransaction();            // read the PayNow draft
const dispatch = useAppDispatch();         // change state
dispatch({ type: 'SET_DISPLAY_MODE', payload: 'largeText' });
```

### Access preferences / transaction state

- Preferences: `usePreferences()` to read; dispatch `SET_PREFERENCES`,
  `SET_DISPLAY_MODE`, or `RESET_PREFERENCES` to change.
- Transaction: `useTransaction()` to read; PayNow screens use the `usePayNow()`
  hook (`src/features/paynow/usePayNow.ts`) which wraps the typed actions.

---

## Routing

File-based routing via **Expo Router** (`src/app`). Routes are thin and simply
re-export a feature screen, so navigation structure and feature code stay
separate.

```
/                    → redirects to /onboarding or /home
/onboarding          Onboarding (Dev A)
/home                Adaptive homepage (Dev A)
/customize           Homepage customisation (Dev A)
/paynow              PayNow start (Dev B)
/paynow/recipient    Choose recipient (Dev B)
/paynow/amount       Enter amount (Dev B)
/paynow/review       Review + explicit confirm (Dev B, safety-critical)
/paynow/success      Simulated confirmation (Dev B)
/concierge           AI Concierge placeholder (Dev C)
/checkpoint          Confidence checkpoint placeholder (Dev D)
/human-assistance    Human assistance placeholder (Dev D)
```

End-to-end demo journey:
`Onboarding → Home → PayNow → Recipient → Amount → Review → Success`.

---

## How to add a new feature

1. Create `src/features/<yourFeature>/` with `screens/`, `components/`,
   `hooks/`, `utils/`, and a `README.md` describing ownership.
2. If other features need to call it, add a contract interface in
   `src/types/contracts.ts` and implement it inside your feature folder.
3. Keep business logic in your feature folder; keep shared types in `@/types`.

## How to add a new screen

1. Build the screen component under `src/features/<feature>/screens/`.
2. Add a thin route file under `src/app/` that re-exports it, e.g.:
   ```ts
   // src/app/my-screen.tsx
   import { MyScreen } from '@/features/myFeature/screens/MyScreen';
   export default MyScreen;
   ```
3. Navigate with `router.push('/my-screen')`.

## How to use shared components

```tsx
import { ScreenContainer, Header, AppCard, AppText, AppButton } from '@/components';
import { useTheme } from '@/theme';

export function Example() {
  const theme = useTheme();
  return (
    <ScreenContainer footer={<AppButton label="Continue" onPress={() => {}} />}>
      <Header title="Example" />
      <AppCard>
        <AppText role="heading">Hello</AppText>
        <AppText role="body" color="textSecondary">
          Typography and spacing scale automatically with the display mode.
        </AppText>
      </AppCard>
    </ScreenContainer>
  );
}
```

---

## Coding conventions

- **TypeScript strict.** No `any` without a clear reason.
- **Never hardcode** `fontSize`, colors, or spacing. Use `theme.typography.*`,
  `theme.colors.*`, `theme.spacing.*` via `useTheme()`.
- **Import via the `@/` alias** (e.g. `@/components`, `@/state`). Prefer the
  barrel exports (`@/components`, `@/types`, `@/theme`, `@/state`, `@/data`).
- **No direct state mutation.** Dispatch typed actions.
- **Customer-friendly errors only.** Never surface raw errors/stack traces.
- **Synthetic data only.** No real PII, no account numbers, no live APIs.

---

## Git branching expectations

- `main` stays releasable.
- Branch per feature area: `feat/personalisation/...`, `feat/paynow/...`,
  `feat/concierge/...`, `feat/safety/...`.
- Keep changes inside your feature folder. Touching shared files
  (`@/types`, `@/state`, `@/theme`, `@/components`) should be rare, discussed
  with the integration lead, and reviewed — see `INTEGRATION.md`.
- Open a PR into `main`; keep PRs focused and small.

---

## Safety principles (built into the foundation)

1. AI never directly confirms a transaction.
2. Customer confirmation is always explicit.
3. Personalisation never removes access to banking functionality.
4. Personalisation changes prioritisation/presentation, not security.
5. Transaction details are reviewable before confirmation.
6. Important changes can trigger a review-required state.
7. No sensitive customer characteristics are inferred.
8. Synthetic data only.
9. AI is replaceable with a deterministic fallback.
10. The core banking simulation works even if AI is unavailable.

See `ARCHITECTURE.md` for how each principle is enforced in code.
