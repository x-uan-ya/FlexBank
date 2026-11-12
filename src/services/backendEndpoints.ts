import type { BankingPurpose } from '@/types/preferences';

import { api, setAuthToken } from './backend';

/** Preferences exactly as the backend stores them. */
export interface BackendPreferences {
  guidanceLevel: 'quick' | 'balanced' | 'guided';
  displayMode: 'standard' | 'largeText' | 'highClarity';
  language: 'en' | 'zh' | 'ms' | 'ta';
  /** 1 to 3 values. */
  priorities: Array<'transfers' | 'billPayments' | 'accountOverview'>;
  /** Agreed with the backend owners. Optional until it ships. */
  bankingPurposes?: BankingPurpose[];
}

export interface BackendUser {
  id: string;
  name: string;
  email: string;
}

export interface LoginResponse {
  token: string;
  user: BackendUser;
  preferences: BackendPreferences;
}

export interface BackendRecipient {
  id: string;
  name: string;
  bank: string;
  maskedIdentifier: string;
  initials: string;
}

export interface RegisterBody {
  name: string;
  email: string;
  password: string;
  preferences: BackendPreferences;
}

/** Log in against the backend and remember the token for later calls. */
export async function loginWithBackend(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/api/auth/login', { email, password });
  setAuthToken(res.token);
  return res;
}

/** Create a customer on the backend. Response shape is checked in Step 4. */
export async function registerWithBackend(body: RegisterBody): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/api/auth/register', body);
  setAuthToken(res.token);
  return res;
}

/** Save changed preferences for the logged-in customer. */
export async function savePreferencesToBackend(
  preferences: BackendPreferences,
): Promise<void> {
  await api.put('/api/me/preferences', preferences);
}

/** Find a demo recipient by PayNow mobile number. */
export async function lookupRecipientByMobile(
  mobile: string,
): Promise<BackendRecipient> {
  const res = await api.get<{ recipient: BackendRecipient }>(
    `/api/recipients/lookup?mobile=${encodeURIComponent(mobile)}`,
  );
  return res.recipient;
}