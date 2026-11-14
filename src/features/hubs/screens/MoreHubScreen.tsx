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

type MoreRoute =
  | '/settings'
  | '/customize'
  | '/purposes'
  | '/quick-actions'
  | '/calendar'
  | '/concierge'
  | '/human-assistance';

interface MoreItem {
  title: string;
  description: string;
  icon: IconName;
  route: MoreRoute;
}

interface MoreGroup {
  heading: string;
  items: MoreItem[];
}

const GROUPS: MoreGroup[] = [
  {
    heading: 'Customise',
    items: [
      {
        title: 'Settings',
        description: 'Text size, High Clarity, language and your account.',
        icon: 'accounts',
        route: '/settings',
      },
      {
        title: 'Customise my home',
        description: 'Choose your priorities and arrange widgets.',
        icon: 'goal',
        route: '/customize',
      },
      {
        title: 'My banking purposes',
        description: 'Choose what we show first on your home screen.',
        icon: 'goal',
        route: '/purposes',
      },
      {
        title: 'Quick actions',
        description: 'Choose and order the shortcuts at the top of Home.',
        icon: 'goal',
        route: '/quick-actions',
      },
    ],
  },
  {
    heading: 'Money tools',
    items: [
      {
        title: 'Financial calendar',
        description: 'Bills, income and savings by date (reminders only).',
        icon: 'info',
        route: '/calendar',
      },
    ],
  },
  {
    heading: 'Help',
    items: [
      {
        title: 'Ask the banking concierge',
        description: 'Plain-language explanations at any time.',
        icon: 'help',
        route: '/concierge',
      },
      {
        title: 'Talk to a person',
        description: 'See how human help works (simulated).',
        icon: 'info',
        route: '/human-assistance',
      },
    ],
  },
];

/**
 * More hub (Frontend). Groups customisation and help in one place. It only
 * LINKS to existing screens and never changes preferences or transfers itself.
 */
export function MoreHubScreen() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <ScreenContainer scroll>
      <Header
        title="More"
        subtitle="Settings and help"
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      {GROUPS.map((group) => (
        <View key={group.heading} style={{ gap: theme.spacing.sm }}>
          <AppText role="label" color="textSecondary">
            {group.heading}
          </AppText>
          {group.items.map((item) => (
            <Pressable
              key={item.title}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}. ${item.description}`}
              onPress={() => router.push(item.route)}
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
      ))}
    </ScreenContainer>
  );
}