# FlexBank — Member 2 + Member 3 PayNow Integration Handover

Verified locally on 6 November 2026. This describes implemented code and completed checks; team review items are identified separately.

## Branch and sources

- Working branch: `integration/adaptive-paynow`; HEAD remains `84026a8a4bd899dd2d595162921d68f2fc65bc1c`.
- Member 2 presentation base and protected `member-2-ferlyn`: `84026a8a4bd899dd2d595162921d68f2fc65bc1c`.
- Member 3 source: fetched `origin/feat/paynow/validation`, `cc99ea5c860f8e0e5563a8e95946ac49ad78a299`.
- Integration is an uncommitted working-tree change. Member 3's behaviour was incorporated manually into Member 2's screens, without a Git merge or wholesale screen replacement.
- No commit, push, PR, branch switch, package installation or Home redesign was performed. Existing untracked Home screenshots were preserved.

## Files changed

| Modified file | Integration responsibility |
| --- | --- |
| `src/features/paynow/validation.ts` | Canonical identity, finite amount, cents, limits, balance, currency and review/receipt predicates |
| `src/features/paynow/usePayNow.ts` | Additive `PayNowApi` with cancel/fail; confirmation delegates to reducer |
| `src/state/reducer.ts` | Authoritative validation/outcome, meaningful-change re-review, cancellation and terminal guards |
| `src/features/paynow/screens/RecipientScreen.tsx` | Demo mobile lookup, errors, explicit selection; existing adaptive presentation retained |
| `src/features/paynow/screens/AmountScreen.tsx` | Full candidate validation, preserved raw text, unchanged-value and re-review handling |
| `src/features/paynow/screens/ReviewScreen.tsx` | Separate Edit/Cancel/Confirm; observed outcome navigation and full validation |
| `src/features/paynow/screens/SuccessScreen.tsx` | Guarded receipt, distinct failure/recovery presentation and assistance route |
| `src/features/adaptive/adaptivePayNowContent.ts` | Lookup-aware guidance and mode-specific failure/retry content |
| `package.json` | `npm test` using Node's built-in test runner |

| Created file | Purpose |
| --- | --- |
| `src/features/paynow/proxyLookup.ts` | Member 3's synthetic mobile directory and friendly lookup validation |
| `src/features/paynow/outcome.ts` | Member 3's deterministic S$13.13 failure, guarded by complete validation |
| `tests/helpers/load-ts.cjs` | Execute actual pure TypeScript modules with existing TypeScript dependency |
| `tests/paynow-safety.test.cjs` | Transaction safety and mode-preservation regression tests |
| `scripts/verify-paynow-web.cjs` | Dependency-free Chromium CDP journey/screenshot checks |
| `docs/paynow-integration-handover.md` | This handover |
| `artifacts/paynow-integration-2026-11-06/` | New screenshots, browser results and evidence index |

Shared transaction/action types, shared contracts, theme/components, adaptive switchers, navigation wrappers, Home, recommendation rules, persistence and the dependency lockfile are unchanged. Existing `artifacts/home-*` files are unrelated untracked work: do not stage the entire artifacts folder indiscriminately.

## Overlapping screen changes resolved

- **Recipient:** Kept saved-recipient cards, selected state, Quick/Balanced/Guided, readability and progress. Replaced the obsolete unavailable-recipient caption with a theme-based demo lookup card. Finding a number previews canonical details; only **Use this recipient** selects and navigates. No recipient is selected automatically. Unknown/malformed numbers retain recoverable errors.
- **Amount:** Kept presets, summary, guidance and input presentation. Validates the complete candidate before writing. Raw negative, exponent or malformed input is rejected without silently changing its meaning; more than two entered decimal places is rejected. An unchanged numeric amount does not dispatch a mutation or clear approval. Edits to previously reviewed/failed details leave re-review outstanding.
- **Review:** Kept the V2 identity/destination/amount summary, warnings, guidance and display controls. Added independent **Cancel transfer** alongside **Edit details**. Confirmation is disabled unless fully valid and review-ready. A local explicit-submission flag and effect wait for accepted reducer state before routing to the outcome screen; dispatch alone no longer navigates.
- **Outcome:** Kept the adaptive receipt layout and stable mounted reference. Added a danger-coloured failure state with **Edit details and try again**, **Ask for help** and Home actions. Only valid confirmed state displays a receipt. Invalid/direct-entry state displays a neutral incomplete-transfer message. All outcomes explicitly say no real money moved.
- **Shared behaviour:** Member 3's validation and simulation are used at the state boundary as well as by screens. Member 2's independent guidance/display settings remain intact. There are no unresolved conflict markers or whole-screen replacements.

## Transaction safety changes requiring shared-code review

These changes were implemented under the integration request's explicit authorization. Member 3 and the integration lead should review them before integrating the branch.

1. **Empty/direct-action bypass closed.** `MARK_READY_FOR_REVIEW` only accepts editing/review/retry statuses and a valid complete draft. `CONFIRM_TRANSACTION` checks current reducer state through `canConfirmTransaction`: `readyForReview`, no pending review, a valid validation timestamp, canonical recipient, supported currency and valid amount. Invalid actions return unchanged state. Screen disabled states are additional safeguards.
2. **Canonical identity enforced.** `SET_RECIPIENT` resolves ID through `MOCK_RECIPIENTS` and derives name, bank and masked identifier together. Unknown IDs do nothing. `validateRecipient` rejects inconsistent or missing identity fields in pre-existing/corrupt drafts. The lookup returns the same canonical directory entries.
3. **Amount checks strengthened.** Minimum S$1, maximum S$25,000, finite numeric value, exact cents and available synthetic balance are checked. Missing/unavailable account fails closed. The primary demo balance currently imposes a lower usable ceiling than S$25,000. Exact-cent validation rejects hidden fractional cents such as `13.1300000001`, which could otherwise display S$13.13 but avoid its deterministic failure.
4. **Outcome ownership moved to reducer.** After valid explicit confirmation, `simulateOutcome` records either confirmed or failed state. S$13.13 always fails; invalid input never yields a successful simulation. Failure preserves recipient/amount, clears validation evidence and requires review again. `canShowSuccessfulReceipt` independently rejects invalid, failed, pending-review and failure-trigger drafts.
5. **Meaningful edits invalidate approval.** Changed recipient/amount clears `lastValidatedAt`; previously reviewed/failed drafts require fresh review. Canonically identical recipient or equal numeric amount returns the same state. Valid edits clear stale failure explanations. Display/guidance actions remain untouched and preserve the exact transaction object.
6. **Cancellation and stale events guarded.** Cancel clears an active draft to `EMPTY_DRAFT` with `cancelled` status and retains preferences/layout. Confirmed/cancelled drafts cannot be resurrected by editing, review, confirmation, failure, transaction-step or checkpoint actions; an explicit new transfer can start again. `FAIL_TRANSACTION` now requires a fully valid confirmable draft and a nonblank string reason.

The reducer now imports pure PayNow validation/outcome modules. Those modules use direct synthetic data imports and no React/state dependencies, avoiding an import cycle. This is a modest shared-layer coupling to agree with the integration lead; moving pure domain rules into a separate shared domain module is an optional future architecture decision, not necessary for this integration.

`PayNowContract` signatures are preserved. `PayNowApi` adds `cancelTransfer()`/`failTransfer(reason)` without requiring unrelated callers to change. Safety/assistance owners should review the tighter failure and terminal-state behaviour; temporary `interactionMode` remains independent of persistent `guidanceLevel`.

## Verification completed

- `npm.cmd run typecheck`: passed, no TypeScript errors.
- `npm.cmd test`: 44 tests/subtests passed, zero failures or skips. Executes real reducer/validation/outcome/lookup modules. No new dependencies.
- `git diff --check`: passed. Git only reports the repository's LF-to-CRLF normalization notice for adaptive copy.
- Expo Web: the combined implementation was launched and exercised through actual controls in isolated headless Edge. Test tooling used Node v24.19.0 and built-in fetch/WebSocket/CDP, without injected transaction state.
- Full browser matrix: **320/390/430 px × Standard/High Clarity × Quick/Guided**, at 900 px height. All 12 journeys passed. Lookup error, amount, review, failure and successful retry were measured and captured for every combination.
- Each journey used invalid `123`, then demo `+65 9000-4821`, explicit recipient selection, S$13.13 failure, retry retaining S$13.13, edit to S$13.14, required re-review and explicit successful confirmation. Mode changes preserved lookup errors/input, partially entered `13.`, route, reviewed details and failure recovery.
- Additional browser checks passed: direct empty Review cannot confirm, direct empty Success has no receipt, unchanged amount retains approval, Cancel returns Home, Balanced + Large Text, malformed `1.000`/`-5` preserved and rejected, mounted receipt reference stable across modes, direct incomplete-draft editing recovery.
- Unit tests cover exact draft identity across 63 preference/status combinations, canonical/mismatched recipients, missing/invalid amounts, direct actions, insufficient balance, cancellation clearing, failure retry and terminal immutability. UI route preservation is checked separately in the browser.
- Automated browser metrics found no horizontal document overflow, leaf-text width clipping, tested button/radio target below 48 CSS px, or development-panel overlap. Representative screenshots were visually inspected, including 320 px enlarged-text Review and failure states. High Clarity stacks rows and wraps mode choices; tall content scrolls above the separate footer. These checks are evidence of the tested layouts, not accessibility certification.

The browser script also checks the unchanged Start screen across the same 12 combinations; evidence is indexed with the other screenshots. Screenshots are viewport captures at intentionally different scroll positions, rather than full-page images.

## Reproduction and manual checks

Run `npm.cmd run web -- --port 8087`. For the automated browser script, launch an isolated Chromium/Edge process with a page and remote debugging on port 9229, then run:

```text
node scripts/verify-paynow-web.cjs
node scripts/verify-paynow-web.cjs --extras
node scripts/verify-paynow-web.cjs --starts
```

The script drives that debug page and writes dated artifacts. Use a separate browser profile; it reloads the app between cases. Its React hydration readiness check is test tooling only.

For a manual Expo Web pass, repeat at the required widths and modes:

1. Open PayNow; switch guidance/display independently and start.
2. Find `123`: check the friendly error and change modes without losing it. Find `9000 4821`: verify the Alex Tan/DBS/masked destination preview and no automatic selection. Choose explicitly.
3. Enter `13.` and change modes: text and route stay intact. Try empty, `-5`, `1.000`, S$0.99 and an amount above the available balance: review stays blocked with clear feedback. Quick presets remain available in Quick.
4. Enter S$13.13 and review. Check the full recipient, masked destination, amount and warnings. Change modes: no re-review. Use Edit with an unchanged amount: approval remains. Change amount/recipient: confirmation stays blocked until fresh review.
5. Confirm S$13.13: danger failure presentation, no receipt/green success, retained draft and mode controls. Retry to edit, change to S$13.14, re-review explicitly and confirm: valid synthetic receipt.
6. Start another transfer and cancel from Review: Home opens and the draft is cleared. Directly open Review/Success in a fresh session: incomplete drafts cannot confirm or display a receipt.
7. Scroll the narrow/enlarged-text screens to all controls. Check keyboard tab order/focus and test error/result announcements using actual VoiceOver/TalkBack before release.

## Remaining risks and review decisions

- **Team review required:** shared reducer boundary policy, canonical recipient derivation, reducer-owned simulation, pure feature imports, terminal immutability and stricter `FAIL_TRANSACTION`. Coordinate these with Member 3/integration lead and the safety owner before team integration.
- **Prototype limitation:** synthetic lookup and balance only; no network bank transfer, persisted transfer history, authentication or real payment rail was added. Repeating unchanged S$13.13 intentionally fails again. Editing offers a meaningful recovery path.
- **Receipt limitation retained:** reference stays stable while the receipt is mounted, including preference changes; it is not stored as an immutable transaction record and a remount may generate a new demo reference. A durable receipt/history design needs a separate agreed scope.
- **Accessibility not yet certified:** no physical-device VoiceOver/TalkBack, soft-keyboard, OS font scaling, landscape or short-height testing was performed. Browser target/overflow checks do not establish contrast, reading order, announcement quality or WCAG compliance. The fixed footer leaves less visible content on narrow High Clarity screens, which require scrolling.
- Home/recommendations/persistence remain outside this integration. Do not stage their pre-existing untracked artifacts along with the PayNow change accidentally.

Assessment: the combined Member 2 UI and Member 3 behaviour are implemented and locally tested, ready for shared-code review. No commit or team merge has been performed.
