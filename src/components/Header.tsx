import { Pressable, View } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

/**
 * Lightweight screen header with an optional back action and right-side slot.
 * Works with Expo Router screens that hide the native header (headerShown:false)
 * so we fully control the look.
 */

interface HeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function Header({ title, subtitle, onBack, right }: HeaderProps) {
  const theme = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.sm,
        paddingVertical: theme.spacing.sm,
      }}
    >
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={onBack}
          hitSlop={12}
          style={{
            width: 40,
            height: 40,
            borderRadius: theme.radius.pill,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.colors.surface,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <AppText role="heading" color="primary">
            {'‹'}
          </AppText>
        </Pressable>
      ) : null}

      <View style={{ flex: 1 }}>
        <AppText role="title">{title}</AppText>
        {subtitle ? (
          <AppText role="caption" color="textSecondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>

      {right ? <View>{right}</View> : null}
    </View>
  );
}
