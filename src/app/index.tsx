import { Redirect } from 'expo-router';

import { useSession } from '@/state';

/**
 * Entry route. Sends the customer to onboarding until they have completed it,
 * then to the adaptive home.
 */
export default function Index() {
  const { state } = useSession();
  return <Redirect href={state.onboardingCompleted ? '/home' : '/onboarding'} />;
}
