import { Platform } from 'react-native';

/**
 * Where the FlexBank backend lives. Keep it in ONE place so it is easy to
 * change before the demo.
 * - Browser: localhost
 * - Android emulator: 10.0.2.2 (localhost would be the emulator itself)
 * - Real phone: set EXPO_PUBLIC_API_URL=http://<laptop IP>:4000
 * Only a URL may go in an EXPO_PUBLIC_ variable. Never a key or secret.
 */
const fromEnv = process.env.EXPO_PUBLIC_API_URL;

export const API_BASE_URL: string =
  fromEnv ??
  (Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000');

  
/**
 * Set to true ONLY after the backend stores bankingPurposes (on register and
 * PUT /api/me/preferences). Sending an unknown field to a strict backend
 * would be rejected.
 */
export const BACKEND_STORES_PURPOSES = false;