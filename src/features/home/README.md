# Home feature (adaptive homepage)

**Owner: Developer A (Personalisation)**

## Files

- `screens/HomeScreen.tsx` — renders widgets in the order from `useHomeLayout()`.
- `screens/CustomizeScreen.tsx` — reorder/hide widgets, reset-to-standard.
- `components/WidgetRenderer.tsx` — renders one widget by `type`.

## How ordering works

The homepage does **not** compute order itself. It renders the ordered
`homeLayout` from session state. Set that layout by dispatching `SET_HOME_LAYOUT`
with the result of `personalisation.getPersonalisedHomeLayout(preferences)`
(see `../onboarding/personalisation.ts`).

## Rules

1. Never remove access to a banking feature. Hiding a widget only changes
   homepage emphasis; the feature stays reachable elsewhere.
2. Use `@/components` + `@/theme`. No hardcoded sizes/colors.
3. To add a new widget type: extend `HomeWidgetType` in `@/types/home`, add a
   label + default entry, then handle it in `WidgetRenderer`.
