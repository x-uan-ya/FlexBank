/**
 * AI Banking Concierge — PUBLIC CONTRACT (Developer C).
 *
 * This foundation ships a DETERMINISTIC FALLBACK only. There is NO AI wired in
 * yet, and we make no AI claims. Dev C will add a real provider behind the same
 * contract, and MUST keep this deterministic fallback working so the core
 * banking simulation functions even when AI is unavailable (safety principles
 * 9 & 10).
 *
 * Contract: ConciergeContract { explain, simplify, translate }.
 * Every method returns `{ text, usedFallback }` so the UI can indicate when the
 * deterministic fallback produced the response.
 */

import type { ConciergeContract, ConciergeResponse } from '@/types/contracts';
import { LANGUAGE_LABELS, type Language } from '@/types/preferences';

/** Plain-language explanations for known contexts. Dev C can expand. */
const EXPLANATIONS: Record<string, string> = {
  'paynow-review':
    'This screen shows who you are paying and how much, so you can check everything before you confirm. Nothing is sent until you tap confirm.',
  default:
    'This part of the app helps you bank step by step. You stay in control and nothing happens until you choose to continue.',
};

function fallback(text: string): ConciergeResponse {
  return { text, usedFallback: true };
}

async function explain(context: string): Promise<ConciergeResponse> {
  // TODO: CONCIERGE FEATURE — Dev C: call the real AI provider here, and fall
  // back to this deterministic text if the provider is unavailable or errors.
  return fallback(EXPLANATIONS[context] ?? EXPLANATIONS.default);
}

async function simplify(text: string): Promise<ConciergeResponse> {
  // TODO: CONCIERGE FEATURE — Dev C: real simplification. Deterministic
  // fallback just trims and returns the original text unchanged.
  return fallback(text.trim());
}

async function translate(text: string, language: Language): Promise<ConciergeResponse> {
  // TODO: CONCIERGE FEATURE — Dev C: real translation. The fallback cannot
  // translate, so it returns the original text and notes the target language.
  if (language === 'en') return fallback(text);
  return fallback(`${text}\n\n(Translation to ${LANGUAGE_LABELS[language]} is not available offline.)`);
}

export const concierge: ConciergeContract = { explain, simplify, translate };
