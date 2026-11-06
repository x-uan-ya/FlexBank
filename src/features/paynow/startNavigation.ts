import type { InteractionMode } from '@/types/session';
import type { TransactionDraft } from '@/types/transaction';

import { validateRecipient, validateTransaction } from './validation';

type ResumeRoute = '/paynow/recipient' | '/paynow/amount' | '/paynow/review' | '/paynow/success' | '/checkpoint';

/** Read-only entry routing. Does not approve, clear or advance shared state. */
export function getPayNowResumeRoute(draft: TransactionDraft, interactionMode: InteractionMode): ResumeRoute | undefined {
  if (!['editing', 'readyForReview', 'reviewRequired', 'failed'].includes(draft.status)) return undefined;
  // A pending safety check must not be skipped. Existing checkpoint Continue
  // changes interactionMode to normal; it does not clear currentStep.
  if (draft.currentStep === 'checkpoint' && interactionMode !== 'normal') return '/checkpoint';
  if (!validateRecipient(draft).valid) return '/paynow/recipient';
  if (validateTransaction(draft).valid) {
    if (draft.status === 'failed') return '/paynow/success';
    if (draft.status === 'readyForReview' || draft.status === 'reviewRequired' || draft.requiresReview) return '/paynow/review';
  }
  return '/paynow/amount';
}
