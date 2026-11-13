import type { AuthResult, UserProfile } from '@/types/auth';
import { BACKEND_STORES_PURPOSES } from '@/config/api';
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

// Used only when the backend has no bankingPurposes for a customer.
const PURPOSE_FROM_BACKEND: Record<BackendPriority, BankingPurpose> = {
  transfers: 'everyday',
  billPayments: 'everyday',
  accountOverview: 'managing',
};

function unique<T>(items: T[]): T[] {
  return items.filter((item, index) => items.indexOf(item) === index);
}

/** Backend preferences -> the app's full preferences. */
export function preferencesFromBackend(prefs: BackendPreferences): CustomerPreferences {
  const mapped = unique(prefs.priorities.map((p) => PRIORITY_FROM_BACKEND[p]));
  // Keep every app priority present so nothing becomes unreachable.
  const priorities = [
    ...mapped,
    ...DEFAULT_PREFERENCES.priorities.filter((p) => !mapped.includes(p)),
  ];

  const fallbackPurposes = unique(prefs.priorities.map((p) => PURPOSE_FROM_BACKEND[p]));
  const bankingPurposes =
    prefs.bankingPurposes && prefs.bankingPurposes.length > 0
      ? prefs.bankingPurposes
      : fallbackPurposes.length > 0
        ? fallbackPurposes
        : DEFAULT_PREFERENCES.bankingPurposes;

  return {
    ...DEFAULT_PREFERENCES,
    language: prefs.language,
    guidanceLevel: prefs.guidanceLevel,
    displayMode: prefs.displayMode,
    priorities,
    bankingPurposes,
  };
}

/** The app's preferences -> what the backend accepts. */
export function preferencesToBackend(prefs: CustomerPreferences): BackendPreferences {
  const priorities: BackendPreferences['priorities'] = [];
  if (prefs.priorities.includes('payments') || prefs.bankingPurposes.includes('everyday')) {
    priorities.push('transfers', 'billPayments');
  }
  if (prefs.priorities.includes('moneyManagement') || prefs.bankingPurposes.includes('managing')) {
    priorities.push('accountOverview');
  }
  return {
    language: prefs.language,
    guidanceLevel: prefs.guidanceLevel,
    displayMode: prefs.displayMode,
    // The backend accepts 1 to 3 values.
    priorities: priorities.length > 0 ? unique(priorities).slice(0, 3) : ['transfers'],
    ...(BACKEND_STORES_PURPOSES ? { bankingPurposes: prefs.bankingPurposes } : {}),
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

/** A backend login response -> the shape the app already uses. */
export function authResultFromBackend(res: LoginResponse): AuthResult {
  return {
    token: res.token,
    profile: profileFromBackend(res.user),
    preferences: preferencesFromBackend(res.preferences),
  };
}