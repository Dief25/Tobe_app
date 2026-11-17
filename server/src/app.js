import express from 'express';
import cors from 'cors';
import { tasksRouter } from './routes/tasks.js';
import { errorHandler, notFound } from './errors.js';

export { notFound } from './errors.js';

export function createApp(store) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: '10kb' }));

  const api = express.Router();
  api.get('/health', (_req, res) => res.json({ status: 'ok' }));
  api.use(tasksRouter(store));

  // Public URLs are /api/*. Some hosts (e.g. a proxy or Vercel rewrite)
  // may forward requests with the /api prefix removed, so accept both.
  app.use('/api', api);
  app.use(api);

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}
