import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppInput,
  AppText,
  EmptyState,
  Header,
  Icon,
  ScreenContainer,
} from '@/components';
import { MOCK_RECIPIENTS } from '@/data';
import {
  AdaptiveModeSwitcher,
  GuidancePanel,
  PAYNOW_RECIPIENT_CONTENT,
  ReadabilityModeSwitcher,
  TransactionProgress,
} from '@/features/adaptive';
import { usePreferences } from '@/state';
import { useTheme } from '@/theme';
import type { Recipient } from '@/types/banking';

import { usePayNow } from '../usePayNow';
import { lookupRecipientByMobile } from '../proxyLookup';

/**
 * Recipient selection (Developer B). Picks a synthetic recipient and advances
 * to amount entry.
 */
export function RecipientScreen() {
  const theme = useTheme();
  const router = useRouter();
  const paynow = usePayNow();
  const preferences = usePreferences();
  const content = PAYNOW_RECIPIENT_CONTENT[preferences.guidanceLevel];
  const [mobile, setMobile] = useState('');
  const [mobileError, setMobileError] = useState<string | undefined>();
  const [matchedRecipient, setMatchedRecipient] = useState<Recipient | undefined>();
  const editable = paynow.draft.status !== 'confirmed' && paynow.draft.status !== 'cancelled';

  function choose(recipient: Recipient) {
    if (!editable) return;
    paynow.setRecipient(recipient);
    router.push('/paynow/amount');
  }

  function findByMobile() {
    const result = lookupRecipientByMobile(mobile);
    setMatchedRecipient(result.ok ? result.recipient : undefined);
    setMobileError(result.ok ? undefined : result.message);
  }

  return (
    <ScreenContainer>
      <Header
        title="PayNow"
        subtitle={content.heading}
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

      <AdaptiveModeSwitcher />
      <ReadabilityModeSwitcher />

      <TransactionProgress currentStep="recipient" />

      {!editable ? (
        <AppCard elevation="none" style={{ gap: theme.spacing.md }}>
          <AppText>This transfer is complete or cancelled. Start a new transfer to pay someone.</AppText>
          <AppButton label="Start a new transfer" variant="secondary" onPress={() => router.push('/paynow')} />
        </AppCard>
      ) : null}

      {preferences.guidanceLevel === 'guided' ? (
        <GuidancePanel
          title={content.guidanceTitle!}
          body={content.guidanceBody}
          items={content.reminders}
        />
      ) : null}

      <View style={{ gap: theme.spacing.xs }}>
        <AppText role="heading">Saved recipients</AppText>
        <AppText role="caption" color="textSecondary">
          Select a recipient to continue. Check the name and masked destination.
        </AppText>
      </View>

      {MOCK_RECIPIENTS.length === 0 ? (
        <EmptyState
          title="No saved recipients"
          message="Recipients you add will show up here."
        />
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {MOCK_RECIPIENTS.map((recipient) => {
            const selected = paynow.draft.recipientId === recipient.id;
            return (
              <Pressable
                key={recipient.id}
                accessibilityRole="button"
                accessibilityLabel={`Pay ${recipient.name} at ${recipient.bank}`}
                accessibilityState={{ selected, disabled: !editable }}
                disabled={!editable}
                onPress={() => choose(recipient)}
                style={({ pressed }) => (pressed ? { opacity: 0.9 } : null)}
              >
                <AppCard
                  style={
                    selected
                      ? {
                          borderColor: theme.colors.selectedBorder,
                          backgroundColor: theme.colors.selectedBg,
                        }
                      : undefined
                  }
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      flexWrap: theme.mode === 'standard' ? 'nowrap' : 'wrap',
                      alignItems: theme.mode === 'standard' ? 'center' : 'flex-start',
                      gap: theme.spacing.md,
                      borderColor: selected ? theme.colors.accent : 'transparent',
                    }}
                  >
                    <Avatar initials={recipient.initials} />
                    <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 150 }}>
                      <AppText role="subheading">{recipient.name}</AppText>
                      <AppText role="caption" color="textSecondary">
                        {recipient.bank} {recipient.maskedIdentifier}
                      </AppText>
                    </View>
                    {selected ? (
                      <AppText role="label" color="accent">
                        ✓ Selected
                      </AppText>
                    ) : (
                      <Icon name="chevron" size={18} color={theme.colors.textMuted} />
                    )}
                  </View>
                </AppCard>
              </Pressable>
            );
          })}
        </View>
      )}

      <AppCard>
        <View style={{ gap: theme.spacing.md }}>
          <AppText role="subheading">Or find a recipient by mobile number</AppText>
          <AppText role="caption" color="textSecondary">
            Demo directory only. Try 9000 4821 for synthetic recipient Alex Tan.
            No real mobile numbers or bank accounts are searched.
          </AppText>
          <AppInput
            label="PayNow mobile number"
            hint="8 digits, optionally starting with +65"
            value={mobile}
            onChangeText={(value) => {
              setMobile(value);
              setMobileError(undefined);
              setMatchedRecipient(undefined);
            }}
            error={mobileError}
            keyboardType="phone-pad"
            maxLength={20}
            autoCorrect={false}
            editable={editable}
            returnKeyType="done"
            onSubmitEditing={editable ? findByMobile : undefined}
          />
          <AppButton label="Find recipient" variant="secondary" onPress={findByMobile} disabled={!editable} />
          {matchedRecipient ? (
            <View style={{ gap: theme.spacing.sm }}>
              <View accessibilityLiveRegion="polite" style={{ gap: theme.spacing.xs }}>
                <AppText role="bodyStrong">{matchedRecipient.name}</AppText>
                <AppText color="textSecondary">
                  {matchedRecipient.bank} {matchedRecipient.maskedIdentifier}
                </AppText>
                <AppText role="caption" color="textSecondary">
                  Check these demo details before choosing this recipient.
                </AppText>
              </View>
              <AppButton
                label="Use this recipient"
                accessibilityLabel={`Use ${matchedRecipient.name} as recipient`}
                onPress={() => choose(matchedRecipient)}
                disabled={!editable}
              />
            </View>
          ) : null}
        </View>
      </AppCard>
    </ScreenContainer>
  );
}

function Avatar({ initials }: { initials: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        width: 44,
        height: 44,
        borderRadius: theme.radius.pill,
        backgroundColor: theme.colors.accentSoft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <AppText role="label" color="accent">
        {initials}
      </AppText>
    </View>
  );
}
