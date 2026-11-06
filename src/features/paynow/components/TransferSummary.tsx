import { View, useWindowDimensions } from 'react-native';
import { AppCard, AppText } from '@/components';
import { MOCK_ACCOUNTS, PRIMARY_ACCOUNT_ID } from '@/data/accounts';
import { useTheme } from '@/theme';
import type { TransactionDraft } from '@/types/transaction';
import { formatMoney } from '@/utils';
import { validateAmount, validateRecipient } from '../validation';

export function RecipientSummary({ draft, title = 'Recipient' }: { draft: TransactionDraft; title?: string }) {
  const theme = useTheme();
  const valid = validateRecipient(draft).valid;
  return <AppCard elevation="none">
    <View style={{ gap: theme.spacing.xs }}>
      <AppText role="caption" color="textSecondary">{title}</AppText>
      <AppText role="bodyStrong">{valid ? draft.recipientName : 'Choose a recipient'}</AppText>
      {valid ? <AppText role="caption" color="textSecondary">{draft.recipientBank} · {draft.recipientIdentifier}</AppText> : null}
    </View>
  </AppCard>;
}

/** Complete review/receipt details; no approval or transaction state changes. */
export function TransferSummary({ draft, reference, source = false, title = 'Transfer details' }: {
  draft: TransactionDraft; reference?: string; source?: boolean; title?: string;
}) {
  const theme = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = theme.mode !== 'standard' || width < 375 || fontScale > 1.1;
  const recipientValid = validateRecipient(draft).valid;
  const account = MOCK_ACCOUNTS.find(item => item.id === PRIMARY_ACCOUNT_ID);
  const rows = [
    { label: 'Recipient', value: recipientValid ? draft.recipientName! : 'Not selected' },
    { label: 'Bank', value: recipientValid ? draft.recipientBank! : 'Not selected' },
    { label: 'Destination', value: recipientValid ? draft.recipientIdentifier! : 'Not selected' },
    { label: 'Amount', value: draft.amount === undefined ? 'Not entered' : validateAmount(draft).valid ? formatMoney(draft.amount, draft.currency) : 'Check the entered amount' },
    ...(source ? [{ label: 'From', value: account ? `${account.name} · ${account.maskedNumber}` : 'Demo account unavailable' }] : []),
    ...(reference ? [{ label: 'Reference', value: reference }] : []),
  ];
  return <AppCard>
    <View style={{ gap: theme.spacing.sm }}>
      <AppText role="subheading" accessibilityRole="header">{title}</AppText>
      {rows.map((row, index) => <View key={row.label} style={{
        flexDirection: stacked ? 'column' : 'row', alignItems: stacked ? 'stretch' : 'flex-start',
        gap: theme.spacing.xs, paddingTop: theme.spacing.sm,
        borderTopWidth: index ? 1 : 0, borderColor: theme.colors.border,
      }}>
        <AppText color="textSecondary" style={stacked ? undefined : { flex: 1 }}>{row.label}</AppText>
        <AppText role={row.label === 'Amount' ? 'heading' : 'bodyStrong'}
          style={{ flex: stacked ? undefined : 2, minWidth: 0, textAlign: stacked ? 'left' : 'right' }}>{row.value}</AppText>
      </View>)}
    </View>
  </AppCard>;
}
