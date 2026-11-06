import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';

import { authService, seedDemoAccounts } from '@/services';
import type { AppAction } from '@/types/actions';
import type { AppSessionState } from '@/types/session';
import type { CustomerPreferences, LoginInput, RegisterInput } from '@/types';

import { initialSessionState, sessionReducer } from './reducer';

/**
 * SessionProvider owns the single shared state tree and exposes it + a typed
 * dispatch to the whole app. On boot it restores any persisted auth session so
 * the customer stays signed in across app restarts.
 *
 * For a student prototype this is intentionally lightweight: React Context +
 * useReducer, backed by the local-first authService. No Redux, no live server.
 */

interface SessionContextValue {
  state: AppSessionState;
  dispatch: Dispatch<AppAction>;
  /** Auth helpers that call the service AND update state. */
  auth: {
    register(input: RegisterInput): Promise<void>;
    login(input: LoginInput): Promise<void>;
    logout(): Promise<void>;
    /** Persist + apply updated preferences for the signed-in user. */
    savePreferences(prefs: CustomerPreferences): Promise<void>;
  };
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  children: ReactNode;
  /** Optional initial state override — used by Demo Mode / tests. */
  initialState?: AppSessionState;
}

export function SessionProvider({ children, initialState }: SessionProviderProps) {
  const [state, dispatch] = useReducer(
    sessionReducer,
    initialState ?? initialSessionState,
  );

  // On boot: restore a persisted session. If there is none, seed the demo
  // accounts (dev/demo convenience) so the demo quick-logins work, then land
  // signed out on the login screen.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        let session = await authService.getSession();
        if (!session) {
          await seedDemoAccounts();
          // Seeding leaves us signed out; re-check (stays null) to be safe.
          session = await authService.getSession();
        }
        if (active) dispatch({ type: 'AUTH_RESTORED', payload: session });
      } catch {
        if (active) dispatch({ type: 'AUTH_RESTORED', payload: null });
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      dispatch,
      auth: {
        async register(input) {
          const result = await authService.register(input);
          dispatch({ type: 'AUTH_SIGNED_IN', payload: result });
        },
        async login(input) {
          const result = await authService.login(input);
          dispatch({ type: 'AUTH_SIGNED_IN', payload: result });
        },
        async logout() {
          await authService.logout();
          dispatch({ type: 'AUTH_SIGNED_OUT' });
        },
        async savePreferences(prefs) {
          const saved = await authService.updatePreferences(prefs);
          dispatch({ type: 'SET_PREFERENCES', payload: saved });
        },
      },
    }),
    [state],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** Low-level access to the whole session + dispatch. Prefer the focused hooks. */
export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within a <SessionProvider>.');
  }
  return ctx;
}

/* ------------------------------------------------------------------ *
 * Focused convenience hooks.
 * ------------------------------------------------------------------ */

/** Auth helpers (register/login/logout/savePreferences). */
export function useAuth() {
  return useSession().auth;
}

/** Current auth status + user profile. */
export function useAuthState() {
  const { state } = useSession();
  return { status: state.authStatus, user: state.user };
}

/** Dev A: read customer preferences. */
export function usePreferences() {
  return useSession().state.preferences;
}

/** Dev B: read the current transaction draft. */
export function useTransaction() {
  return useSession().state.transaction;
}

/** Dev A: read the homepage layout. */
export function useHomeLayout() {
  return useSession().state.homeLayout;
}

/** Everyone: dispatch a typed action. */
export function useAppDispatch(): Dispatch<AppAction> {
  return useSession().dispatch;
}
