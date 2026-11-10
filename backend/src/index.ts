/**
 * Starts the server. This file is only the thin Express layer: it turns each
 * web request into a plain request for src/api.ts and sends back its answer.
 */

import cors from 'cors';
import express, { type NextFunction, type Request, type Response } from 'express';

import { createApi } from './api';
import { loadConfig } from './config';
import { MemoryStore } from './store';

try {
  process.loadEnvFile(); // reads the ".env" file if there is one
} catch {
  // No .env file: real environment variables are used instead.
}

async function main(): Promise<void> {
  const config = loadConfig();
  const store = new MemoryStore();
  await store.init();
  const api = createApi({ store, config });

  const app = express();
  app.disable('x-powered-by');
  app.use(cors({ origin: config.corsOrigins.includes('*') ? true : config.corsOrigins }));
  app.use(express.json({ limit: '10kb' }));

  app.use('/api', async (req: Request, res: Response) => {
    const query: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string') {
        query[key] = value;
      }
    }
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    }
    const result = await api.handle({
      method: req.method,
      path: req.baseUrl + req.path,
      query,
      headers,
      body: req.body,
    });
    res.status(result.status).json(result.body);
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: { message: 'We could not find that.' } });
  });

  // Catches things like a request body that is not valid JSON.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[server] request error:', err instanceof Error ? err.message : err);
    res.status(400).json({ error: { message: 'We could not read that request.' } });
  });

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`FlexBank server running on http://localhost:${config.port}`);
    console.log('Demo logins use the password in README.md (synthetic data only).');
    console.log(`Demo controls: ${config.demoKey ? 'ON' : 'OFF'}`);
    for (const warning of config.warnings) {
      console.warn(`WARNING: ${warning}`);
    }
  });
}

main().catch((err: unknown) => {
  console.error('Could not start the server:', err instanceof Error ? err.message : err);
  process.exit(1);
});
