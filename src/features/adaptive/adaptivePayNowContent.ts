import type { GuidanceLevel } from '@/types/preferences';

interface StartContent {
  title: string;
  body: string;
  steps?: string[];
}

interface RecipientContent {
  heading: string;
  guidanceTitle?: string;
  guidanceBody?: string;
  reminders?: string[];
}

interface AmountContent {
  guidanceTitle?: string;
  guidanceBody?: string;
  reminders?: string[];
}

interface ReviewContent {
  guidanceTitle?: string;
  guidanceBody?: string;
  checklist?: string[];
}

interface SuccessContent {
  title: string;
  confirmedBody: string;
  nextSteps?: string[];
}

export const PAYNOW_START_CONTENT: Record<GuidanceLevel, StartContent> = {
  quick: {
    title: 'Ready to send?',
    body: 'Choose a recipient, enter an amount, then review and confirm.',
  },
  balanced: {
    title: 'How it works',
    body: 'Choose who to pay, enter an amount, review the details, then confirm. You will always see a summary before anything is sent. This is a simulation using synthetic data.',
  },
  guided: {
    title: 'How PayNow works',
    body: 'We will guide you through each required step. Nothing is sent until you review the details and press Confirm and send.',
    steps: [
      'Choose the saved recipient you intend to pay.',
      'Enter the amount in Singapore dollars.',
      'Review the recipient, masked destination and amount.',
      'Confirm the simulated transfer yourself.',
    ],
  },
};

export const PAYNOW_RECIPIENT_CONTENT: Record<GuidanceLevel, RecipientContent> = {
  quick: { heading: 'Saved recipients' },
  balanced: { heading: 'Who are you paying?' },
  guided: {
    heading: 'Choose the recipient',
    guidanceTitle: 'Step 1: Choose carefully',
    guidanceBody: 'Select the person you intend to pay. No recipient is selected automatically.',
    reminders: [
      'Check the recipient name.',
      'Check the bank and masked destination before continuing.',
    ],
  },
};

export const PAYNOW_AMOUNT_CONTENT: Record<GuidanceLevel, AmountContent> = {
  quick: {},
  balanced: {},
  guided: {
    guidanceTitle: 'Step 2: Enter the amount',
    guidanceBody: 'Enter the amount in Singapore dollars. We will check it before showing the review screen.',
    reminders: [
      'Use numbers and a decimal point if needed.',
      'Any validation problem will appear below the amount field.',
    ],
  },
};

export const PAYNOW_REVIEW_CONTENT: Record<GuidanceLevel, ReviewContent> = {
  quick: {},
  balanced: {},
  guided: {
    guidanceTitle: 'Step 3: Review before confirming',
    guidanceBody: 'Confirm and send is the only action that completes this simulated transfer. Check every detail first.',
    checklist: [
      'The recipient name is correct.',
      'The bank and masked destination are correct.',
      'The amount is what you intend to send.',
    ],
  },
};

export const PAYNOW_SUCCESS_CONTENT: Record<GuidanceLevel, SuccessContent> = {
  quick: {
    title: 'Transfer sent',
    confirmedBody: 'Simulated transfer complete. No real money moved.',
  },
  balanced: {
    title: 'Transfer sent',
    confirmedBody: 'This is a simulated confirmation. No real money moved.',
  },
  guided: {
    title: 'Your simulated transfer is complete',
    confirmedBody: 'The transfer was confirmed and the receipt below summarises what happened. No real money moved.',
    nextSteps: [
      'Review the recipient, amount and reference in the receipt.',
      'Select Back to home when you are ready.',
    ],
  },
};
