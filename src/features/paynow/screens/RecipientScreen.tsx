import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppButton, AppCard, AppInput, AppText, EmptyState } from '@/components';
import { BankingDemoNotice, BankingScreen } from '@/components/BankingScreen';
import { MOCK_RECIPIENTS } from '@/data';
import { GuidancePanel, PAYNOW_RECIPIENT_CONTENT, TransactionProgress } from '@/features/adaptive';
import { BankingPreferencesPanel } from '@/features/adaptive/BankingPreferencesPanel';
import { usePreferences } from '@/state';
import { useTheme } from '@/theme';
import type { Recipient } from '@/types/banking';

import { RecipientSummary } from '../components/TransferSummary';
import { lookupRecipientByMobile } from '../proxyLookup';
import { usePayNow } from '../usePayNow';
import { validateRecipient } from '../validation';

/** Selection stays explicit; shared canonical derivation and review rules are unchanged. */
export function RecipientScreen() {
  const theme = useTheme();
  const router = useRouter();
  const paynow = usePayNow();
  const preferences = usePreferences();
  const content = PAYNOW_RECIPIENT_CONTENT[preferences.guidanceLevel];
  const [mobile, setMobile] = useState('');
  const [mobileError, setMobileError] = useState<string | undefined>();
  const [matchedRecipient, setMatchedRecipient] = useState<Recipient | undefined>();
  const [lookupOpen, setLookupOpen] = useState(preferences.guidanceLevel !== 'quick');
  const editable = paynow.draft.status !== 'confirmed' && paynow.draft.status !== 'cancelled';
  const selectedValid = validateRecipient(paynow.draft).valid;
  const quick = preferences.guidanceLevel === 'quick';

  function choose(recipient: Recipient) {
    if (!editable) return;
    paynow.setRecipient(recipient);
  }

  function findByMobile() {
    const result = lookupRecipientByMobile(mobile);
    setMatchedRecipient(result.ok ? result.recipient : undefined);
    setMobileError(result.ok ? undefined : result.message);
  }

  function continueToAmount() {
    if (!editable || !validateRecipient(paynow.draft).valid) return;
    router.push('/paynow/amount');
  }

  return <BankingScreen title="Who are you paying?" backTo="/paynow"
    subtitle="Choose someone you've paid before or look up a mobile number.">
    <TransactionProgress currentStep="recipient" completionLabel="Done" wrapInPairs />
    <BankingPreferencesPanel />

    {!editable ? <AppCard elevation="none">
      <View style={{ gap: theme.spacing.sm }}>
        <AppText>This transfer is complete or cancelled. Start a new transfer to pay someone.</AppText>
        <AppButton label="Start a new transfer" variant="secondary" onPress={() => router.push('/paynow')} />
      </View>
    </AppCard> : null}

    {preferences.guidanceLevel === 'guided' ? <GuidancePanel
      title="Check who will receive your money"
      body={content.guidanceBody}
      items={['Match the name to the person you intend to pay.', 'Check the bank and masked destination before continuing.']}
    /> : null}

    <View style={{ gap: theme.spacing.sm }}>
      <AppText role="heading" accessibilityRole="header">Saved recipients</AppText>
      {!quick ? <AppText role="caption" color="textSecondary">Select a person, then check the selected details below.</AppText> : null}
      {MOCK_RECIPIENTS.length === 0 ? <EmptyState title="No saved recipients" message="You can still try the demo mobile-number lookup." /> :
        MOCK_RECIPIENTS.map(recipient => {
          const selected = paynow.draft.recipientId === recipient.id && selectedValid;
          return <Pressable key={recipient.id} accessibilityRole="button"
            accessibilityLabel={'Pay ' + recipient.name + ' at ' + recipient.bank}
            accessibilityHint="Selects this recipient; check the details before continuing"
            accessibilityState={{ selected, disabled: !editable }} aria-pressed={selected}
            disabled={!editable} onPress={() => choose(recipient)}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}>
            <AppCard elevation="none" style={{
              minHeight: 64, padding: quick ? theme.spacing.sm : theme.spacing.md,
              borderColor: selected ? theme.colors.selectedBorder : theme.clarity ? theme.colors.borderStrong : theme.colors.border,
              backgroundColor: selected ? theme.colors.selectedBg : theme.colors.surface,
              borderWidth: selected || theme.clarity ? 2 : 1,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
                <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
                  style={{ width: 36, height: 36, borderRadius: theme.radius.pill, backgroundColor: theme.colors.accentSoft,
                    alignItems: 'center', justifyContent: 'center' }}>
                  <AppText role="label" color="primary">{recipient.initials}</AppText>
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: theme.spacing.xs }}>
                  <AppText role="bodyStrong">{recipient.name}</AppText>
                  <AppText role="caption" color="textSecondary">{recipient.bank} · {recipient.maskedIdentifier}</AppText>
                  {selected ? <AppText role="caption" color="primary">✓ Selected</AppText> : null}
                </View>
              </View>
            </AppCard>
          </Pressable>;
        })}
    </View>

    <View style={{ gap: theme.spacing.sm }}>
      <AppButton label={lookupOpen ? 'Hide mobile lookup' : 'Look up a mobile number'} variant="secondary"
        accessibilityState={{ expanded: lookupOpen }} aria-expanded={lookupOpen}
        onPress={() => setLookupOpen(open => !open)} />
      {lookupOpen ? <AppCard elevation="none">
        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="subheading" accessibilityRole="header">Mobile-number lookup</AppText>
          <AppText role="caption" color="textSecondary">
            Demo directory only. Try 9000 4821 for Alex Tan. No real mobile numbers or bank accounts are searched.
          </AppText>
          <AppInput label="PayNow mobile number" hint="8 digits, optionally starting with +65"
            value={mobile} onChangeText={value => { setMobile(value); setMobileError(undefined); setMatchedRecipient(undefined); }}
            error={mobileError} keyboardType="phone-pad" maxLength={20} autoCorrect={false}
            editable={editable} returnKeyType="done" onSubmitEditing={editable ? findByMobile : undefined} />
          <AppButton label="Find recipient" variant="secondary" onPress={findByMobile} disabled={!editable} />
          {matchedRecipient ? <View style={{ gap: theme.spacing.sm }}>
            <View accessibilityLiveRegion="polite" style={{ gap: theme.spacing.xs }}>
              <AppText role="bodyStrong">{matchedRecipient.name}</AppText>
              <AppText color="textSecondary">{matchedRecipient.bank} · {matchedRecipient.maskedIdentifier}</AppText>
              <AppText role="caption" color="textSecondary">Check these details before selecting this demo recipient.</AppText>
            </View>
            <AppButton label="Use this recipient" variant="secondary"
              accessibilityLabel={'Use ' + matchedRecipient.name + ' as recipient'}
              onPress={() => choose(matchedRecipient)} disabled={!editable} />
          </View> : null}
        </View>
      </AppCard> : null}
    </View>

    {selectedValid ? <RecipientSummary draft={paynow.draft} title="Selected recipient — check before continuing" /> :
      <AppText role="caption" color="textSecondary">Choose a saved recipient or select a lookup result to continue.</AppText>}
    <AppButton label="Continue to amount" onPress={continueToAmount} disabled={!editable || !selectedValid}
      accessibilityHint="Continues with the selected recipient; no money is sent" />
    <BankingDemoNotice />
  </BankingScreen>;
}
