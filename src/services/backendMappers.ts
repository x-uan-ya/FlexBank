import type { AuthResult, UserProfile } from '@/types/auth';
import {
  DEFAULT_PREFERENCES,
  type BankingPurpose,
  type CustomerPreferences,
  type Priority,
} from '@/types/preferences';

import type { BackendPreferences, LoginResponse } from './backendEndpoints';

type BackendPriority = BackendPreferences['priorities'][number];

const PRIORITY_FROM_BACKEND: Record<BackendPriority, Priority> = {
  transfers: 'payments',
  billPayments: 'payments',
  accountOverview: 'moneyManagement',
};

// STOPGAP: the backend has no bankingPurposes yet, so we translate the
// customer's explicit backend choices. Remove once the backend stores purposes.
const PURPOSE_FROM_BACKEND: Record<BackendPriority, BankingPurpose> = {
  transfers: 'everyday',
  billPayments: 'everyday',
  accountOverview: 'managing',
};

function unique<T>(items: T[]): T[] {
  return items.filter((item, index) => items.indexOf(item) === index);
}

/** Turn the backend's preferences into the app's full preferences. */
export function preferencesFromBackend(prefs: BackendPreferences): CustomerPreferences {
  const mapped = unique(prefs.priorities.map((p) => PRIORITY_FROM_BACKEND[p]));
  // Keep every app priority present so nothing becomes unreachable.
  const priorities = [
    ...mapped,
    ...DEFAULT_PREFERENCES.priorities.filter((p) => !mapped.includes(p)),
  ];
  const purposes = unique(prefs.priorities.map((p) => PURPOSE_FROM_BACKEND[p]));

  return {
    ...DEFAULT_PREFERENCES,
    language: prefs.language,
    guidanceLevel: prefs.guidanceLevel,
    displayMode: prefs.displayMode,
    priorities,
    bankingPurposes:
      purposes.length > 0 ? purposes : DEFAULT_PREFERENCES.bankingPurposes,
  };
}

export function profileFromBackend(user: LoginResponse['user']): UserProfile {
  return {
    id: user.id,
    fullName: user.name,
    email: user.email,
    createdAt: new Date().toISOString(),
  };
}

/** Turn a backend login response into the shape the app already uses. */
export function authResultFromBackend(res: LoginResponse): AuthResult {
  return {
    token: res.token,
    profile: profileFromBackend(res.user),
    preferences: preferencesFromBackend(res.preferences),
  };
}