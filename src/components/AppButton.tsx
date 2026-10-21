import {
  ActivityIndicator,
  Pressable,
  Text,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { useTheme, type Theme } from '@/theme';

/**
 * Primary interactive button. Variants cover the common banking actions.
 * Accessible by default: role="button", disabled/busy state announced, and a
 * minimum 48pt touch target. Label typography scales with the active theme.
 *
 *   <AppButton label="Continue" onPress={next} />
 *   <AppButton label="Cancel" variant="ghost" onPress={cancel} />
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface AppButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  accessibilityHint?: string;
}

export function AppButton({
  label,
  variant = 'primary',
  loading = false,
  fullWidth = true,
  disabled,
  accessibilityHint,
  ...rest
}: AppButtonProps) {
  const theme = useTheme();
  const isDisabled = disabled || loading;
  const v = resolveVariant(variant, theme);

  const container: ViewStyle = {
    backgroundColor: isDisabled ? theme.colors.disabled : v.bg,
    borderColor: v.border ?? 'transparent',
    borderWidth: v.border ? 1 : 0,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: fullWidth ? 'stretch' : 'flex-start',
    minHeight: 48,
  };

  const labelColor = isDisabled ? theme.colors.onDisabled : v.fg;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      accessibilityHint={accessibilityHint}
      disabled={isDisabled}
      style={({ pressed }) => [container, pressed && !isDisabled ? { opacity: 0.85 } : null]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={labelColor} />
      ) : (
        <Text style={{ ...theme.typography.bodyStrong, color: labelColor }}>{label}</Text>
      )}
    </Pressable>
  );
}

interface VariantPalette {
  bg: string;
  fg: string;
  border?: string;
}

function resolveVariant(variant: ButtonVariant, theme: Theme): VariantPalette {
  switch (variant) {
    case 'secondary':
      return { bg: theme.colors.surface, fg: theme.colors.primary, border: theme.colors.border };
    case 'ghost':
      return { bg: 'transparent', fg: theme.colors.primary };
    case 'danger':
      return { bg: theme.colors.danger, fg: theme.colors.onPrimary };
    case 'primary':
    default:
      return { bg: theme.colors.primary, fg: theme.colors.onPrimary };
  }
}
