import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components';
import { useTheme } from '@/theme';

const TABS = [
  { label: 'Home', spoken: 'Home', route: '/home' },
  { label: 'Plan', spoken: 'Plan', route: '/plan' },
  { label: 'Pay', spoken: 'Pay and Transfer', route: '/pay' },
  { label: 'Rewards', spoken: 'Rewards', route: '/rewards' },
  { label: 'More', spoken: 'More', route: '/more' },
] as const;

/** True only on the five top-level screens, so safety flows keep the full screen. */
export function useTabsVisible(): boolean {
  const pathname = usePathname();
  return TABS.some((tab) => tab.route === pathname);
}

export function BottomTabBar({ onHeight }: { onHeight?: (height: number) => void }) {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  function handleLayout(event: LayoutChangeEvent) {
    onHeight?.(event.nativeEvent.layout.height);
  }

  return (
    <View
      accessibilityRole="tablist"
      onLayout={handleLayout}
      style={{
        flexDirection: 'row',
        backgroundColor: theme.colors.surface,
        borderTopWidth: theme.clarity ? 2 : 1,
        borderTopColor: theme.clarity ? theme.colors.borderStrong : theme.colors.border,
        paddingBottom: insets.bottom,
      }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.route;
        return (
          <Pressable
            key={tab.route}
            accessibilityRole="tab"
            accessibilityLabel={tab.spoken}
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) router.replace(tab.route);
            }}
            style={({ pressed }) => ({
              flex: 1,
              minWidth: 0,
              minHeight: 56,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 2,
              borderTopWidth: 3,
              borderTopColor: active ? theme.colors.primary : 'transparent',
              backgroundColor: pressed ? theme.colors.accentSoft : undefined,
            })}
          >
            <AppText role="label" center color={active ? 'primary' : 'textSecondary'}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}