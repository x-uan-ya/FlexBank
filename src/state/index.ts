/**
 * Global state — public surface.
 *
 *   import { SessionProvider, usePreferences, useAppDispatch } from '@/state';
 */

export {
  SessionProvider,
  useSession,
  useAuth,
  useAuthState,
  usePreferences,
  useTransaction,
  useHomeLayout,
  useAppDispatch,
} from './SessionProvider';
export { initialSessionState, sessionReducer } from './reducer';
