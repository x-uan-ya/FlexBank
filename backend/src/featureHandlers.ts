/**
 * The request handlers for quick actions and the financial calendar.
 *
 * api.ts registers each handler as one line in its route list. They sit here so
 * the shared routes file stays small. Every handler only ever works on the
 * logged-in customer's own data: the customer id comes from the login token,
 * never from the request.
 */

import type { ApiResponse } from './api';
import {
  MAX_EVENTS_PER_USER,
  demoEvents,
  expandEvents,
  readEventInput,
  readRange,
  summarise,
  type EventInput,
} from './calendar';
import type { FeatureStore, StoredEvent } from './featureStore';
import {
  MAX_QUICK_ACTIONS,
  QUICK_ACTION_CATALOGUE,
  defaultQuickActionIds,
  isKnownQuickAction,
  readQuickActionIds,
} from './quickActions';
import { DEMO_USERS } from './store';
import type { User } from './types';

const json = (status: number, body: unknown): ApiResponse => ({ status, body });
const error = (status: number, message: string, extra: Record<string, unknown> = {}): ApiResponse =>
  json(status, { error: { message, ...extra } });

const NOT_FOUND = 'We could not find that.';
const DEMO_EMAILS: ReadonlySet<string> = new Set(DEMO_USERS.map((u) => u.email));

const publicEvent = (e: StoredEvent): Record<string, unknown> => ({
  id: e.id,
  title: e.title,
  kind: e.kind,
  ...(e.amount !== undefined ? { amount: e.amount } : {}),
  date: e.date,
  repeat: e.repeat,
  ...(e.note ? { note: e.note } : {}),
  createdAt: e.createdAt,
});

export function createFeatureHandlers(features: FeatureStore) {
  async function quickActionsBody(user: User): Promise<ApiResponse> {
    const saved = (await features.getQuickActionIds(user.id))?.filter(isKnownQuickAction);
    const useSaved = saved !== undefined && saved.length > 0;
    return json(200, {
      selected: useSaved ? saved : defaultQuickActionIds(user.preferences.priorities),
      isDefault: !useSaved,
      max: MAX_QUICK_ACTIONS,
      catalogue: QUICK_ACTION_CATALOGUE,
    });
  }

  return {
    getQuickActions: (user: User): Promise<ApiResponse> => quickActionsBody(user),

    async putQuickActions(user: User, body: unknown): Promise<ApiResponse> {
      const raw = body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : {};
      const checked = readQuickActionIds(raw.actionIds);
      if (!checked.ok) {
        return error(400, checked.message);
      }
      await features.setQuickActionIds(user.id, checked.ids);
      return quickActionsBody(user);
    },

    async resetQuickActions(user: User): Promise<ApiResponse> {
      await features.clearQuickActionIds(user.id);
      return quickActionsBody(user);
    },

    async getCalendar(user: User, query: Record<string, string>): Promise<ApiResponse> {
      const range = readRange(query.from, query.to);
      if (!range.ok) {
        return error(400, range.message);
      }
      // The demo customers start with a few example events (once only).
      if (DEMO_EMAILS.has(user.email)) {
        await features.seedEventsOnce(user.id, demoEvents());
      }
      const occurrences = expandEvents(await features.listEvents(user.id), range.from, range.to);
      return json(200, { from: range.from, to: range.to, occurrences, summary: summarise(occurrences) });
    },

    async createEvent(user: User, body: unknown): Promise<ApiResponse> {
      const checked = readEventInput(body);
      if (!checked.ok) {
        return error(400, 'Please check the highlighted details.', { fields: checked.fields });
      }
      const created = await features.createEvent(user.id, checked.value);
      if (created === 'limit') {
        return error(409, `You have reached the limit of ${MAX_EVENTS_PER_USER} events. Delete one to add another.`);
      }
      return json(201, { event: publicEvent(created) });
    },

    async updateEvent(user: User, id: string | undefined, body: unknown): Promise<ApiResponse> {
      const checked = readEventInput(body);
      if (!checked.ok) {
        return error(400, 'Please check the highlighted details.', { fields: checked.fields });
      }
      const input: EventInput = checked.value;
      const updated = id ? await features.updateEvent(user.id, id, input) : undefined;
      return updated ? json(200, { event: publicEvent(updated) }) : error(404, NOT_FOUND);
    },

    async deleteEvent(user: User, id: string | undefined): Promise<ApiResponse> {
      const removed = id ? await features.deleteEvent(user.id, id) : false;
      return removed ? json(200, { ok: true }) : error(404, NOT_FOUND);
    },
  };
}
