# Onboarding + Personalisation feature

**Owner: Developer A (Personalisation)**

Scope owned here:

- onboarding flow (explicit preference capture)
- preference selection UI
- adaptive homepage layout (`home` feature)
- widget ordering + homepage customisation (`customize`)
- reset-to-standard

## Files

- `personalisation.ts` — implements `PersonalisationContract`. Replace the body
  of `getPersonalisedHomeLayout` with the real algorithm. **Keep the signature.**
- `screens/OnboardingScreen.tsx` — a working starter that captures explicit
  preferences and dispatches `SET_PREFERENCES` + `COMPLETE_ONBOARDING`.

## Rules (read before editing)

1. Preferences are **explicit customer choices**. Never infer them.
2. Personalisation reorders/re-emphasises widgets only. **Never remove access**
   to a banking feature (safety principles 3 & 4).
3. Read preferences with `usePreferences()`; change them by dispatching typed
   actions (`SET_PREFERENCES`, `SET_DISPLAY_MODE`, `SET_HOME_LAYOUT`,
   `RESET_PREFERENCES`). Do not mutate state directly.
4. Use `@/components` and `@/theme` — do not hardcode colors/fonts/spacing.

## Integration points

- The home screen calls `personalisation.getPersonalisedHomeLayout(prefs)` to
  build the layout, then dispatches `SET_HOME_LAYOUT`.
- Changing `displayMode` re-themes the whole app automatically (ThemeProvider
  reads `preferences.displayMode`).
