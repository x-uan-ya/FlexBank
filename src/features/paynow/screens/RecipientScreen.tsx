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
  ScreenContainer,
} from '@/components';
import { MOCK_RECIPIENTS } from '@/data';
import { useTheme } from '@/theme';
import type { Recipient } from '@/types/banking';

import { lookupRecipientByMobile } from '../proxyLookup';
import { usePayNow } from '../usePayNow';

/**
 * Recipient selection (Developer B). The customer either taps a saved
 * recipient or enters a PayNow mobile number. A wrong number shows a friendly
 * message and the customer can correct it on the same screen: nothing else in
 * the transfer draft is lost.
 */
export function RecipientScreen() {
  const theme = useTheme();
  const router = useRouter();
  const paynow = usePayNow();

  const [mobile, setMobile] = useState('');
  const [mobileError, setMobileError] = useState<string | undefined>(undefined);

  function choose(recipient: Recipient) {
    paynow.setRecipient(recipient);
    router.push('/paynow/amount');
  }

  function findByMobile() {
    const result = lookupRecipientByMobile(mobile);
    if (result.ok) {
      setMobileError(undefined);
      choose(result.recipient);
    } else {
      setMobileError(result.message);
    }
  }

  return (
    <ScreenContainer>
      <Header
        title="Who are you paying?"
        onBack={router.canGoBack() ? () => router.back() : undefined}
      />

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
                onPress={() => choose(recipient)}
                style={({ pressed }) => (pressed ? { opacity: 0.9 } : null)}
              >
                <AppCard>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: theme.spacing.md,
                      borderColor: selected ? theme.colors.accent : 'transparent',
                    }}
                  >
                    <Avatar initials={recipient.initials} />
                    <View style={{ flex: 1 }}>
                      <AppText role="subheading">{recipient.name}</AppText>
                      <AppText role="caption" color="textSecondary">
                        {recipient.bank} {recipient.maskedIdentifier}
                      </AppText>
                    </View>
                    {selected ? (
                      <AppText role="label" color="accent">
                        Selected
                      </AppText>
                    ) : null}
                  </View>
                </AppCard>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* Pay by PayNow mobile number. */}
      <AppCard>
        <View style={{ gap: theme.spacing.md }}>
          <AppText role="subheading">Or pay by mobile number</AppText>
          <AppInput
            label="PayNow mobile number"
            hint="8-digit Singapore mobile number"
            value={mobile}
            onChangeText={(text) => {
              setMobile(text);
              if (mobileError) setMobileError(undefined);
            }}
            error={mobileError}
            keyboardType="phone-pad"
            maxLength={14}
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={findByMobile}
          />
          <AppButton label="Find recipient" onPress={findByMobile} />
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
