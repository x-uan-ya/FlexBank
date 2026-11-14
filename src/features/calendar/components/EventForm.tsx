import { useState } from 'react';
import { View } from 'react-native';

import { AppButton, AppCard, AppInput, AppText, Pill } from '@/components';
import { useTheme } from '@/theme';

import {
  EVENT_KINDS,
  EVENT_KIND_LABELS,
  EVENT_REPEATS,
  EVENT_REPEAT_LABELS,
  validateEventDraft,
  type CalendarEvent,
  type EventDraft,
  type EventDraftErrors,
  type EventInput,
} from '../calendar';

interface EventFormProps {
  /** The event being edited, or undefined when adding a new one. */
  event?: CalendarEvent;
  /** Pre-fills the date when adding (the day the customer was looking at). */
  defaultDate: string;
  onSave: (input: EventInput) => void;
  onCancel: () => void;
}

/** Add or edit one calendar event. A reminder or plan only: it never moves money. */
export function EventForm({ event, defaultDate, onSave, onCancel }: EventFormProps) {
  const theme = useTheme();
  const [draft, setDraft] = useState<EventDraft>({
    title: event?.title ?? '',
    kind: event?.kind ?? null,
    amountText: event?.amount !== undefined ? String(event.amount) : '',
    date: event?.date ?? defaultDate,
    repeat: event?.repeat ?? 'none',
    note: event?.note ?? '',
  });
  const [errors, setErrors] = useState<EventDraftErrors>({});

  function change<K extends keyof EventDraft>(key: K, value: EventDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    // Clear the message for this field as soon as the customer starts fixing it.
    // (The amount field is called "amountText" in the draft but "amount" in the errors.)
    const errorKey = (key === 'amountText' ? 'amount' : key) as keyof EventDraftErrors;
    if (errorKey in errors) {
      setErrors((current) => {
        const next = { ...current };
        delete next[errorKey];
        return next;
      });
    }
  }

  function save() {
    const result = validateEventDraft(draft);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    onSave(result.value);
  }

  return (
    <AppCard elevation="none">
      <View style={{ gap: theme.spacing.md }}>
        <AppText role="heading" accessibilityRole="header">{event ? 'Edit event' : 'Add an event'}</AppText>

        <AppInput
          label="Name"
          value={draft.title}
          onChangeText={(text) => change('title', text)}
          placeholder="For example, Phone bill"
          maxLength={60}
          error={errors.title}
        />

        <View style={{ gap: theme.spacing.xs }}>
          <AppText role="label">Type</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {EVENT_KINDS.map((kind) => (
              <Pill
                key={kind}
                label={EVENT_KIND_LABELS[kind]}
                active={draft.kind === kind}
                onPress={() => change('kind', kind)}
              />
            ))}
          </View>
          {errors.kind ? <AppText role="caption" color="danger">{errors.kind}</AppText> : null}
        </View>

        <AppInput
          label="Amount (optional)"
          value={draft.amountText}
          onChangeText={(text) => change('amountText', text)}
          keyboardType="decimal-pad"
          placeholder="For example, 38.90"
          hint="Leave empty if the amount changes."
          error={errors.amount}
        />

        <AppInput
          label="Date"
          value={draft.date}
          onChangeText={(text) => change('date', text)}
          placeholder="YYYY-MM-DD"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={10}
          hint="Year, month, day. For example 2026-12-25."
          error={errors.date}
        />

        <View style={{ gap: theme.spacing.xs }}>
          <AppText role="label">How often</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
            {EVENT_REPEATS.map((repeat) => (
              <Pill
                key={repeat}
                label={EVENT_REPEAT_LABELS[repeat]}
                active={draft.repeat === repeat}
                onPress={() => change('repeat', repeat)}
              />
            ))}
          </View>
          {event && event.repeat !== 'none' ? (
            <AppText role="caption" color="textSecondary">
              Changing this event changes every date in the series.
            </AppText>
          ) : null}
        </View>

        <AppInput
          label="Note (optional)"
          value={draft.note}
          onChangeText={(text) => change('note', text)}
          maxLength={200}
          error={errors.note}
        />

        <AppText role="caption" color="textSecondary">
          This is a reminder only. It never sends money.
        </AppText>

        <View style={{ gap: theme.spacing.sm }}>
          <AppButton label={event ? 'Save changes' : 'Add event'} onPress={save} />
          <AppButton label="Cancel" variant="secondary" onPress={onCancel} />
        </View>
      </View>
    </AppCard>
  );
}
