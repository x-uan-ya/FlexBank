import { View } from 'react-native';

import { Icon, type IconName } from '@/components';
import { useTheme } from '@/theme';

/** Code-drawn dashboard icons; their parent controls provide accessible labels. */
export function HomeIcon({ name, size = 28, color }: {
  name: IconName | 'layers' | 'message'; size?: number; color?: string;
}) {
  const theme = useTheme();
  const ink = color ?? theme.colors.primary;
  const line = (x: number, y: number, width: number, rotation = '0deg') => (
    <View style={{ position: 'absolute', left: x, top: y, width, height: 2,
      borderRadius: 2, backgroundColor: ink, transform: [{ rotate: rotation }] }} />
  );
  let drawing;
  switch (name) {
    case 'message':
      drawing = <><View style={{ position: 'absolute', left: 3, top: 3,
        width: 26, height: 21, borderWidth: 2, borderColor: ink, borderRadius: 5 }} />
        {line(6, 25, 8, '90deg')}{line(6, 25, 10, '-40deg')}
        {line(9, 10, 14)}{line(9, 16, 10)}</>;
      break;
    case 'paynow': case 'transfer':
      drawing = <>{line(6, 8, 22)}{line(20, 4, 10, '45deg')}{line(20, 12, 10, '-45deg')}
        {line(4, 23, 22)}{line(2, 19, 10, '-45deg')}{line(2, 27, 10, '45deg')}</>;
      break;
    case 'scan':
      drawing = <>{[0, 1, 2, 3].map((corner) => <View key={corner} style={{
        position: 'absolute', width: 10, height: 10, borderTopWidth: 2,
        borderLeftWidth: 2, borderColor: ink, borderTopLeftRadius: 4,
        left: corner % 2 ? 19 : 3, top: corner > 1 ? 19 : 3,
        transform: [{ rotate: `${[0, 90, 270, 180][corner]}deg` }],
      }} />)}{line(7, 15, 18)}</>;
      break;
    case 'accounts': case 'cards':
      drawing = <><View style={{ position: 'absolute', left: 2, top: 5, width: 28,
        height: 23, borderWidth: 2, borderColor: ink, borderRadius: 5 }} />
        {line(3, 12, 26)}<View style={{ position: 'absolute', right: 6, bottom: 8,
          width: 4, height: 4, borderRadius: 2, backgroundColor: ink }} /></>;
      break;
    case 'bill':
      drawing = <><View style={{ position: 'absolute', left: 7, top: 2, width: 20,
        height: 28, borderWidth: 2, borderColor: ink, borderRadius: 3 }} />
        {line(12, 11, 10)}{line(12, 17, 10)}{line(12, 23, 7)}</>;
      break;
    case 'insights':
      drawing = <>{[14, 23, 30].map((height, i) => <View key={height} style={{
        position: 'absolute', left: 5 + i * 10, bottom: 1, width: 3, height,
        borderRadius: 2, backgroundColor: ink,
      }} />)}</>;
      break;
    case 'help':
      drawing = <View style={{ width: 30, height: 30, borderRadius: 15,
        borderWidth: 2, borderColor: ink, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="help" size={22} color={ink} />
      </View>;
      break;
    case 'profile':
      drawing = <><View style={{ position: 'absolute', width: 11, height: 11,
        left: 10, top: 2, borderWidth: 2, borderColor: ink, borderRadius: 6 }} />
        <View style={{ position: 'absolute', width: 24, height: 13, left: 4, top: 17,
          borderTopLeftRadius: 13, borderTopRightRadius: 13, borderWidth: 2,
          borderBottomWidth: 0, borderColor: ink }} /></>;
      break;
    case 'eye': case 'eyeOff':
      drawing = <><View style={{ position: 'absolute', width: 29, height: 19,
        left: 1, top: 7, borderRadius: 16, borderWidth: 2, borderColor: ink }} />
        <View style={{ position: 'absolute', width: 9, height: 9, left: 11, top: 12,
          borderRadius: 5, borderWidth: 2, borderColor: ink }} />
        {name === 'eyeOff' ? line(1, 15, 31, '-45deg') : null}</>;
      break;
    case 'layers':
      drawing = <>{[6, 12, 18].map((top) => <View key={top} style={{ position: 'absolute',
        width: 21, height: 12, left: 5, top, borderWidth: 2, borderColor: ink,
        borderRadius: 2, backgroundColor: theme.colors.accentSoft,
        transform: [{ rotate: '-25deg' }],
      }} />)}</>;
      break;
    default: drawing = <Icon name={name} size={30} color={ink} />;
  }
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
    style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
    <View style={{ width: 32, height: 32, transform: [{ scale: size / 32 }] }}>{drawing}</View>
  </View>;
}
