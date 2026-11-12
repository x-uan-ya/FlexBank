import { api, setAuthToken } from './backend';

/** Preferences exactly as the backend stores them. */
export interface BackendPreferences {
  guidanceLevel: 'quick' | 'balanced' | 'guided';
  displayMode: 'standard' | 'largeText' | 'highClarity';
  language: 'en' | 'zh' | 'ms' | 'ta';
  priorities: Array<'transfers' | 'billPayments' | 'accountOverview'>;
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

/** Log in against the backend and remember the token for later calls. */
export async function loginWithBackend(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const res = await api.post<LoginResponse>('/api/auth/login', { email, password });
  setAuthToken(res.token);
  return res;
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