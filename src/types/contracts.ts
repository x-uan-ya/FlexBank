/**
 * Feature contracts — the interfaces that define how feature modules talk to
 * each other and to the shell. These are PLACEHOLDERS: they describe the shape
 * of each feature's public API so the four developers can build against stable
 * boundaries without reading each other's internals.
 *
 * Each feature module exports an implementation of its contract (initially a
 * safe no-op / deterministic stub). Replace the stub body, keep the signature.
 */

import type { CustomerPreferences, Language } from './preferences';
import type { HomeWidget } from './home';
import type { Recipient } from './banking';
import type { TransactionDraft } from './transaction';

/* ------------------------------------------------------------------ *
 * Personalisation (Developer A)
 * ------------------------------------------------------------------ */
export interface PersonalisationContract {
  /**
   * Map explicit customer preferences to an ordered homepage layout.
   * MUST NOT remove access to core banking features (safety principle 3/4):
   * reorder/hide for emphasis only; hidden features remain reachable elsewhere.
   */
  getPersonalisedHomeLayout(preferences: CustomerPreferences): HomeWidget[];
}

/* ------------------------------------------------------------------ *
 * PayNow (Developer B)
 * ------------------------------------------------------------------ */
export interface ValidationResult {
  valid: boolean;
  /** Customer-friendly messages (never raw errors). */
  messages: string[];
}

export interface PayNowContract {
  /** Begin a new transfer (resets the draft to editing). */
  startTransfer(): void;
  setRecipient(recipient: Recipient): void;
  setAmount(amount: number): void;
  /** Validate the current draft; returns friendly result, does not confirm. */
  validateTransaction(draft: TransactionDraft): ValidationResult;
  /** Move to review when valid. */
  requestReview(): void;
  /**
   * Confirm the transfer. MUST be called only as a result of an EXPLICIT
   * customer action (safety principles 1 & 2). AI must never call this.
   */
  confirmTransaction(): void;
}

/* ------------------------------------------------------------------ *
 * Concierge (Developer C)
 * ------------------------------------------------------------------ */
export interface ConciergeResponse {
  text: string;
  /** True when produced by the deterministic fallback (AI unavailable). */
  usedFallback: boolean;
}

export interface ConciergeContract {
  /** Explain the given context (e.g. a screen or term) in plain language. */
  explain(context: string): Promise<ConciergeResponse>;
  /** Simplify arbitrary text. */
  simplify(text: string): Promise<ConciergeResponse>;
  /** Translate text to a target language. */
  translate(text: string, language: Language): Promise<ConciergeResponse>;
}

/* ------------------------------------------------------------------ *
 * Safety / UX (Developer D)
 * ------------------------------------------------------------------ */
export interface SafetyContract {
  /** Insert a confidence checkpoint before a sensitive action. */
  requestCheckpoint(): void;
  pauseTransaction(): void;
  resumeTransaction(): void;
  /** Hand off to a (simulated) human agent. */
  requestHumanAssistance(): void;
}
