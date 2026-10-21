import { Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme';
import type { TypographyRole } from '@/theme';

/**
 * AppText renders text using a named typography role from the active theme.
 * Because the theme adapts to the customer's displayMode, text automatically
 * scales for largeText / highClarity — screens never hardcode fontSize.
 *
 *   <AppText role="heading">Accounts</AppText>
 *   <AppText role="body" color="textSecondary">Balance</AppText>
 */

type ColorToken =
  | 'textPrimary'
  | 'textSecondary'
  | 'textMuted'
  | 'textInverse'
  | 'primary'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger';

interface AppTextProps extends Omit<TextProps, 'role'> {
  /** Typography role from the theme (not the ARIA role). */
  role?: TypographyRole;
  color?: ColorToken;
  center?: boolean;
}

export function AppText({
  role = 'body',
  color = 'textPrimary',
  center = false,
  style,
  children,
  ...rest
}: AppTextProps) {
  const theme = useTheme();

  const base: TextStyle = {
    ...theme.typography[role],
    color: theme.colors[color],
    ...(center ? { textAlign: 'center' } : null),
  };

  return (
    <Text style={[base, style]} {...rest}>
      {children}
    </Text>
  );
}
