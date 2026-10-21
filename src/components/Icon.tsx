import { Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/**
 * Lightweight, dependency-free icon.
 *
 * To avoid adding an icon package to the prototype, icons are rendered as clean
 * Unicode glyphs inside an optional tinted circle. This keeps bundle size down
 * and stays theme-aware. If the team later adds @expo/vector-icons, swap the
 * glyph map for real icons behind this same component API.
 */

export type IconName =
  | 'paynow'
  | 'scan'
  | 'bill'
  | 'bell'
  | 'profile'
  | 'settings'
  | 'eye'
  | 'eyeOff'
  | 'chevron'
  | 'back'
  | 'check'
  | 'plus'
  | 'overview'
  | 'accounts'
  | 'cards'
  | 'investments'
  | 'loans'
  | 'insights'
  | 'goal'
  | 'shield'
  | 'help'
  | 'info'
  | 'transfer';

const GLYPHS: Record<IconName, string> = {
  paynow: '⇄',
  scan: '▣',
  bill: '🧾',
  bell: '🔔',
  profile: '☰',
  settings: '⚙',
  eye: '👁',
  eyeOff: '⦸',
  chevron: '›',
  back: '‹',
  check: '✓',
  plus: '＋',
  overview: '◉',
  accounts: '▦',
  cards: '▭',
  investments: '📈',
  loans: '🏦',
  insights: '◫',
  goal: '◎',
  shield: '🛡',
  help: '?',
  info: 'ⓘ',
  transfer: '⇅',
};

interface IconProps {
  name: IconName;
  /** Glyph size in points. Defaults scale is handled by the caller. */
  size?: number;
  color?: string;
  /** Render inside a soft tinted circle (used by quick actions / categories). */
  circle?: boolean;
  circleColor?: string;
  circleSize?: number;
}

export function Icon({
  name,
  size = 20,
  color,
  circle = false,
  circleColor,
  circleSize,
}: IconProps) {
  const theme = useTheme();
  const glyphColor = color ?? theme.colors.textPrimary;

  const glyph = (
    <Text
      allowFontScaling={false}
      style={{ fontSize: size, lineHeight: size * 1.1, color: glyphColor, textAlign: 'center' }}
    >
      {GLYPHS[name]}
    </Text>
  );

  if (!circle) return glyph;

  const diameter = circleSize ?? size * 2.1;
  const wrap: ViewStyle = {
    width: diameter,
    height: diameter,
    borderRadius: diameter / 2,
    backgroundColor: circleColor ?? theme.colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  };

  return <View style={wrap}>{glyph}</View>;
}
