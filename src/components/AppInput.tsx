import { useState } from 'react';
import {
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
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
  /** Optional element rendered inside the field, right-aligned (e.g. show/hide). */
  rightAccessory?: React.ReactNode;
}

export function AppInput({
  label,
  error,
  hint,
  rightAccessory,
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
    flex: 1,
    paddingVertical: theme.spacing.sm,
    minHeight: 48,
  };

  const fieldWrap: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: theme.clarity ? 2 : 1,
    borderColor,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  };

  return (
    <View style={{ gap: theme.spacing.xs }}>
      {label ? (
        <AppText role="label" color="textSecondary">
          {label}
        </AppText>
      ) : null}

      <View style={fieldWrap}>
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
        {rightAccessory ? <View style={{ marginLeft: theme.spacing.sm }}>{rightAccessory}</View> : null}
      </View>

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
