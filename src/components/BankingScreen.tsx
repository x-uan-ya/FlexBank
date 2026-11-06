import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { useTheme } from '@/theme';
import { AppText } from './AppText';
import { Header } from './Header';
import { ScreenContainer } from './ScreenContainer';

/** A readable banking column; actions stay in scroll flow with their details. */
export function BankingScreen({ title, subtitle, children, backTo }: {
  title: string; subtitle?: string; children: ReactNode; backTo?: Href;
}) {
  const theme = useTheme();
  const router = useRouter();
  return <ScreenContainer>
    <View testID="banking-column" style={{ width: '100%', maxWidth: 560, alignSelf: 'center', gap: theme.spacing.md }}>
      <View style={{ gap: theme.spacing.xs }}>
        <Header title={title} onBack={() => router.replace(backTo ?? '/home')} />
        {subtitle ? <AppText color="textSecondary">{subtitle}</AppText> : null}
      </View>
      {children}
    </View>
  </ScreenContainer>;
}

export function BankingDemoNotice({ text = 'Demo transfer — no real money will move.' }: { text?: string }) {
  return <AppText role="caption" color="textSecondary">{text}</AppText>;
}
