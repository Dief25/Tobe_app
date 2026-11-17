import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import express from 'express';
import { createApp } from './app.js';
import { errorHandler, notFound } from './errors.js';
import { createStore } from './store.js';
import { createSupabaseStore } from './supabaseStore.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const onVercel = Boolean(process.env.VERCEL);

function createTaskStore() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (url && key) {
    console.log('Storage: Supabase');
    return createSupabaseStore({ url, key });
  }
  if (url || key) {
    throw new Error('Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY) to use Supabase.');
  }

  // No Supabase configured: fall back to a JSON file. Vercel's deployed code
  // is read-only, so there it goes in the temp directory — which is NOT
  // durable (tasks can vanish), hence the warning.
  const filePath =
    process.env.DATA_FILE ||
    (onVercel ? path.join(os.tmpdir(), 'tasks.json') : path.join(here, '..', 'data', 'tasks.json'));
  if (onVercel) console.warn('Storage: temporary file. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to save tasks permanently.');
  return createStore({ filePath });
}

const app = createApp(createTaskStore());

// Local production mode (`npm start`): serve the built React app from Express.
// On Vercel the client is its own service, so this folder isn't present.
const clientDist = path.join(here, '..', '..', 'client', 'dist');
if (!onVercel && existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// Anything else gets a JSON 404 naming the path Express received.
app.use(notFound);
app.use(errorHandler);

// Vercel runs the exported app itself; locally we start a server.
if (!onVercel) {
  const PORT = Number(process.env.PORT) || 4000;
  app.listen(PORT, () => {
    console.log(`Tobe API listening on http://localhost:${PORT}`);
  });
}

export default app;
