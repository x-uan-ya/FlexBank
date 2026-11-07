import { View } from 'react-native';

import { AppText } from '@/components';
import { useTheme } from '@/theme';

export type PayNowProgressStep = 'recipient' | 'amount' | 'review' | 'complete';

const STEPS: { id: PayNowProgressStep; label: string }[] = [
  { id: 'recipient', label: 'Recipient' },
  { id: 'amount', label: 'Amount' },
  { id: 'review', label: 'Review' },
  { id: 'complete', label: 'Complete' },
];

interface TransactionProgressProps {
  currentStep: PayNowProgressStep;
  heading?: string;
  completionLabel?: string;
  wrapInPairs?: boolean;
}

/** Compact PayNow progress that wraps safely on narrow screens. */
export function TransactionProgress({ currentStep, heading = 'Your progress', completionLabel = 'Complete', wrapInPairs = false }: TransactionProgressProps) {
  const theme = useTheme();
  const currentIndex = STEPS.findIndex((step) => step.id === currentStep);
  const currentLabel = currentStep === 'complete' ? completionLabel : STEPS[currentIndex]?.label ?? 'Recipient';

  return (
    <View
      accessible
      accessibilityLabel={`PayNow progress: ${currentLabel}, step ${currentIndex + 1} of ${STEPS.length}`}
      style={{ gap: theme.spacing.xs }}
    >
      <AppText role="label">{heading}</AppText>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: theme.spacing.sm,
        }}
      >
        {STEPS.map((step, index) => {
          const active = index === currentIndex;
          const complete = index < currentIndex;
          return (
            <View
              key={step.id}
              style={{
                flexGrow: 1,
                flexBasis: wrapInPairs ? '45%' : theme.mode === 'standard' ? 104 : 140,
                minWidth: wrapInPairs ? theme.mode === 'standard' ? 104 : 140 : undefined,
                flexDirection: 'row',
                alignItems: 'center',
                gap: theme.spacing.xs,
                padding: theme.spacing.xs,
                borderRadius: theme.radius.md,
                backgroundColor: active ? theme.colors.selectedBg : 'transparent',
              }}
            >
              <View
                style={{
                  width: theme.mode === 'standard' ? 24 : 32,
                  height: theme.mode === 'standard' ? 24 : 32,
                  borderRadius: theme.radius.pill,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    active || complete ? theme.colors.primary : theme.colors.surface,
                  borderWidth: active || complete ? 0 : 1,
                  borderColor: theme.colors.borderStrong,
                }}
              >
                <AppText
                  role="caption"
                  style={{
                    color:
                      active || complete
                        ? theme.colors.onPrimary
                        : theme.colors.textSecondary,
                  }}
                >
                  {complete ? '✓' : index + 1}
                </AppText>
              </View>
              <AppText
                role="caption"
                color={active ? 'primary' : 'textSecondary'}
                style={{ flexShrink: 1 }}
              >
                {step.id === 'complete' ? completionLabel : step.label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}
