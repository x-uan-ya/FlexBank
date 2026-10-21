import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppButton,
  AppCard,
  AppText,
  EmptyState,
  Header,
  ScreenContainer,
} from '@/components';
import { MOCK_RECIPIENTS } from '@/data';
import { useTheme } from '@/theme';
import type { Recipient } from '@/types/banking';

import { usePayNow } from '../usePayNow';

/**
 * Recipient selection (Developer B). Picks a synthetic recipient and advances
 * to amount entry.
 */
export function RecipientScreen() {
  const theme = useTheme();
  const router = useRouter();
  const paynow = usePayNow();

  function choose(recipient: Recipient) {
    paynow.setRecipient(recipient);
    router.push('/paynow/amount');
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

      {/* TODO: PAYNOW FEATURE — Dev B: add-new-recipient flow, search,
          QR/mobile-number entry. */}
      <AppButton
        label="Add a new recipient"
        variant="ghost"
        onPress={() => {
          /* TODO: PAYNOW FEATURE — Dev B */
        }}
      />
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
