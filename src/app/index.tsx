import { Redirect } from 'expo-router';
import { View } from 'react-native';

import { LoadingState } from '@/components';
import { useAuthState } from '@/state';
import { useTheme } from '@/theme';

/**
 * Entry route / auth gate.
 *
 * - loading:   we are restoring any persisted session — show a brief splash.
 * - signedOut: go to login.
 * - signedIn:  go to the personalised home.
 */
export default function Index() {
  const theme = useTheme();
  const { status } = useAuthState();

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <LoadingState message="Loading FlexBank…" />
      </View>
    );
  }

  return <Redirect href={status === 'signedIn' ? '/home' : '/login'} />;
}
