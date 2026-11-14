# Customisable quick actions

The shortcuts at the top of Home. The customer picks 1 to 4, reorders them, and can reset to suggested ones (Home > Edit, or More > Quick actions).

- `quickActions.ts` is pure logic (catalogue, defaults, add / remove / move). It is unit tested in `tests/quick-actions.test.cjs`.
- `useQuickActions.ts` saves the choice on the device, per user (`quickActions:<userId>`).
- A quick action only OPENS a screen. It never confirms a transfer; PayNow still needs recipient, amount and the customer's own Confirm press.

## Adding a shortcut
Add it to BOTH lists with the same id, label and route, or the parity test fails:
`src/features/quickActions/quickActions.ts` and `backend/src/quickActions.ts`. The route must exist in `src/app`.

## Connecting to the backend later
Replace the `usePersistedState` call in `useQuickActions.ts` with `GET/PUT/DELETE /api/quick-actions`. The server stores ids only. Note the app picks defaults from banking purposes while the server uses registration priorities.
