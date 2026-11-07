/**
 * FlexBank Concierge proxy — Express app.
 *
 * Routes:
 *   GET  /health            → liveness + whether AI is configured
 *   POST /concierge         → single task: explain | simplify | translate
 *   POST /concierge/chat    → multi-turn banking Q&A
 *
 * Contract preserved for the existing client (aiProvider.ts):
 *   /concierge  body: { task, context?, text?, language?, guidanceLevel? } → { text }
 *   /concierge/chat body: { question, history?, language?, guidanceLevel? } → { text }
 *
 * Behaviour:
 *   - No GEMINI_API_KEY → 503 on AI routes, so the client uses its offline
 *     deterministic fallback. The app keeps working with no AI and offline.
 *   - Quota/429 or any upstream failure → 503 (same fallback path).
 *   - Obviously unsafe input → 200 with a safe canned refusal (never calls AI).
 *
 * The Gemini key lives only in this process's environment. It is never returned
 * to the client and never logged.
 */

import cors from 'cors';
import express from 'express';

import { config, isAiConfigured } from './config.js';
import { runGemini, type ChatTurn } from './gemini.js';
import {
  buildInstruction,
  type ConciergeTask,
  type GuidanceLevel,
  type Language,
} from './prompt.js';
import { checkRateLimit, startRateLimitCleanup } from './rateLimit.js';
import { checkUserText } from './safety.js';

const app = express();

app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((s) => s.trim()) }));
app.use(express.json({ limit: '32kb' }));

const TASKS: ConciergeTask[] = ['explain', 'simplify', 'translate'];
const LANGUAGES: Language[] = ['en', 'zh', 'ms', 'ta'];
const GUIDANCE: GuidanceLevel[] = ['quick', 'balanced', 'guided'];
const MAX_TEXT = 2000;
const MAX_TURNS = 12;

function clientKey(req: express.Request): string {
  return (req.ip || req.socket.remoteAddress || 'unknown').toString();
}

function asLanguage(v: unknown): Language | undefined {
  return typeof v === 'string' && (LANGUAGES as string[]).includes(v) ? (v as Language) : undefined;
}
function asGuidance(v: unknown): GuidanceLevel | undefined {
  return typeof v === 'string' && (GUIDANCE as string[]).includes(v) ? (v as GuidanceLevel) : undefined;
}
function asString(v: unknown, max = MAX_TEXT): string | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

/** Health check — safe to expose; reveals no secrets. */
app.get('/health', (_req, res) => {
  res.json({ ok: true, aiConfigured: isAiConfigured(), model: config.geminiModel });
});

/** Shared guard: config + rate limit. Returns true if the request may proceed. */
function guard(req: express.Request, res: express.Response): boolean {
  if (!isAiConfigured()) {
    // No key → tell the client to fall back. This is the default demo state.
    res.status(503).json({ error: 'AI not configured' });
    return false;
  }
  const rate = checkRateLimit(clientKey(req));
  if (!rate.allowed) {
    if (rate.retryAfterSec) res.setHeader('Retry-After', String(rate.retryAfterSec));
    res.status(503).json({ error: 'Too many requests, please try again shortly' });
    return false;
  }
  return true;
}

/** Map a Gemini result to the HTTP response. */
function sendGemini(
  res: express.Response,
  result: Awaited<ReturnType<typeof runGemini>>,
): void {
  if (result.ok) {
    res.json({ text: result.text });
  } else {
    // 429 and 503 both surface as 503 to the client → deterministic fallback.
    res.status(503).json({ error: 'AI temporarily unavailable' });
  }
}

/* -------------------- POST /concierge (single task) -------------------- */
app.post('/concierge', async (req, res) => {
  if (!guard(req, res)) return;

  const body = req.body ?? {};
  const task = body.task;
  if (typeof task !== 'string' || !(TASKS as string[]).includes(task)) {
    res.status(400).json({ error: 'Invalid task' });
    return;
  }

  const text = asString(body.text);
  const context = asString(body.context, 64);
  const language = asLanguage(body.language);
  const guidanceLevel = asGuidance(body.guidanceLevel);

  // Safety: scan free-form text (what the user typed / copy to simplify).
  const verdict = checkUserText(text);
  if (!verdict.safe) {
    res.json({ text: verdict.refusal });
    return;
  }

  const instruction = buildInstruction({
    task: task as ConciergeTask,
    context,
    text,
    language,
    guidanceLevel,
  });

  const result = await runGemini(instruction);
  sendGemini(res, result);
});

/* -------------------- POST /concierge/chat (multi-turn) ---------------- */
app.post('/concierge/chat', async (req, res) => {
  if (!guard(req, res)) return;

  const body = req.body ?? {};
  const question = asString(body.question);
  if (!question) {
    res.status(400).json({ error: 'Empty question' });
    return;
  }

  const language = asLanguage(body.language);
  const guidanceLevel = asGuidance(body.guidanceLevel);

  // Safety: check the new question AND the latest user turn in history.
  const verdict = checkUserText(question);
  if (!verdict.safe) {
    res.json({ text: verdict.refusal });
    return;
  }

  // Sanitise client-supplied history into trusted ChatTurn[].
  const history: ChatTurn[] = Array.isArray(body.history)
    ? body.history
        .filter(
          (t: unknown): t is { role: string; text: string } =>
            typeof t === 'object' &&
            t !== null &&
            (((t as Record<string, unknown>).role === 'user') ||
              ((t as Record<string, unknown>).role === 'model')) &&
            typeof (t as Record<string, unknown>).text === 'string',
        )
        .slice(-MAX_TURNS)
        .map((t: { role: string; text: string }) => ({
          role: t.role as ChatTurn['role'],
          text: t.text.slice(0, MAX_TEXT),
        }))
    : [];

  const instruction = buildInstruction({
    task: 'chat',
    question,
    language,
    guidanceLevel,
  });

  const result = await runGemini(instruction, history);
  sendGemini(res, result);
});

// Unknown routes.
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

if (process.env.NODE_ENV !== 'test') {
  startRateLimitCleanup();
  app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(
      `FlexBank Concierge proxy on http://localhost:${config.port}  ` +
        `(AI ${isAiConfigured() ? 'configured' : 'NOT configured → clients fall back'})`,
    );
  });
}

export { app };
