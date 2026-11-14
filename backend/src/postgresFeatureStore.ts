/**
 * PostgreSQL version of the FeatureStore (quick actions and calendar events).
 *
 * Needs supabase/migrations/02_quick_actions_and_calendar.sql. Server-only:
 * it is built from DATABASE_URL and the connection string never reaches the app.
 */

import { Pool, type PoolClient } from 'pg';

import { MAX_EVENTS_PER_USER, type EventInput, type EventKind, type EventRepeat } from './calendar';
import type { FeatureStore, StoredEvent } from './featureStore';

interface EventRow {
  id: string;
  user_id: string;
  title: string;
  kind: EventKind;
  amount: string | number | null;
  /** Read as text ("YYYY-MM-DD") so the driver cannot shift it by a time zone. */
  event_date: string;
  repeat: EventRepeat;
  note: string | null;
  created_at: Date | string;
}

const EVENT_COLUMNS = `
  id, user_id, title, kind, amount,
  to_char(event_date, 'YYYY-MM-DD') as event_date,
  repeat, note, created_at
`;

function mapEvent(row: EventRow): StoredEvent {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    kind: row.kind,
    ...(row.amount !== null ? { amount: Number(row.amount) } : {}),
    date: row.event_date,
    repeat: row.repeat,
    ...(row.note ? { note: row.note } : {}),
    createdAt: (row.created_at instanceof Date ? row.created_at : new Date(row.created_at)).toISOString(),
  };
}

export class PostgresFeatureStore implements FeatureStore {
  private readonly pool: Pool;
  private closed = false;

  constructor(connectionString: string) {
    if (!connectionString.trim()) {
      throw new Error('DATABASE_URL is required when STORE_DRIVER=postgres');
    }
    this.pool = new Pool({
      connectionString,
      max: 3,
      connectionTimeoutMillis: 10_000,
      idleTimeoutMillis: 30_000,
    });
    this.pool.on('error', (err) => {
      console.error('[database] idle PostgreSQL client error (features):', err.message);
    });
  }

  async init(): Promise<void> {
    const result = await this.pool.query<{ ok: boolean }>(`
      select
        to_regclass('public.user_quick_actions') is not null
        and to_regclass('public.calendar_events') is not null
        and to_regclass('public.user_calendar_state') is not null as ok
    `);
    if (!result.rows[0]?.ok) {
      throw new Error('PostgreSQL schema is missing; apply supabase/migrations/02_quick_actions_and_calendar.sql');
    }
  }

  async close(): Promise<void> {
    if (!this.closed) {
      this.closed = true;
      await this.pool.end();
    }
  }

  async getQuickActionIds(userId: string): Promise<string[] | undefined> {
    const result = await this.pool.query<{ action_ids: string[] }>(
      'select action_ids from public.user_quick_actions where user_id = $1',
      [userId],
    );
    return result.rows[0]?.action_ids;
  }

  async setQuickActionIds(userId: string, ids: string[]): Promise<void> {
    await this.pool.query(
      `insert into public.user_quick_actions (user_id, action_ids)
       values ($1, $2::text[])
       on conflict (user_id) do update set action_ids = excluded.action_ids`,
      [userId, ids],
    );
  }

  async clearQuickActionIds(userId: string): Promise<void> {
    await this.pool.query('delete from public.user_quick_actions where user_id = $1', [userId]);
  }

  async listEvents(userId: string): Promise<StoredEvent[]> {
    const result = await this.pool.query<EventRow>(
      `select ${EVENT_COLUMNS} from public.calendar_events where user_id = $1 order by event_date, created_at, id`,
      [userId],
    );
    return result.rows.map(mapEvent);
  }

  async createEvent(userId: string, input: EventInput): Promise<StoredEvent | 'limit'> {
    // One statement checks the limit and inserts, so two quick requests cannot both slip past it.
    const result = await this.pool.query<EventRow>(
      `insert into public.calendar_events (user_id, title, kind, amount, event_date, repeat, note)
       select $1::text, $2::text, $3::text, $4::numeric, $5::date, $6::text, $7::text
       where (select count(*) from public.calendar_events where user_id = $1::text) < $8::int
       returning ${EVENT_COLUMNS}`,
      [userId, input.title, input.kind, input.amount ?? null, input.date, input.repeat, input.note ?? null, MAX_EVENTS_PER_USER],
    );
    const row = result.rows[0];
    return row ? mapEvent(row) : 'limit';
  }

  async updateEvent(userId: string, id: string, input: EventInput): Promise<StoredEvent | undefined> {
    const result = await this.pool.query<EventRow>(
      `update public.calendar_events
       set title = $3, kind = $4, amount = $5, event_date = $6::date, repeat = $7, note = $8
       where id = $1 and user_id = $2
       returning ${EVENT_COLUMNS}`,
      [id, userId, input.title, input.kind, input.amount ?? null, input.date, input.repeat, input.note ?? null],
    );
    const row = result.rows[0];
    return row ? mapEvent(row) : undefined;
  }

  async deleteEvent(userId: string, id: string): Promise<boolean> {
    const result = await this.pool.query('delete from public.calendar_events where id = $1 and user_id = $2', [id, userId]);
    return (result.rowCount ?? 0) > 0;
  }

  async seedEventsOnce(userId: string, events: readonly EventInput[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      const claimed = await client.query(
        'insert into public.user_calendar_state (user_id) values ($1) on conflict (user_id) do nothing',
        [userId],
      );
      if ((claimed.rowCount ?? 0) > 0) {
        for (const input of events) {
          await client.query(
            `insert into public.calendar_events (user_id, title, kind, amount, event_date, repeat, note)
             values ($1, $2, $3, $4, $5::date, $6, $7)`,
            [userId, input.title, input.kind, input.amount ?? null, input.date, input.repeat, input.note ?? null],
          );
        }
      }
      await client.query('commit');
    } catch (err) {
      await this.rollback(client);
      throw err;
    } finally {
      client.release();
    }
  }

  async reset(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('begin');
      await client.query('delete from public.calendar_events');
      await client.query('delete from public.user_quick_actions');
      await client.query('delete from public.user_calendar_state');
      await client.query('commit');
    } catch (err) {
      await this.rollback(client);
      throw err;
    } finally {
      client.release();
    }
  }

  private async rollback(client: PoolClient): Promise<void> {
    try {
      await client.query('rollback');
    } catch {
      // Keep the original database error.
    }
  }
}
