/**
 * Storage for the quick actions and the financial calendar.
 *
 * This is kept apart from the main `Store` on purpose: the main store (users,
 * accounts, transfers) is shared work, and these features only need to remember
 * a few extra things per customer. `MemoryFeatureStore` works instantly (and is
 * a good demo backup). `PostgresFeatureStore` (postgresFeatureStore.ts) keeps
 * the same data in the database.
 */

import { randomUUID } from 'node:crypto';

import { MAX_EVENTS_PER_USER, type EventInput } from './calendar';

export interface StoredEvent extends EventInput {
  id: string;
  userId: string;
  createdAt: string;
}

export interface FeatureStore {
  /** The customer's saved shortcuts, or undefined if they never changed them. */
  getQuickActionIds(userId: string): Promise<string[] | undefined>;
  setQuickActionIds(userId: string, ids: string[]): Promise<void>;
  /** Back to the defaults. */
  clearQuickActionIds(userId: string): Promise<void>;

  listEvents(userId: string): Promise<StoredEvent[]>;
  /** Returns 'limit' when the customer already has the maximum number of events. */
  createEvent(userId: string, input: EventInput): Promise<StoredEvent | 'limit'>;
  /** Only changes an event that belongs to this customer. */
  updateEvent(userId: string, id: string, input: EventInput): Promise<StoredEvent | undefined>;
  deleteEvent(userId: string, id: string): Promise<boolean>;
  /** Adds the starting events the first time only, so deleted events never come back. */
  seedEventsOnce(userId: string, events: readonly EventInput[]): Promise<void>;

  /** Clears everything these features stored (used by the demo reset). */
  reset(): Promise<void>;
}

const newEventId = (): string => `evt-${randomUUID().slice(0, 8)}`;
const copy = (event: StoredEvent): StoredEvent => ({ ...event });

export class MemoryFeatureStore implements FeatureStore {
  private quickActions = new Map<string, string[]>();
  private events = new Map<string, StoredEvent[]>();
  private seeded = new Set<string>();

  async getQuickActionIds(userId: string): Promise<string[] | undefined> {
    const ids = this.quickActions.get(userId);
    return ids ? [...ids] : undefined;
  }

  async setQuickActionIds(userId: string, ids: string[]): Promise<void> {
    this.quickActions.set(userId, [...ids]);
  }

  async clearQuickActionIds(userId: string): Promise<void> {
    this.quickActions.delete(userId);
  }

  async listEvents(userId: string): Promise<StoredEvent[]> {
    return (this.events.get(userId) ?? []).map(copy);
  }

  async createEvent(userId: string, input: EventInput): Promise<StoredEvent | 'limit'> {
    const list = this.events.get(userId) ?? [];
    if (list.length >= MAX_EVENTS_PER_USER) {
      return 'limit';
    }
    const event: StoredEvent = { ...input, id: newEventId(), userId, createdAt: new Date().toISOString() };
    this.events.set(userId, [...list, event]);
    return copy(event);
  }

  async updateEvent(userId: string, id: string, input: EventInput): Promise<StoredEvent | undefined> {
    const list = this.events.get(userId) ?? [];
    const index = list.findIndex((e) => e.id === id);
    const current = list[index];
    if (!current) {
      return undefined;
    }
    // Rebuilt from the input, so a removed amount or note really goes away.
    const updated: StoredEvent = { ...input, id: current.id, userId, createdAt: current.createdAt };
    const next = [...list];
    next[index] = updated;
    this.events.set(userId, next);
    return copy(updated);
  }

  async deleteEvent(userId: string, id: string): Promise<boolean> {
    const list = this.events.get(userId) ?? [];
    if (!list.some((e) => e.id === id)) {
      return false;
    }
    this.events.set(userId, list.filter((e) => e.id !== id));
    return true;
  }

  async seedEventsOnce(userId: string, events: readonly EventInput[]): Promise<void> {
    if (this.seeded.has(userId)) {
      return;
    }
    this.seeded.add(userId);
    const now = new Date().toISOString();
    const list = this.events.get(userId) ?? [];
    this.events.set(userId, [
      ...list,
      ...events.map((input): StoredEvent => ({ ...input, id: newEventId(), userId, createdAt: now })),
    ]);
  }

  async reset(): Promise<void> {
    this.quickActions.clear();
    this.events.clear();
    this.seeded.clear();
  }
}
