import express from 'express';
import cors from 'cors';
import { tasksRouter } from './routes/tasks.js';
import { listRouter } from './routes/list.js';
import { identifyList } from './owner.js';
import { errorHandler, notFound } from './errors.js';

export { notFound } from './errors.js';

export function createApp(store) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10kb' }));

  const api = express.Router();
  // `storage` shows which backend is live (supabase, file or memory).
  api.get('/health', (_req, res) => {
    if (store.problem) return res.status(503).json({ status: 'error', storage: store.kind, problem: store.problem });
    res.json({ status: 'ok', storage: store.kind ?? 'unknown' });
  });
  // Everything except /health belongs to one private list.
  api.use(['/tasks', '/list'], identifyList);
  api.use(tasksRouter(store));
  api.use(listRouter(store));

  // Public URLs are /api/*. Some hosts (e.g. a proxy or Vercel rewrite)
  // may forward requests with the /api prefix removed, so accept both.
  app.use('/api', api);
  app.use(api);

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}
