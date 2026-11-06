/**
 * OPTIONAL server-side AI proxy for FlexBank Concierge.
 *
 * Why this exists:
 * - INTEGRATION.md says "synthetic data only / no live APIs" for the core demo.
 * - It also asks Dev C to add a real AI provider behind the contract.
 * - Resolution: the Expo app stays offline by default. Live AI is opt-in and
 *   only talks to THIS server. The real API key lives here, never in the client
 *   and never in EXPO_PUBLIC_* variables.
 *
 * Setup (not required for the demo):
 *   1. Copy this file and implement the call to your chosen provider.
 *   2. Set CONCIERGE_AI_API_KEY in the server environment (never commit it).
 *   3. Run: node server/concierge-proxy.example.mjs
 *   4. Point the app at it:
 *        EXPO_PUBLIC_CONCIERGE_AI_URL=http://localhost:8787/concierge
 *
 * Request body: { task: 'explain'|'simplify'|'translate', context?, text?, language? }
 * Response body: { text: string }
 */

import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.CONCIERGE_AI_API_KEY; // server-only secret

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/concierge') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  let body = '';
  for await (const chunk of req) body += chunk;

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Invalid JSON' }));
    return;
  }

  // Without a real key, return 503 so the client uses its deterministic fallback.
  if (!API_KEY) {
    res.writeHead(503, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(JSON.stringify({ error: 'AI provider not configured on server' }));
    return;
  }

  // --- Replace this block with a real provider call (OpenAI, Azure, etc.) ---
  // Example shape only; do not commit keys or claim this was live-tested.
  const text =
    typeof payload?.text === 'string' && payload.text.trim().length > 0
      ? payload.text.trim()
      : 'No explanation available.';

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify({ text }));
});

server.listen(PORT, () => {
  console.log(`Concierge proxy listening on http://localhost:${PORT}/concierge`);
  console.log(API_KEY ? 'API key present (live path enabled).' : 'No API key — returns 503 so client falls back.');
});
