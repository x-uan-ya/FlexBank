import { useCallback, useMemo } from 'react';

import { useCurrentUser } from '@/features/shell/useCurrentUser';
import { usePersistedState } from '@/features/shell/usePersistedState';

import {
  MAX_EVENTS,
  newEventId,
  parseDate,
  sampleEvents,
  type CalendarEvent,
  type EventInput,
} from './calendar';

interface CalendarState {
  /** False until the customer first changes something. Until then, sample events are shown. */
  saved: boolean;
  events: CalendarEvent[];
}

const NOT_SAVED: CalendarState = { saved: false, events: [] };

/** Saved data can be old or damaged, so only keep events that are still usable. */
function usable(events: unknown): CalendarEvent[] {
  if (!Array.isArray(events)) return [];
  return events.filter(
    (e): e is CalendarEvent =>
      e !== null && typeof e === 'object' && typeof (e as CalendarEvent).id === 'string'
      && typeof (e as CalendarEvent).title === 'string' && parseDate((e as CalendarEvent).date) !== undefined,
  );
}

/**
 * The signed-in customer's calendar events, saved on this device (the app is
 * local-first). Until the customer changes something, a few synthetic sample
 * events are shown so the calendar is never empty on demo day; the first change
 * saves the whole list, and from then on it is the customer's own.
 *
 * Reminders only: nothing here moves money.
 *
 * When the app is connected to the backend, this is the one place to swap the
 * local save for the /api/calendar routes (see src/features/calendar/README.md).
 */
export function useCalendar() {
  const { id: userId } = useCurrentUser();
  const [state, setState] = usePersistedState<CalendarState>(`calendar:${userId}`, NOT_SAVED);

  const events = useMemo(() => (state.saved ? usable(state.events) : sampleEvents()), [state]);
  const atLimit = events.length >= MAX_EVENTS;

  /** Returns false (and adds nothing) when the customer already has the maximum. */
  const addEvent = useCallback(
    (input: EventInput): boolean => {
      if (events.length >= MAX_EVENTS) return false;
      setState({ saved: true, events: [...events, { ...input, id: newEventId() }] });
      return true;
    },
    [events, setState],
  );

  const updateEvent = useCallback(
    (id: string, input: EventInput) => {
      // Rebuilt from the input, so a removed amount or note really goes away.
      setState({ saved: true, events: events.map((event) => (event.id === id ? { ...input, id } : event)) });
    },
    [events, setState],
  );

  const removeEvent = useCallback(
    (id: string) => {
      setState({ saved: true, events: events.filter((event) => event.id !== id) });
    },
    [events, setState],
  );

  /** Back to the sample events. */
  const resetToSamples = useCallback(() => setState(NOT_SAVED), [setState]);

  return { events, isSample: !state.saved, atLimit, addEvent, updateEvent, removeEvent, resetToSamples };
}
