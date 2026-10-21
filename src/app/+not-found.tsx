import { useRouter } from 'expo-router';

import { ErrorState, ScreenContainer } from '@/components';

/**
 * Fallback for unknown routes. Shows a calm, customer-friendly message instead
 * of a technical error.
 */
export default function NotFound() {
  const router = useRouter();
  return (
    <ScreenContainer>
      <ErrorState
        title="Page not found"
        message="We could not find that screen. Let's get you back to familiar ground."
        retryLabel="Go home"
        onRetry={() => router.replace('/home')}
      />
    </ScreenContainer>
  );
}
