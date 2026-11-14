/**
 * All the API routes, written WITHOUT any web framework.
 *
 * `api.handle(request)` takes a plain request object and returns a plain response
 * object. index.ts connects it to Express. Keeping the routes framework-free
 * means they can be tested without starting a server.
 *
 * Rules every route follows:
 * - Customer-friendly messages only, never raw errors or stack traces.
 * - Everything except health, register and login needs a valid login token.
 *
 * To add a route (for example for the AI Concierge), add one more `authed(...)`
 * or `pub(...)` line to the `routes` list below.
 */

import { createHash, timingSafeEqual } from 'node:crypto';

import { hashPassword, signToken, verifyAgainstDummy, verifyPassword, verifyToken } from './auth';
import type { Config } from './config';
import { createFeatureHandlers } from './featureHandlers';
import { MemoryFeatureStore, type FeatureStore } from './featureStore';
import { RateLimiter } from './limiter';
import type { Store } from './store';
import {
  DISPLAY_MODES,
  GUIDANCE_LEVELS,
  LANGUAGES,
  PRIORITIES,
  type Preferences,
  type Priority,
  type Recipient,
  type TransactionRecord,
  type User,
} from './types';
import {
  MOBILE_NOT_FOUND_MESSAGE,
  SIMULATED_FAILURE_REASON,
  isSimulatedFailureAmount,
  parseMobile,
  validateTransfer,
} from './validation';

export interface ApiRequest {
  method: string;
  /** Full path, for example "/api/auth/login". */
  path: string;
  query: Record<string, string>;
  /** Header names in lower case. */
  headers: Record<string, string>;
  body: unknown;
}

export interface ApiResponse {
  status: number;
  body: unknown;
}

export interface ApiDeps {
  store: Store;
  config: Config;
  /** Where quick actions and calendar events are kept. Defaults to in-memory. */
  features?: FeatureStore;
}

export interface Api {
  handle(req: ApiRequest): Promise<ApiResponse>;
}

type Json = Record<string, unknown>;
type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
interface Ctx {
  req: ApiRequest;
  /** Values taken from ":name" parts of the route path, for example "/api/calendar/events/:id". */
  params: Record<string, string>;
}
interface PublicRoute {
  method: Method;
  path: string;
  auth: false;
  handler: (ctx: Ctx) => Promise<ApiResponse>;
}
interface AuthedRoute {
  method: Method;
  path: string;
  auth: true;
  handler: (ctx: Ctx, user: User) => Promise<ApiResponse>;
}
type Route = PublicRoute | AuthedRoute;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
const NOT_FOUND = 'We could not find that.';
const SERVER_ERROR = 'Something went wrong on our side. Please try again.';

const json = (status: number, body: unknown): ApiResponse => ({ status, body });
const error = (status: number, message: string, extra: Json = {}): ApiResponse =>
  json(status, { error: { message, ...extra } });

function asObject(value: unknown): Json {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : {};
}

function oneOf<T extends string>(allowed: readonly T[], value: unknown): T | undefined {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

/** Matches "/api/calendar/events/:id" against a real path and returns the ":id" values, or undefined. */
function matchPath(pattern: string, path: string): Record<string, string> | undefined {
  const want = pattern.split('/');
  const have = path.split('/');
  if (want.length !== have.length) {
    return undefined;
  }
  const params: Record<string, string> = {};
  for (let i = 0; i < want.length; i += 1) {
    const expected = want[i] ?? '';
    const actual = have[i] ?? '';
    if (expected.startsWith(':')) {
      if (!actual) {
        return undefined;
      }
      try {
        params[expected.slice(1)] = decodeURIComponent(actual);
      } catch {
        return undefined;
      }
    } else if (expected !== actual) {
      return undefined;
    }
  }
  return params;
}

function readPriorities(value: unknown): Priority[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const out: Priority[] = [];
  for (const item of value) {
    const priority = oneOf(PRIORITIES, item);
    if (!priority) {
      return undefined;
    }
    if (!out.includes(priority)) {
      out.push(priority);
    }
  }
  return out.length >= 1 && out.length <= 3 ? out : undefined;
}

type PreferencesResult = { ok: true; value: Preferences } | { ok: false; fields: Record<string, string> };

/** Every preference must be chosen explicitly. Nothing is guessed. */
function readPreferences(raw: unknown): PreferencesResult {
  const p = asObject(raw);
  const guidanceLevel = oneOf(GUIDANCE_LEVELS, p.guidanceLevel);
  const displayMode = oneOf(DISPLAY_MODES, p.displayMode);
  const language = oneOf(LANGUAGES, p.language);
  const priorities = readPriorities(p.priorities);

  if (!guidanceLevel || !displayMode || !language || !priorities) {
    const fields: Record<string, string> = {};
    if (!guidanceLevel) fields['preferences.guidanceLevel'] = 'Choose how much guidance you want.';
    if (!displayMode) fields['preferences.displayMode'] = 'Choose how you want the app to look.';
    if (!language) fields['preferences.language'] = 'Choose your language.';
    if (!priorities) fields['preferences.priorities'] = 'Choose between 1 and 3 things you do most.';
    return { ok: false, fields };
  }
  return { ok: true, value: { guidanceLevel, displayMode, language, priorities } };
}

const publicUser = (u: User) => ({ id: u.id, name: u.name, email: u.email });

/** The mobile number is a demo lookup key and is never sent to the app. */
const publicRecipient = (r: Recipient) => ({
  id: r.id,
  name: r.name,
  bank: r.bank,
  maskedIdentifier: r.maskedIdentifier,
  initials: r.initials,
});

function transferBody(record: TransactionRecord, balance: number, duplicate: boolean): Json {
  return {
    status: record.status,
    reference: record.reference,
    amount: record.amount,
    currency: record.currency,
    recipient: {
      name: record.recipientName,
      bank: record.recipientBank,
      maskedIdentifier: record.recipientIdentifier,
    },
    ...(record.failureReason ? { reason: record.failureReason } : {}),
    balance,
    duplicate,
    createdAt: record.createdAt,
  };
}

function safeEqual(a: string, b: string): boolean {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function createApi(deps: ApiDeps): Api {
  const { store, config } = deps;
  const features = deps.features ?? new MemoryFeatureStore();
  const feature = createFeatureHandlers(features);
  const loginLimiter = new RateLimiter(10, 60_000); // 10 tries per email per minute

  const session = (user: User): Json => ({
    token: signToken(user.id, config.jwtSecret, config.tokenTtlSeconds),
    user: publicUser(user),
    preferences: user.preferences,
  });

  async function authenticate(req: ApiRequest): Promise<User | undefined> {
    const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization ?? '');
    if (!match?.[1]) {
      return undefined;
    }
    const userId = verifyToken(match[1], config.jwtSecret);
    return userId ? store.findUserById(userId) : undefined;
  }

  /** Demo controls only work when DEMO_KEY is set, and need that key in the "x-demo-key" header. */
  function demoGuard(req: ApiRequest): ApiResponse | undefined {
    if (!config.demoKey) {
      return error(404, NOT_FOUND);
    }
    if (!safeEqual(req.headers['x-demo-key'] ?? '', config.demoKey)) {
      return error(403, 'The demo key is not correct.');
    }
    return undefined;
  }

  const pub = (method: Method, path: string, handler: PublicRoute['handler']): Route => ({
    method,
    path,
    auth: false,
    handler,
  });
  const authed = (method: Method, path: string, handler: AuthedRoute['handler']): Route => ({
    method,
    path,
    auth: true,
    handler,
  });

  const routes: Route[] = [
    pub('GET', '/api/health', async () => json(200, { ok: true })),

    /* ---------------- Register, login, profile ---------------- */

    pub('POST', '/api/auth/register', async ({ req }) => {
      const body = asObject(req.body);
      const fields: Record<string, string> = {};

      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (name.length < 1 || name.length > 60) {
        fields.name = 'Enter your name (up to 60 characters).';
      }
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!EMAIL_PATTERN.test(email) || email.length > 254) {
        fields.email = 'Enter a valid email address.';
      }
      const password = typeof body.password === 'string' ? body.password : '';
      if (password.length < 8 || password.length > 128) {
        fields.password = 'Use a password with 8 to 128 characters.';
      }
      const prefs = readPreferences(body.preferences);
      if (!prefs.ok) {
        Object.assign(fields, prefs.fields);
      }
      if (Object.keys(fields).length > 0 || !prefs.ok) {
        return error(400, 'Please check the highlighted details.', { fields });
      }

      const created = await store.createUser({
        name,
        email,
        passwordHash: await hashPassword(password),
        preferences: prefs.value,
      });
      if (created === 'email-taken') {
        return error(409, 'An account with this email already exists. Try logging in instead.');
      }
      return json(201, session(created));
    }),

    pub('POST', '/api/auth/login', async ({ req }) => {
      const body = asObject(req.body);
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const password = typeof body.password === 'string' ? body.password : '';

      if (!loginLimiter.allow(email || 'unknown')) {
        return error(429, 'Too many attempts. Please wait a minute and try again.');
      }

      const user = email ? await store.findUserByEmail(email) : undefined;
      const passwordOk = user ? await verifyPassword(password, user.passwordHash) : await verifyAgainstDummy(password);
      if (!user || !passwordOk) {
        // Same message whether the email or the password is wrong.
        return error(401, 'Email or password is incorrect.');
      }
      return json(200, session(user));
    }),

    authed('GET', '/api/me', async (_ctx, user) =>
      json(200, { user: publicUser(user), preferences: user.preferences }),
    ),

    authed('PUT', '/api/me/preferences', async ({ req }, user) => {
      const prefs = readPreferences(req.body);
      if (!prefs.ok) {
        return error(400, 'Please check the highlighted details.', { fields: prefs.fields });
      }
      const updated = await store.updatePreferences(user.id, prefs.value);
      if (!updated) {
        return error(404, NOT_FOUND);
      }
      return json(200, { user: publicUser(updated), preferences: updated.preferences });
    }),

    /* ---------------- Accounts and recipients ---------------- */

    authed('GET', '/api/accounts', async (_ctx, user) => json(200, { accounts: await store.getAccounts(user.id) })),

    authed('GET', '/api/recipients', async () => {
      const recipients = await store.listRecipients();
      return json(200, { recipients: recipients.map(publicRecipient) });
    }),

    authed('GET', '/api/recipients/lookup', async ({ req }) => {
      const parsed = parseMobile(req.query.mobile);
      if (!parsed.ok) {
        return error(400, parsed.message);
      }
      const recipient = await store.findRecipientByMobile(parsed.mobile);
      if (!recipient) {
        return error(404, MOBILE_NOT_FOUND_MESSAGE);
      }
      return json(200, { recipient: publicRecipient(recipient) });
    }),

    /* ---------------- Transfers ---------------- */

    authed('POST', '/api/transfers/validate', async ({ req }, user) => {
      const body = asObject(req.body);
      const recipientId = typeof body.recipientId === 'string' ? body.recipientId : undefined;
      const recipient = recipientId ? await store.findRecipient(recipientId) : undefined;
      const [account] = await store.getAccounts(user.id);
      const result = validateTransfer({
        recipientChosen: Boolean(recipientId),
        recipientFound: Boolean(recipient),
        amount: body.amount,
        balance: account?.balance ?? 0,
      });
      return json(200, result);
    }),

    /**
     * The customer pressed "Confirm and send". The app must send a fresh
     * "requestId" for each transfer, so a double press or a retry never sends twice.
     */
    authed('POST', '/api/transfers/confirm', async ({ req }, user) => {
      const body = asObject(req.body);

      const requestId = body.requestId;
      if (typeof requestId !== 'string' || !REQUEST_ID_PATTERN.test(requestId)) {
        return error(400, 'Missing or invalid request id.');
      }
      const recipientId = typeof body.recipientId === 'string' ? body.recipientId : undefined;
      const amount = body.amount;

      // Same press sent twice: give back the first result, do not send again.
      const previous = await store.findTransactionByRequestId(user.id, requestId);
      if (previous) {
        if (previous.recipientId !== recipientId || previous.amount !== amount) {
          return error(409, 'This request id was already used for a different transfer.');
        }
        const [account] = await store.getAccounts(user.id);
        return json(200, transferBody(previous, account?.balance ?? 0, true));
      }

      const recipient = recipientId ? await store.findRecipient(recipientId) : undefined;
      const [account] = await store.getAccounts(user.id);
      const check = validateTransfer({
        recipientChosen: Boolean(recipientId),
        recipientFound: Boolean(recipient),
        amount,
        balance: account?.balance ?? 0,
      });
      if (!check.valid || !recipient || typeof amount !== 'number') {
        return json(422, check);
      }

      const result = await store.applyTransfer({
        userId: user.id,
        requestId,
        recipient,
        amount,
        ...(isSimulatedFailureAmount(amount) ? { simulatedFailureReason: SIMULATED_FAILURE_REASON } : {}),
      });
      if (result.kind === 'insufficient') {
        return json(422, { valid: false, messages: ['This is more than your available balance.'] });
      }
      return json(200, transferBody(result.record, result.balance, result.kind === 'duplicate'));
    }),

    authed('GET', '/api/transactions', async (_ctx, user) =>
      json(200, { transactions: await store.listTransactions(user.id) }),
    ),

    /* ---------------- Quick actions (home shortcuts; they only open screens) ---------------- */

    authed('GET', '/api/quick-actions', async (_ctx, user) => feature.getQuickActions(user)),
    authed('PUT', '/api/quick-actions', async ({ req }, user) => feature.putQuickActions(user, req.body)),
    authed('DELETE', '/api/quick-actions', async (_ctx, user) => feature.resetQuickActions(user)),

    /* ---------------- Financial calendar (reminders only; nothing here moves money) ---------------- */

    authed('GET', '/api/calendar', async ({ req }, user) => feature.getCalendar(user, req.query)),
    authed('POST', '/api/calendar/events', async ({ req }, user) => feature.createEvent(user, req.body)),
    authed('PUT', '/api/calendar/events/:id', async ({ req, params }, user) =>
      feature.updateEvent(user, params.id, req.body),
    ),
    authed('DELETE', '/api/calendar/events/:id', async ({ params }, user) => feature.deleteEvent(user, params.id)),

    /* ---------------- Demo control (needs DEMO_KEY) ---------------- */

    pub('POST', '/api/demo/reset', async ({ req }) => {
      const blocked = demoGuard(req);
      if (blocked) {
        return blocked;
      }
      await store.reset();
      await features.reset();
      return json(200, { ok: true });
    }),
  ];

  return {
    async handle(req) {
      try {
        const path = req.path.length > 1 ? req.path.replace(/\/+$/, '') : req.path;
        const matching = routes.flatMap((route) => {
          const params = matchPath(route.path, path);
          return params ? [{ route, params }] : [];
        });
        if (matching.length === 0) {
          return error(404, NOT_FOUND);
        }
        const hit = matching.find((m) => m.route.method === req.method);
        if (!hit) {
          return error(405, 'That method is not allowed here.');
        }
        const { route, params } = hit;
        if (route.auth) {
          const user = await authenticate(req);
          if (!user) {
            return error(401, 'Please log in to continue.');
          }
          return await route.handler({ req, params }, user);
        }
        return await route.handler({ req, params });
      } catch (err) {
        console.error('[api] unexpected error:', err instanceof Error ? err.message : err);
        return error(500, SERVER_ERROR);
      }
    },
  };
}
