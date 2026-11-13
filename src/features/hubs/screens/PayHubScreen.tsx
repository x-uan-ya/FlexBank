import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppCard,
  AppText,
  Header,
  Icon,
  type IconName,
  ScreenContainer,
} from '@/components';
import { useTheme } from '@/theme';

type PayRoute = '/paynow' | '/scan' | '/bills';

interface PayItem {
  key: string;
  title: string;
  description: string;
  icon: IconName;
  route?: PayRoute;
}

const ITEMS: PayItem[] = [
  {
    key: 'paynow',
    title: 'PayNow',
    description: 'Pay anyone with their mobile number.',
    icon: 'paynow',
    route: '/paynow',
  },
  {
    key: 'scan',
    title: 'Scan & Pay',
    description: 'Scan a QR code to pay.',
    icon: 'paynow',
    route: '/scan',
  },
  {
    key: 'bills',
    title: 'Bill payment',
    description: 'Pay your bills in one place.',
    icon: 'accounts',
    route: '/bills',
  },
  {
    key: 'local',
    title: 'Local transfer',
    description: 'Send money to another local account.',
    icon: 'accounts',
  },
  {
    key: 'overseas',
    title: 'Overseas transfer',
    description: 'Learn how sending money abroad works.',
    icon: 'info',
  },
];

/**
 * Pay & Transfer hub (Frontend).
 *
 * Groups the ways to pay in one place. It only LINKS to existing screens; it
 * never starts, confirms or changes a transfer, so the PayNow safety rules
 * are untouched. Local and overseas transfers are not simulated in this demo.
 */
export function PayHubScreen() {
  const theme = useTheme();
  const router = useRouter();
  const [note, setNote] = useState<string | undefined>();

  function open(item: PayItem) {
    if (item.route) {
      setNote(undefined);
      router.push(item.route);
    } else {
      setNote(
        `${item.title} is not part of this demo. Only PayNow transfers are simulated, and no real money moves.`,
      );
    }
  }

  return (
    <ScreenContainer scroll>
      <Header
        title="Pay & Transfer"
        subtitle="Choose how you want to pay"
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      <View style={{ gap: theme.spacing.sm }}>
        {ITEMS.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={`${item.title}. ${item.description}`}
            onPress={() => open(item)}
          >
            <AppCard>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: theme.spacing.md,
                }}
              >
                <Icon
                  name={item.icon}
                  size={20}
                  color={theme.colors.primary}
                  circle
                  circleColor={theme.colors.accentSoft}
                  circleSize={44}
                />
                <View style={{ flex: 1, gap: theme.spacing.xs }}>
                  <AppText role="bodyStrong">{item.title}</AppText>
                  <AppText role="caption" color="textSecondary">
                    {item.description}
                  </AppText>
                </View>
              </View>
            </AppCard>
          </Pressable>
        ))}
      </View>

      {note ? (
        <View accessibilityRole="alert">
          <AppCard>
            <AppText role="body" color="textSecondary">
              {note}
            </AppText>
          </AppCard>
        </View>
      ) : null}

      <AppText role="caption" color="textMuted" center>
        No real money moves. Synthetic demo data only.
      </AppText>
    </ScreenContainer>
  );
}