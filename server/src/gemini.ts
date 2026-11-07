/**
 * Gemini call via the official @google/genai SDK (v3).
 *
 * Holds no state; the API key comes from config (server-side only). Maps
 * quota/rate-limit (429) and transient upstream failures to a typed result the
 * route turns into HTTP 503, so the Expo client falls back deterministically.
 *
 * Free tier: default model is gemini-2.5-flash-lite (highest free quota).
 * Output is capped via maxOutputTokens to stay well inside free limits.
 */

import { GoogleGenAI } from '@google/genai';

import { config } from './config.js';
import { SYSTEM_PROMPT } from './prompt.js';

/** One turn of a multi-turn conversation (client-supplied history). */
export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export type GeminiResult =
  | { ok: true; text: string }
  | { ok: false; status: 429 | 500 | 503; reason: string };

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  if (!config.geminiApiKey) return null;
  if (!client) client = new GoogleGenAI({ apiKey: config.geminiApiKey });
  return client;
}

/** Extract an HTTP-ish status from the SDK's thrown error, if present. */
function statusFromError(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null) {
    const anyErr = err as Record<string, unknown>;
    const candidates = [anyErr.status, anyErr.code, anyErr.statusCode];
    for (const c of candidates) {
      if (typeof c === 'number') return c;
      if (typeof c === 'string' && /^\d+$/.test(c)) return Number(c);
    }
    // Some errors embed the code in the message, e.g. "got status: 429".
    const msg = typeof anyErr.message === 'string' ? anyErr.message : '';
    const m = msg.match(/\b(429|500|503)\b/);
    if (m) return Number(m[1]);
  }
  return undefined;
}

/**
 * Build the `contents` argument. For a single instruction we pass a string;
 * for chat we pass the history as Content[] with the new instruction appended
 * as the final user turn.
 */
function buildContents(instruction: string, history?: ChatTurn[]) {
  if (!history || history.length === 0) return instruction;
  const turns = history.map((t) => ({ role: t.role, parts: [{ text: t.text }] }));
  turns.push({ role: 'user', parts: [{ text: instruction }] });
  return turns;
}

/**
 * Run one Gemini generation. `instruction` is the per-request user instruction
 * (see prompt.buildInstruction); `history` is optional prior chat turns.
 */
export async function runGemini(
  instruction: string,
  history?: ChatTurn[],
): Promise<GeminiResult> {
  const ai = getClient();
  if (!ai) {
    return { ok: false, status: 503, reason: 'AI not configured' };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.requestTimeoutMs);

  try {
    const response = await ai.models.generateContent({
      model: config.geminiModel,
      contents: buildContents(instruction, history),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        maxOutputTokens: config.maxOutputTokens,
        temperature: 0.4,
        abortSignal: controller.signal,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      return { ok: false, status: 503, reason: 'Empty response' };
    }
    return { ok: true, text };
  } catch (err) {
    const status = statusFromError(err);
    if (status === 429) {
      return { ok: false, status: 429, reason: 'Rate limit or quota exhausted' };
    }
    // Everything else (network, timeout/abort, 5xx, bad key) → 503 so the
    // client falls back. We never leak raw error details to the client.
    return { ok: false, status: 503, reason: 'Upstream unavailable' };
  } finally {
    clearTimeout(timer);
  }
}
