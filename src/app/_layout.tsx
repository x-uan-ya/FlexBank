import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '@/components';
import { DemoBar } from '@/features/demo/DemoBar';
import { SessionProvider, usePreferences } from '@/state';
import { ThemeProvider } from '@/theme';

/**
 * Root layout and provider stack.
 *
 * Order matters:
 *   SafeAreaProvider
 *     SessionProvider        ← owns global state (preferences, transaction, …)
 *       ThemedApp            ← bridges preferences.displayMode into the theme
 *         ThemeProvider
 *           ErrorBoundary    ← graceful failure, never a raw crash screen
 *             Stack          ← the navigator
 *
 * The ThemeProvider lives INSIDE SessionProvider so changing `displayMode`
 * (an explicit customer choice) re-themes the entire app automatically.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <ThemedApp />
      </SessionProvider>
    </SafeAreaProvider>
  );
}

function ThemedApp() {
  const preferences = usePreferences();

  return (
    <ThemeProvider mode={preferences.displayMode} visualTheme={preferences.visualTheme}>
      <ErrorBoundary>
        <StatusBar style="dark" />
        <View style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          {/* Dev-only persona switcher; renders nothing in production. */}
          <DemoBar />
        </View>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
