import { View } from 'react-native';

import { AppText } from '@/components';
import { useTheme } from '@/theme';

/**
 * FlexBank wordmark + logo tile. Reused across auth screens for consistent
 * branding. Original mark (no OCBC assets).
 */
export function BrandMark({ size = 'md' }: { size?: 'md' | 'lg' }) {
  const theme = useTheme();
  const tile = size === 'lg' ? 56 : 44;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
      <View
        style={{
          width: tile,
          height: tile,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AppText role={size === 'lg' ? 'title' : 'heading'} style={{ color: theme.colors.onPrimary }}>
          F
        </AppText>
      </View>
      <AppText role={size === 'lg' ? 'title' : 'heading'} color="primary">
        FlexBank
      </AppText>
    </View>
  );
}
