import { ReactNode } from 'react';
import { ScrollView, View, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/theme';

/**
 * Standard screen wrapper: safe-area aware, themed background, consistent
 * horizontal padding, and optional scrolling. Every screen should use this so
 * layout stays consistent and adapts to display mode spacing.
 */

interface ScreenContainerProps {
  children: ReactNode;
  scroll?: boolean;
  /** Which safe-area edges to pad. Defaults to top+bottom. */
  edges?: Edge[];
  /** Remove default horizontal padding (e.g. for full-bleed lists). */
  noPadding?: boolean;
  footer?: ReactNode;
}

export function ScreenContainer({
  children,
  scroll = true,
  edges = ['top', 'bottom'],
  noPadding = false,
  footer,
}: ScreenContainerProps) {
  const theme = useTheme();

  const padding: ViewStyle = {
    paddingHorizontal: noPadding ? 0 : theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  };

  const content = scroll ? (
    <ScrollView
      contentContainerStyle={{ ...padding, flexGrow: 1 }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[padding, { flex: 1 }]}>{children}</View>
  );

  return (
    <SafeAreaView
      edges={edges}
      style={{ flex: 1, backgroundColor: theme.colors.background }}
    >
      {content}
      {footer ? (
        <View
          style={{
            paddingHorizontal: theme.spacing.md,
            paddingTop: theme.spacing.sm,
            paddingBottom: theme.spacing.md,
            backgroundColor: theme.colors.background,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
          }}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}
