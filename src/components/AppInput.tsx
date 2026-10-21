import { useState } from 'react';
import {
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
} from 'react-native';

import { useTheme } from '@/theme';

import { AppText } from './AppText';

/**
 * A labelled text input with built-in error messaging. Typography and spacing
 * scale with the theme. Accessible: label is associated, errors are announced.
 *
 *   <AppInput label="Amount" keyboardType="decimal-pad" value={v} onChangeText={setV} />
 */

interface AppInputProps extends TextInputProps {
  label?: string;
  /** Customer-friendly error message (never raw errors). */
  error?: string;
  hint?: string;
}

export function AppInput({
  label,
  error,
  hint,
  style,
  onFocus,
  onBlur,
  ...rest
}: AppInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? theme.colors.focusRing
      : theme.colors.border;

  const inputStyle: TextStyle = {
    borderWidth: 1,
    borderColor,
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    minHeight: 48,
  };

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {label ? (
        <AppText role="label" color="textSecondary">
          {label}
        </AppText>
      ) : null}

      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.colors.textMuted}
        style={[
          inputStyle,
          { ...theme.typography.body, color: theme.colors.textPrimary },
          style,
        ]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />

      {error ? (
        <AppText role="caption" color="danger" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText role="caption" color="textMuted">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
