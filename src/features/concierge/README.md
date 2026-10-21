# AI Banking Concierge feature

**Owner: Developer C (Concierge)**

Scope owned here: contextual explanations, language simplification, translation,
AI integration, and AI fallback.

## Files

- `concierge.ts` — implements `ConciergeContract` with a DETERMINISTIC FALLBACK
  only. No AI is wired in yet and no AI claims are made.
- `screens/ConciergeScreen.tsx` — a working starter that calls the contract.

## The golden rule (safety principles 9 & 10)

AI must be **replaceable** and the app must work **without** it. Add your real
provider behind the existing methods, and ALWAYS keep a deterministic fallback
that runs when the provider is unavailable or errors. Each response returns
`{ text, usedFallback }` so the UI can show when the fallback was used.

## Also (safety principles 1 & 2)

The Concierge must **never** confirm a transaction or call PayNow's
`confirmTransaction()`. It explains and assists only. Confirmation is always an
explicit customer action.

## Integration points

Other features call:

```ts
import { concierge } from '@/features/concierge/concierge';
await concierge.explain('paynow-review');
await concierge.simplify(text);
await concierge.translate(text, 'zh');
```
