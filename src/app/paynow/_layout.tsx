import { Stack } from 'expo-router';

/**
 * PayNow stack. Screens manage their own headers via the shared <Header>, so
 * the native header is hidden for a consistent, themed look.
 */
export default function PayNowLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
