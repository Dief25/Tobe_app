import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import express from 'express';
import { createApp } from './app.js';
import { errorHandler, notFound } from './errors.js';
import { createStore } from './store.js';
import { createSupabaseStore } from './supabaseStore.js';
import { createUnconfiguredStore } from './unconfiguredStore.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const onVercel = Boolean(process.env.VERCEL);

function createTaskStore() {
  // NEXT_PUBLIC_SUPABASE_URL is what Vercel's Supabase integration sets.
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (url && key) {
    console.log('Storage: Supabase');
    return createSupabaseStore({ url, key });
  }

  const missing = [!url && 'SUPABASE_URL', !key && 'SUPABASE_SERVICE_ROLE_KEY'].filter(Boolean);

  // On Vercel, never fall back to a file silently: the deployed code is
  // read-only, and a temp file is per-instance and wiped on restart, so
  // tasks would vanish on refresh. Fail clearly instead (unless DATA_FILE
  // is set on purpose).
  if (onVercel && !process.env.DATA_FILE) {
    const problem =
      `The database isn't connected. In Vercel, add ${missing.join(' and ')} under ` +
      'Settings → Environment Variables, then redeploy.';
    console.error(`Storage: not configured. ${problem}`);
    return createUnconfiguredStore(problem);
  }
  if (url || key) {
    throw new Error(`Supabase is half configured: also set ${missing.join(' and ')}.`);
  }

  // Local development: a JSON file next to the server.
  return createStore({ filePath: process.env.DATA_FILE || path.join(here, '..', 'data', 'tasks.json') });
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
