/**
 * Shared types for the FlexBank demo backend.
 *
 * Everything here is SYNTHETIC demo data. No real people, accounts or money.
 */

export const GUIDANCE_LEVELS = ['quick', 'balanced', 'guided'] as const;
export const DISPLAY_MODES = ['standard', 'largeText', 'highClarity'] as const;
export const LANGUAGES = ['en', 'zh', 'ms', 'ta'] as const;
export const PRIORITIES = ['transfers', 'billPayments', 'accountOverview'] as const;

export type GuidanceLevel = (typeof GUIDANCE_LEVELS)[number];
export type DisplayMode = (typeof DISPLAY_MODES)[number];
export type Language = (typeof LANGUAGES)[number];
export type Priority = (typeof PRIORITIES)[number];

/**
 * What the customer EXPLICITLY chose (at registration, changeable any time).
 * Never inferred from behaviour or personal characteristics.
 */
export interface Preferences {
  guidanceLevel: GuidanceLevel;
  displayMode: DisplayMode;
  language: Language;
  priorities: Priority[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  preferences: Preferences;
  createdAt: string;
}

/** A synthetic PayNow recipient. `mobile` is a made-up demo number and is never sent to the app. */
export interface Recipient {
  id: string;
  name: string;
  bank: string;
  maskedIdentifier: string;
  initials: string;
  mobile: string;
}

export interface Account {
  id: string;
  name: string;
  maskedNumber: string;
  balance: number;
  currency: 'SGD';
}

export interface TransactionRecord {
  id: string;
  userId: string;
  /** Idempotency key sent by the app, so a double press never sends twice. */
  requestId: string;
  recipientId: string;
  recipientName: string;
  recipientBank: string;
  recipientIdentifier: string;
  amount: number;
  currency: 'SGD';
  status: 'confirmed' | 'failed';
  failureReason?: string;
  reference: string;
  createdAt: string;
}
