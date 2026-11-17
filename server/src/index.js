import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import express from 'express';
import { createApp } from './app.js';
import { createStore } from './store.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const onVercel = Boolean(process.env.VERCEL);

// Vercel's deployed code is read-only; only the temp directory is writable.
// NOTE: on Vercel this file is per-instance and temporary — tasks are not
// durable there until the store is backed by a real database.
const DATA_FILE =
  process.env.DATA_FILE ||
  (onVercel ? path.join(os.tmpdir(), 'tasks.json') : path.join(here, '..', 'data', 'tasks.json'));

const app = createApp(createStore({ filePath: DATA_FILE }));

// Local production mode (`npm start`): serve the built React app from Express.
// On Vercel the client is its own service, so this folder isn't present.
const clientDist = path.join(here, '..', '..', 'client', 'dist');
if (!onVercel && existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

// Vercel runs the exported app itself; locally we start a server.
if (!onVercel) {
  const PORT = Number(process.env.PORT) || 4000;
  app.listen(PORT, () => {
    console.log(`Tobe API listening on http://localhost:${PORT}`);
  });
}

export default app;
