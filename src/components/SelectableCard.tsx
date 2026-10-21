import { Pressable, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';
import { Icon } from './Icon';

/**
 * A polished selectable option card with a clear selected state.
 *
 * Used by onboarding and settings for guidance / display / priority choices.
 * Communicates selection with colour AND a check indicator AND a border — never
 * colour alone (supports High Clarity and colour-blind users).
 */

interface SelectableCardProps {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
  /** 'radio' for single-select groups, 'checkbox' for multi-select. */
  control?: 'radio' | 'checkbox';
  /** Optional leading accessory (e.g. a swatch or icon). */
  leading?: React.ReactNode;
}

export function SelectableCard({
  title,
  description,
  selected,
  onPress,
  control = 'radio',
  leading,
}: SelectableCardProps) {
  const theme = useTheme();

  const container: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
    backgroundColor: selected ? theme.colors.selectedBg : theme.colors.surface,
    borderWidth: selected || theme.clarity ? 2 : 1,
    borderColor: selected ? theme.colors.selectedBorder : theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    minHeight: 56,
  };

  return (
    <Pressable
      accessibilityRole={control === 'radio' ? 'radio' : 'checkbox'}
      accessibilityState={{ selected, checked: selected }}
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [container, pressed ? { opacity: 0.9 } : null]}
    >
      {leading ? <View>{leading}</View> : null}

      <View style={{ flex: 1, gap: 2 }}>
        <AppText role="bodyStrong" color={selected ? 'textPrimary' : 'textPrimary'}>
          {title}
        </AppText>
        {description ? (
          <AppText role="caption" color="textSecondary">
            {description}
          </AppText>
        ) : null}
      </View>

      <View
        style={{
          width: 26,
          height: 26,
          borderRadius: control === 'radio' ? 13 : theme.radius.sm,
          borderWidth: 2,
          borderColor: selected ? theme.colors.selectedBorder : theme.colors.borderStrong,
          backgroundColor: selected ? theme.colors.primary : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selected ? <Icon name="check" size={15} color={theme.colors.onPrimary} /> : null}
      </View>
    </Pressable>
  );
}
