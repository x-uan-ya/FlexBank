import { Pressable, View } from 'react-native';

import { getColors, useTheme } from '@/theme';
import type { VisualTheme } from '@/types/preferences';

import { AppText } from './AppText';
import { Icon } from './Icon';

/**
 * A small visual preview swatch for a VisualTheme, used in onboarding/settings.
 * It renders a mini mock (hero bar + accent dot + surface line) using that
 * theme's actual colours, so the customer sees the style before choosing it.
 *
 * Theme selection is cosmetic — see ARCHITECTURE: it never changes banking
 * logic. The preview deliberately uses placeholder shapes rather than any
 * copyrighted campaign artwork.
 */

interface ThemePreviewProps {
  theme: VisualTheme;
  label: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}

export function ThemePreview({
  theme: visualTheme,
  label,
  description,
  selected,
  onPress,
}: ThemePreviewProps) {
  const t = useTheme();
  // Preview always shows the target theme's own colours (standard display).
  const c = getColors(visualTheme, 'standard');

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} theme`}
      accessibilityHint={description}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 132,
          borderRadius: t.radius.lg,
          borderWidth: selected || t.clarity ? 2 : 1,
          borderColor: selected ? t.colors.selectedBorder : t.colors.border,
          backgroundColor: t.colors.surface,
          overflow: 'hidden',
        },
        pressed ? { opacity: 0.9 } : null,
      ]}
    >
      {/* Mini mock */}
      <View style={{ height: 70, backgroundColor: c.hero, padding: 10, justifyContent: 'space-between' }}>
        <View
          style={{
            width: 34,
            height: 8,
            borderRadius: 4,
            backgroundColor: c.heroArtTint,
          }}
        />
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: c.onHero }} />
          <View style={{ width: 44, height: 6, borderRadius: 3, backgroundColor: c.heroArtTint }} />
        </View>
      </View>
      <View style={{ backgroundColor: c.background, padding: 10, gap: 6 }}>
        <View style={{ height: 6, width: '80%', borderRadius: 3, backgroundColor: c.border }} />
        <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
          <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: c.accent }} />
          <View style={{ height: 6, width: 40, borderRadius: 3, backgroundColor: c.border }} />
        </View>
      </View>

      {/* Footer label + selected check */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 10,
          paddingVertical: 8,
          backgroundColor: selected ? t.colors.selectedBg : t.colors.surface,
        }}
      >
        <AppText role="caption" color="textPrimary" style={{ flex: 1 }}>
          {label}
        </AppText>
        {selected ? <Icon name="check" size={14} color={t.colors.primary} /> : null}
      </View>
    </Pressable>
  );
}
