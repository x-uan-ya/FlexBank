import { useId, useState } from 'react';
import {
  Platform,
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
  /** Optional semantic focus border for a feature-specific form treatment. */
  focusBorderColor?: string;
  /** Optional element rendered inside the field, right-aligned (e.g. show/hide). */
  rightAccessory?: React.ReactNode;
}

export function AppInput({
  label,
  error,
  hint,
  focusBorderColor,
  rightAccessory,
  style,
  onFocus,
  onBlur,
  ...rest
}: AppInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const helperId = useId();

  const borderColor = error
    ? theme.colors.danger
    : focused
      ? focusBorderColor ?? theme.colors.focusRing
      : theme.colors.border;

  const inputStyle: TextStyle = {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    minHeight: 48,
    // Web only: remove the browser's default focus outline so it doesn't show
    // a second (yellow) ring inside our themed border. Ignored on native.
    ...(Platform.OS === 'web' ? { outlineColor: 'transparent', outlineStyle: 'solid', outlineWidth: 0 } : null),
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
          accessibilityHint={error ?? hint}
          aria-invalid={!!error}
          aria-describedby={error || hint ? helperId : undefined}
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
        <AppText nativeID={helperId} role="caption" color="danger" accessibilityRole="alert" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : hint ? (
        <AppText nativeID={helperId} role="caption" color="textSecondary">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
