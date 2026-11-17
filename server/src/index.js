import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import express from 'express';
import { createApp } from './app.js';
import { createStore } from './store.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 4000;
const DATA_FILE = process.env.DATA_FILE || path.join(here, '..', 'data', 'tasks.json');

const app = createApp(createStore({ filePath: DATA_FILE }));

// In production, serve the built React app from the same server.
const clientDist = path.join(here, '..', '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, () => {
  console.log(`Tobe API listening on http://localhost:${PORT}`);
});
