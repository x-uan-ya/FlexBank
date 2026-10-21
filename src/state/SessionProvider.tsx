import {
  createContext,
  useContext,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';

import type { AppAction } from '@/types/actions';
import type { AppSessionState } from '@/types/session';

import { initialSessionState, sessionReducer } from './reducer';

/**
 * SessionProvider owns the single shared state tree and exposes it + a typed
 * dispatch to the whole app. Feature developers consume state via the focused
 * hooks below and change it ONLY by dispatching typed actions.
 *
 * For a student prototype this is intentionally lightweight: React Context +
 * useReducer. No Redux, no external store.
 */

interface SessionContextValue {
  state: AppSessionState;
  dispatch: Dispatch<AppAction>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

interface SessionProviderProps {
  children: ReactNode;
  /** Optional initial state override — used by Demo Mode to load a persona. */
  initialState?: AppSessionState;
}

export function SessionProvider({ children, initialState }: SessionProviderProps) {
  const [state, dispatch] = useReducer(
    sessionReducer,
    initialState ?? initialSessionState,
  );

  const value = useMemo(() => ({ state, dispatch }), [state]);

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
 * Focused convenience hooks. These give each feature a small, stable surface
 * so they don't reach into unrelated state.
 * ------------------------------------------------------------------ */

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
