/**
 * Optional live-AI adapter for the Concierge.
 *
 * OFFLINE BY DEFAULT. No network call is made unless
 * EXPO_PUBLIC_CONCIERGE_AI_URL is set to a backend endpoint that owns the
 * real API key. Secrets must never live in the Expo client or in EXPO_PUBLIC_*.
 *
 * The backend is expected to accept:
 *   POST { task: 'explain' | 'simplify' | 'translate', context?, text?, language? }
 * and return JSON: { text: string }
 *
 * Any network error, timeout, non-OK status, or invalid body → null so the
 * caller can fall back deterministically.
 */

const DEFAULT_TIMEOUT_MS = 4000;
// Chat may take longer than a short explanation; allow more headroom.
const CHAT_TIMEOUT_MS = 12000;

export type AiTask = 'explain' | 'simplify' | 'translate';

export type GuidanceLevel = 'quick' | 'balanced' | 'guided';

export interface AiRequest {
  task: AiTask;
  context?: string;
  text?: string;
  language?: string;
  /** Optional: shapes answer length/detail. Backwards-compatible. */
  guidanceLevel?: GuidanceLevel;
}

/** One prior turn of a multi-turn chat (client-held history). */
export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface AiChatRequest {
  question: string;
  history?: ChatTurn[];
  language?: string;
  guidanceLevel?: GuidanceLevel;
}

function getEndpoint(): string | null {
  // Expo inlines EXPO_PUBLIC_* at bundle time. Absence means offline mode.
  const url =
    typeof process !== 'undefined'
      ? process.env.EXPO_PUBLIC_CONCIERGE_AI_URL
      : undefined;
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return null;
  }
  return url.trim();
}

function isValidResponse(value: unknown): value is { text: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'text' in value &&
    typeof (value as { text: unknown }).text === 'string' &&
    (value as { text: string }).text.trim().length > 0
  );
}

/**
 * Attempts a bounded AI call. Returns the text on success, or null on any
 * failure (timeout, network, bad shape, missing config).
 */
export async function tryAiProvider(
  request: AiRequest,
  timeoutMs: number = DEFAULT_TIMEOUT_MS,
): Promise<string | null> {
  const endpoint = getEndpoint();
  if (!endpoint) {
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const body: unknown = await response.json();
    if (!isValidResponse(body)) {
      return null;
    }

    return body.text.trim();
  } catch {
    // Timeout, network error, abort, JSON parse failure — all treated as null.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Attempts a bounded multi-turn chat call against the `/chat` sibling of the
 * configured endpoint. Returns the reply text on success, or null on any
 * failure (offline, timeout, non-OK status such as 503/429, bad shape), so the
 * caller can fall back deterministically.
 */
export async function tryAiChat(
  request: AiChatRequest,
  timeoutMs: number = CHAT_TIMEOUT_MS,
): Promise<string | null> {
  const base = getEndpoint();
  if (!base) {
    return null;
  }
  // Derive the chat endpoint from the base (e.g. ".../concierge" → ".../concierge/chat").
  const chatEndpoint = `${base.replace(/\/$/, '')}/chat`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(chatEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const body: unknown = await response.json();
    if (!isValidResponse(body)) {
      return null;
    }

    return body.text.trim();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** True when a live endpoint is configured (does not prove it is reachable). */
export function isLiveAiConfigured(): boolean {
  return getEndpoint() !== null;
}
