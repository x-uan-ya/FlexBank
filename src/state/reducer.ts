/**
 * Session reducer — the single place where global state transitions happen.
 *
 * Why a reducer: it keeps every state change explicit, typed, and auditable, so
 * four developers can reason about changes without stepping on each other. No
 * screen mutates state directly; they dispatch typed AppActions.
 *
 * SAFETY PRINCIPLES enforced here:
 * - Changing recipient/amount after review flips status back to `reviewRequired`
 *   (details must be re-reviewed before confirmation).
 * - `CONFIRM_TRANSACTION` only confirms from a review-ready state — it cannot be
 *   used to skip review. It represents an EXPLICIT customer action.
 * - Personalisation actions never touch the transaction or remove features.
 */

import type { AppAction } from '@/types/actions';
import type { AppSessionState } from '@/types/session';
import { MOCK_RECIPIENTS } from '@/data/recipients';
import { simulateOutcome } from '@/features/paynow/outcome';
import { canConfirmTransaction, validateTransaction } from '@/features/paynow/validation';
import { DEFAULT_HOME_LAYOUT } from '@/types/home';
import { DEFAULT_PREFERENCES } from '@/types/preferences';
import { EMPTY_DRAFT, REVIEW_TRIGGERS, type TransactionDraft } from '@/types/transaction';

export const initialSessionState: AppSessionState = {
  authStatus: 'loading',
  user: null,
  preferences: DEFAULT_PREFERENCES,
  transaction: EMPTY_DRAFT,
  homeLayout: DEFAULT_HOME_LAYOUT,
  onboardingCompleted: false,
  interactionMode: 'normal',
  assistanceRequested: false,
};

/** Does this draft field change require a fresh review? */
function requiresReReview(prev: TransactionDraft, changedKey: keyof TransactionDraft): boolean {
  // Only matters once the customer has already reached a reviewable state.
  const alreadyReviewed =
    prev.status === 'readyForReview' || prev.status === 'reviewRequired' ||
    prev.status === 'failed' || prev.requiresReview;
  return alreadyReviewed && REVIEW_TRIGGERS.includes(changedKey);
}

function nowIso(): string {
  return new Date().toISOString();
}

function isTerminal(draft: TransactionDraft): boolean {
  return draft.status === 'confirmed' || draft.status === 'cancelled';
}

export function sessionReducer(
  state: AppSessionState,
  action: AppAction,
): AppSessionState {
  switch (action.type) {
    /* ---------------- Auth / session ---------------- */
    case 'AUTH_RESTORED':
      // Called once on boot after checking persisted storage.
      if (action.payload) {
        return {
          ...state,
          authStatus: 'signedIn',
          user: action.payload.profile,
          preferences: action.payload.preferences,
          onboardingCompleted: true,
        };
      }
      return { ...state, authStatus: 'signedOut', user: null };

    case 'AUTH_SIGNED_IN':
      return {
        ...state,
        authStatus: 'signedIn',
        user: action.payload.profile,
        preferences: action.payload.preferences,
        onboardingCompleted: true,
      };

    case 'AUTH_SIGNED_OUT':
      // Reset to a clean signed-out baseline (no lingering user data).
      return {
        ...initialSessionState,
        authStatus: 'signedOut',
      };

    case 'SET_BANKING_PURPOSES':
      return {
        ...state,
        preferences: { ...state.preferences, bankingPurposes: action.payload },
      };

    /* ---------------- Personalisation (Dev A) ---------------- */
    case 'SET_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload },
      };

    case 'SET_DISPLAY_MODE':
      return {
        ...state,
        preferences: { ...state.preferences, displayMode: action.payload },
      };

    case 'SET_VISUAL_THEME':
      // Cosmetic only — never touches transaction/account state.
      return {
        ...state,
        preferences: { ...state.preferences, visualTheme: action.payload },
      };

    case 'SET_HOME_LAYOUT':
      return { ...state, homeLayout: action.payload };

    case 'COMPLETE_ONBOARDING':
      return { ...state, onboardingCompleted: true };

    case 'RESET_PREFERENCES':
      // Reset-to-standard: neutral defaults + default layout. Never a profile.
      return {
        ...state,
        preferences: DEFAULT_PREFERENCES,
        homeLayout: DEFAULT_HOME_LAYOUT,
        interactionMode: 'normal',
      };

    case 'SET_INTERACTION_MODE':
      return { ...state, interactionMode: action.payload };

    /* ---------------- PayNow (Dev B) ---------------- */
    case 'START_TRANSFER':
      return {
        ...state,
        transaction: { ...EMPTY_DRAFT, status: 'editing', currentStep: 'recipient' },
      };

    case 'SET_RECIPIENT': {
      if (isTerminal(state.transaction)) return state;
      // Derive all display fields from the same trusted synthetic directory.
      const r = MOCK_RECIPIENTS.find((recipient) => recipient.id === action.payload.id);
      if (!r) return state;
      if (
        state.transaction.recipientId === r.id &&
        state.transaction.recipientName === r.name &&
        state.transaction.recipientBank === r.bank &&
        state.transaction.recipientIdentifier === r.maskedIdentifier
      ) return state;
      const needsReview = requiresReReview(state.transaction, 'recipientId');
      return {
        ...state,
        transaction: {
          ...state.transaction,
          recipientId: r.id,
          recipientName: r.name,
          recipientBank: r.bank,
          recipientIdentifier: r.maskedIdentifier,
          status: needsReview ? 'reviewRequired' : 'editing',
          requiresReview: needsReview || state.transaction.requiresReview,
          lastValidatedAt: null,
          failureReason: undefined,
        },
      };
    }

    case 'SET_AMOUNT': {
      if (isTerminal(state.transaction) || !Number.isFinite(action.payload)) return state;
      if (state.transaction.amount === action.payload) return state;
      const needsReview = requiresReReview(state.transaction, 'amount');
      return {
        ...state,
        transaction: {
          ...state.transaction,
          amount: action.payload,
          status: needsReview ? 'reviewRequired' : 'editing',
          requiresReview: needsReview || state.transaction.requiresReview,
          lastValidatedAt: null,
          failureReason: undefined,
        },
      };
    }

    case 'SET_TRANSACTION_STEP':
      if (isTerminal(state.transaction)) return state;
      return {
        ...state,
        transaction: { ...state.transaction, currentStep: action.payload },
      };

    case 'MARK_READY_FOR_REVIEW': {
      // Authoritative guard: direct actions cannot approve incomplete drafts.
      if (
        !['editing', 'reviewRequired', 'failed', 'readyForReview'].includes(state.transaction.status) ||
        !validateTransaction(state.transaction).valid
      ) return state;
      if (canConfirmTransaction(state.transaction)) return state;
      return {
        ...state,
        transaction: {
          ...state.transaction,
          status: 'readyForReview',
          currentStep: 'review',
          requiresReview: false,
          lastValidatedAt: nowIso(),
          failureReason: undefined,
        },
      };
    }

    case 'CONFIRM_TRANSACTION': {
      // Check the current reducer state, never a screen's potentially stale copy.
      if (!canConfirmTransaction(state.transaction)) return state;
      const outcome = simulateOutcome(state.transaction);
      return {
        ...state,
        transaction: {
          ...state.transaction,
          status: outcome.ok ? 'confirmed' : 'failed',
          currentStep: 'confirmation',
          requiresReview: !outcome.ok,
          lastValidatedAt: outcome.ok ? state.transaction.lastValidatedAt : null,
          failureReason: outcome.ok ? undefined : outcome.reason,
        },
      };
    }

    case 'FAIL_TRANSACTION':
      if (
        !canConfirmTransaction(state.transaction) ||
        typeof action.payload.reason !== 'string' || !action.payload.reason.trim()
      ) return state;
      return {
        ...state,
        transaction: {
          ...state.transaction,
          status: 'failed',
          failureReason: action.payload.reason,
          requiresReview: true,
          lastValidatedAt: null,
        },
      };

    case 'CANCEL_TRANSACTION':
      if (isTerminal(state.transaction)) return state;
      return {
        ...state,
        transaction: { ...EMPTY_DRAFT, status: 'cancelled' },
      };

    /* ---------------- Safety (Dev D) ---------------- */
    case 'REQUEST_CHECKPOINT':
      if (isTerminal(state.transaction)) return state;
      return {
        ...state,
        interactionMode: 'guided',
        transaction: { ...state.transaction, currentStep: 'checkpoint' },
      };

    case 'PAUSE_TRANSACTION':
      // Pausing does not lose the draft; it just steps the mode to guided.
      return { ...state, interactionMode: 'guided' };

    case 'RESUME_TRANSACTION':
      return { ...state, interactionMode: 'normal' };

    case 'REQUEST_HUMAN_ASSISTANCE':
      return { ...state, assistanceRequested: true, interactionMode: 'assistance' };

    case 'RESOLVE_HUMAN_ASSISTANCE':
      return { ...state, assistanceRequested: false, interactionMode: 'normal' };

    /* ---------------- Concierge (Dev C) ---------------- */
    case 'REQUEST_EXPLANATION':
      // No state mutation required; Concierge helpers are stateless. This exists
      // as an event hook if Dev C later wants to track explanation requests.
      return state;

    default:
      // Exhaustiveness guard: if a new action is added without a case, TS errors.
      return assertNever(action);
  }
}

function assertNever(action: never): never {
  throw new Error(`Unhandled action: ${JSON.stringify(action)}`);
}
