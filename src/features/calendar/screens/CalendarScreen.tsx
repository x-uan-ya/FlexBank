import { useMemo, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppButton, AppCard, AppText, Header, Pill, ScreenContainer } from '@/components';
import { useTheme } from '@/theme';
import { formatMoney } from '@/utils/format';

import {
  EVENT_KIND_LABELS,
  EVENT_REPEAT_LABELS,
  MAX_EVENTS,
  MONTH_NAMES,
  addDays,
  buildMonthGrid,
  expandEvents,
  formatDate,
  localToday,
  longDateLabel,
  monthRange,
  shiftMonth,
  shortDateLabel,
  summarise,
  type EventKind,
  type Occurrence,
} from '../calendar';
import { EventForm } from '../components/EventForm';
import { useCalendar } from '../useCalendar';

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const WEEKDAY_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const UPCOMING_DAYS = 14;
const UPCOMING_SHOWN = 5;

const KIND_TONE: Record<EventKind, 'default' | 'accent' | 'success' | 'warning'> = {
  bill: 'warning',
  income: 'success',
  savings: 'accent',
  reminder: 'default',
};

/**
 * Financial calendar: bills, income, savings and reminders by date.
 * Reminders only. Nothing on this screen moves money.
 */
export function CalendarScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { events, isSample, atLimit, addEvent, updateEvent, removeEvent, resetToSamples } = useCalendar();

  const today = useMemo(() => localToday(), []);
  const todayText = formatDate(today);
  const [month, setMonth] = useState({ y: today.y, m: today.m });
  const [selected, setSelected] = useState(todayText);
  const [form, setForm] = useState<{ mode: 'add' } | { mode: 'edit'; eventId: string } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [status, setStatus] = useState('');

  const range = monthRange(month.y, month.m);
  const occurrences = useMemo(() => expandEvents(events, range.from, range.to), [events, range.from, range.to]);
  const summary = useMemo(() => summarise(occurrences), [occurrences]);
  const weeks = useMemo(() => buildMonthGrid(month.y, month.m), [month.y, month.m]);
  const upcoming = useMemo(
    () => expandEvents(events, todayText, formatDate(addDays(today, UPCOMING_DAYS - 1))).slice(0, UPCOMING_SHOWN),
    [events, today, todayText],
  );

  const byDate = useMemo(() => {
    const map = new Map<string, Occurrence[]>();
    for (const item of occurrences) map.set(item.date, [...(map.get(item.date) ?? []), item]);
    return map;
  }, [occurrences]);
  const onSelectedDay = selected >= range.from && selected <= range.to ? byDate.get(selected) ?? [] : [];
  const editing = form?.mode === 'edit' ? events.find((event) => event.id === form.eventId) : undefined;

  function announce(message: string) {
    setStatus(message);
    // Web and Android read the live region below; avoid announcing twice there.
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(message);
  }

  function goBack() {
    if (router.canGoBack()) router.back();
    else router.replace('/home');
  }

  function goToMonth(by: -1 | 1) {
    const next = shiftMonth(month, by);
    setMonth(next);
    // Keep a sensible day selected: today if it is in that month, otherwise the 1st.
    setSelected(next.y === today.y && next.m === today.m ? todayText : formatDate({ ...next, d: 1 }));
    setForm(null);
    setConfirmDeleteId(null);
  }

  function openAdd() {
    setConfirmDeleteId(null);
    setForm({ mode: 'add' });
  }

  return (
    <ScreenContainer>
      <View style={{ width: '100%', maxWidth: 560, alignSelf: 'center', gap: theme.spacing.lg }}>
        <View style={{ gap: theme.spacing.xs }}>
          <Header title="Calendar" subtitle="Bills, income and savings by date" onBack={goBack} />
          <AppText role="caption" color="textSecondary">
            Reminders only. Nothing here sends money. To pay a bill, use Pay & Transfer.
          </AppText>
        </View>

        {isSample ? (
          <AppCard elevation="none">
            <AppText role="caption" color="textSecondary">
              These are sample events for the demo. Add, edit or delete any of them to make the calendar your own.
            </AppText>
          </AppCard>
        ) : null}

        {/* Month switcher */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
          <AppButton
            label="‹"
            variant="secondary"
            fullWidth={false}
            onPress={() => goToMonth(-1)}
            accessibilityLabel="Previous month"
          />
          <AppText role="heading" accessibilityRole="header" center style={{ flex: 1 }}>
            {MONTH_NAMES[month.m - 1]} {month.y}
          </AppText>
          <AppButton
            label="›"
            variant="secondary"
            fullWidth={false}
            onPress={() => goToMonth(1)}
            accessibilityLabel="Next month"
          />
        </View>

        {/* Month totals */}
        <AppCard>
          <View style={{ gap: theme.spacing.sm }}>
            <AppText role="subheading">This month</AppText>
            <SummaryRow label="Bills due" value={formatMoney(summary.billsTotal)} />
            <SummaryRow label="Income expected" value={formatMoney(summary.incomeTotal)} />
            <SummaryRow label="Savings planned" value={formatMoney(summary.savingsTotal)} />
            <SummaryRow label="Left over" value={formatMoney(summary.leftover)} strong />
            <AppText role="caption" color="textSecondary">
              Adds up only the events that have an amount. Left over = income − bills − savings.
            </AppText>
          </View>
        </AppCard>

        {/* Month grid */}
        <View style={{ gap: theme.spacing.xs }} accessibilityRole="none">
          <View style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
            {WEEKDAY_INITIALS.map((initial, index) => (
              <View key={WEEKDAY_FULL[index]} style={{ flex: 1, alignItems: 'center' }} accessible accessibilityLabel={WEEKDAY_FULL[index]}>
                <AppText role="caption" color="textSecondary">{initial}</AppText>
              </View>
            ))}
          </View>
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={{ flexDirection: 'row', gap: theme.spacing.xs }}>
              {week.map((date, cellIndex) => {
                if (!date) return <View key={`blank-${cellIndex}`} style={{ flex: 1 }} />;
                const count = byDate.get(date)?.length ?? 0;
                const isSelected = date === selected;
                const isToday = date === todayText;
                const day = Number(date.slice(8));
                return (
                  <Pressable
                    key={date}
                    accessibilityRole="button"
                    accessibilityLabel={`${longDateLabel(date)}${isToday ? ', today' : ''}${
                      count > 0 ? `, ${count} ${count === 1 ? 'event' : 'events'}` : ''
                    }`}
                    accessibilityState={{ selected: isSelected }}
                    onPress={() => {
                      setSelected(date);
                      setForm(null);
                      setConfirmDeleteId(null);
                    }}
                    style={({ pressed }) => ({
                      flex: 1,
                      minHeight: 48,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: theme.radius.md,
                      borderWidth: isSelected || theme.clarity ? 2 : 1,
                      borderColor: isSelected ? theme.colors.selectedBorder : theme.clarity ? theme.colors.borderStrong : theme.colors.border,
                      backgroundColor: isSelected ? theme.colors.selectedBg : theme.colors.surface,
                      opacity: pressed ? 0.75 : 1,
                    })}
                  >
                    <AppText role={isToday ? 'bodyStrong' : 'body'}>{day}</AppText>
                    {/* A dot (not colour alone) marks days that have events. */}
                    <AppText role="caption" color={count > 0 ? 'primary' : 'textSecondary'}>
                      {count > 0 ? (count > 1 ? `•${count}` : '•') : ' '}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Selected day */}
        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="heading" accessibilityRole="header">{longDateLabel(selected)}</AppText>

          {form ? (
            <EventForm
              key={form.mode === 'edit' ? form.eventId : 'new'}
              {...(editing ? { event: editing } : {})}
              defaultDate={selected}
              onCancel={() => setForm(null)}
              onSave={(input) => {
                if (form.mode === 'edit') {
                  updateEvent(form.eventId, input);
                  announce('Event saved.');
                } else if (addEvent(input)) {
                  announce('Event added.');
                } else {
                  announce(`You have reached the limit of ${MAX_EVENTS} events. Delete one to add another.`);
                  return;
                }
                setForm(null);
                // Jump to the date the event starts on, so the customer sees it.
                const parts = input.date.split('-');
                setMonth({ y: Number(parts[0]), m: Number(parts[1]) });
                setSelected(input.date);
              }}
            />
          ) : (
            <>
              {onSelectedDay.length === 0 ? (
                <AppCard elevation="none">
                  <AppText color="textSecondary">Nothing planned for this day.</AppText>
                </AppCard>
              ) : (
                onSelectedDay.map((item) => (
                  <AppCard key={`${item.eventId}-${item.date}`} elevation="none">
                    <View style={{ gap: theme.spacing.sm }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm }}>
                        <AppText role="bodyStrong" style={{ flex: 1, minWidth: 0 }}>{item.title}</AppText>
                        <Pill label={EVENT_KIND_LABELS[item.kind]} tone={KIND_TONE[item.kind]} />
                      </View>
                      <AppText role="caption" color="textSecondary">
                        {item.amount !== undefined ? `${formatMoney(item.amount)} · ` : ''}
                        {EVENT_REPEAT_LABELS[item.repeat]}
                      </AppText>
                      {item.note ? <AppText role="caption" color="textSecondary">{item.note}</AppText> : null}

                      {confirmDeleteId === item.eventId ? (
                        <View style={{ gap: theme.spacing.sm }}>
                          <AppText role="caption">
                            {item.repeat === 'none'
                              ? 'Delete this event?'
                              : 'Delete this event? Every date in the series will go.'}
                          </AppText>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                            <AppButton
                              label="Yes, delete"
                              fullWidth={false}
                              onPress={() => {
                                removeEvent(item.eventId);
                                setConfirmDeleteId(null);
                                announce(`${item.title} deleted.`);
                              }}
                              accessibilityLabel={`Yes, delete ${item.title}`}
                            />
                            <AppButton label="Keep it" variant="secondary" fullWidth={false} onPress={() => setConfirmDeleteId(null)} />
                          </View>
                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
                          <AppButton
                            label="Edit"
                            variant="secondary"
                            fullWidth={false}
                            onPress={() => setForm({ mode: 'edit', eventId: item.eventId })}
                            accessibilityLabel={`Edit ${item.title}`}
                          />
                          <AppButton
                            label="Delete"
                            variant="secondary"
                            fullWidth={false}
                            onPress={() => setConfirmDeleteId(item.eventId)}
                            accessibilityLabel={`Delete ${item.title}`}
                          />
                        </View>
                      )}
                    </View>
                  </AppCard>
                ))
              )}

              <AppButton label="Add an event" onPress={openAdd} disabled={atLimit} />
              {atLimit ? (
                <AppText role="caption" color="textSecondary">
                  You have {MAX_EVENTS} events. Delete one to add another.
                </AppText>
              ) : null}
            </>
          )}
        </View>

        <AppText accessibilityLiveRegion="polite" role="caption" color="textSecondary">{status}</AppText>

        {/* Coming up */}
        <View style={{ gap: theme.spacing.sm }}>
          <AppText role="heading" accessibilityRole="header">Coming up</AppText>
          <AppText role="caption" color="textSecondary">The next {UPCOMING_DAYS} days.</AppText>
          {upcoming.length === 0 ? (
            <AppCard elevation="none">
              <AppText color="textSecondary">Nothing coming up.</AppText>
            </AppCard>
          ) : (
            <AppCard elevation="none">
              <View style={{ gap: theme.spacing.md }}>
                {upcoming.map((item) => (
                  <View
                    key={`${item.eventId}-${item.date}`}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}
                    accessible
                    accessibilityLabel={`${longDateLabel(item.date)}, ${item.title}${
                      item.amount !== undefined ? `, ${formatMoney(item.amount)}` : ''
                    }, ${EVENT_KIND_LABELS[item.kind]}`}
                  >
                    <AppText role="bodyStrong" style={{ minWidth: 56 }}>{shortDateLabel(item.date)}</AppText>
                    <AppText style={{ flex: 1, minWidth: 0 }}>{item.title}</AppText>
                    <AppText role="bodyStrong">{item.amount !== undefined ? formatMoney(item.amount) : EVENT_KIND_LABELS[item.kind]}</AppText>
                  </View>
                ))}
              </View>
            </AppCard>
          )}
        </View>

        {!isSample ? (
          <AppButton
            label="Show the sample events again"
            variant="ghost"
            onPress={() => {
              resetToSamples();
              setForm(null);
              setConfirmDeleteId(null);
              announce('Back to the sample events.');
            }}
            accessibilityHint="Replaces your events with the demo examples"
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: theme.spacing.sm }}>
      <AppText role={strong ? 'bodyStrong' : 'body'} style={{ flexShrink: 1 }}>{label}</AppText>
      <AppText role={strong ? 'bodyStrong' : 'body'}>{value}</AppText>
    </View>
  );
}
