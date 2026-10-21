import { Platform, type ViewStyle } from 'react-native';

/**
 * Elevation tokens. Cross-platform: iOS uses shadow* props, Android uses
 * elevation. Kept subtle for a calm, premium banking feel.
 */

function shadow(
  elevation: number,
  opacity: number,
  radius: number,
  offsetY: number,
): ViewStyle {
  return Platform.select<ViewStyle>({
    ios: {
      shadowColor: '#0B1F3A',
      shadowOpacity: opacity,
      shadowRadius: radius,
      shadowOffset: { width: 0, height: offsetY },
    },
    android: {
      elevation,
    },
    default: {
      // web / other
      boxShadow: `0px ${offsetY}px ${radius}px rgba(11,31,58,${opacity})`,
    },
  }) as ViewStyle;
}

export const shadows = {
  none: {} as ViewStyle,
  sm: shadow(1, 0.06, 4, 1),
  md: shadow(3, 0.08, 10, 3),
  lg: shadow(6, 0.12, 18, 6),
} as const;

export type Shadows = typeof shadows;
